import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { requireAdmin, isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createExportManifest, recordExportHistory, sha256 } from "@/lib/export-hardening";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const disabled = await moduleDisabledResponse("export");
  if (disabled) return disabled;

  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      contentRaw: true,
      excerpt: true,
      status: true,
      isPinned: true,
      isFeatured: true,
      coverImage: true,
      infobox: true,
      redirectTo: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
    },
    orderBy: { title: "asc" },
  });

  const payload = articles.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    tags: a.tags.map((t) => t.tag),
  }));

  const body = JSON.stringify(payload, null, 2);
  const manifest = createExportManifest({
    files: [{ content: body, path: "articles.json" }],
    format: "json",
    omittedData: ["sessions", "apiKeys", "users"],
    scope: { statuses: "all", type: "articles" },
  });
  await recordExportHistory(manifest);
  await logAudit("export.create", { type: "export", label: "JSON article export" }, {
    checksum: sha256(JSON.stringify(manifest)),
    fileCount: manifest.fileCount,
    format: manifest.format,
    omittedData: manifest.omittedData,
    scope: manifest.scope,
  }, { severity: "high", request });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wiki-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "X-Arkivel-Export-Checksum": sha256(body),
      "X-Arkivel-Export-Manifest": JSON.stringify(manifest),
    },
  });
}
