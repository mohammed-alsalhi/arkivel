import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import JSZip from "jszip";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { config } from "@/lib/config";
import { createExportManifest, recordExportHistory, sha256 } from "@/lib/export-hardening";

export const dynamic = "force-dynamic";

/** Strip HTML tags and decode basic entities for a plain-text summary */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a Markdown file from an article record */
function articleToMarkdown(article: {
  title: string;
  slug: string;
  excerpt: string | null;
  contentRaw: string | null;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string; slug: string } | null;
  tags: { tag: { name: string } }[];
}): string {
  const lines: string[] = [];

  // YAML front-matter
  lines.push("---");
  lines.push(`title: "${article.title.replace(/"/g, '\\"')}"`);
  lines.push(`slug: "${article.slug}"`);
  lines.push(`status: ${article.status}`);
  if (article.category) lines.push(`category: "${article.category.name}"`);
  if (article.tags.length > 0) {
    const tagList = article.tags.map((t) => `"${t.tag.name}"`).join(", ");
    lines.push(`tags: [${tagList}]`);
  }
  if (article.excerpt) lines.push(`excerpt: "${article.excerpt.replace(/"/g, '\\"')}"`);
  lines.push(`created: ${article.createdAt.toISOString().slice(0, 10)}`);
  lines.push(`updated: ${article.updatedAt.toISOString().slice(0, 10)}`);
  lines.push("---");
  lines.push("");

  // Content: prefer raw Markdown, fall back to stripped HTML
  if (article.contentRaw && article.contentRaw.trim()) {
    lines.push(article.contentRaw.trim());
  } else {
    lines.push(stripHtml(article.content));
  }

  lines.push("");
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("export");
  if (disabled) return disabled;

  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const categorySlug = searchParams.get("category") || null;
  const status = searchParams.get("status") || null; // null = all statuses

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (categorySlug) where.category = { slug: categorySlug };

  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ category: { slug: "asc" } }, { title: "asc" }],
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  const zip = new JSZip();

  // Add README
  zip.file(
    "README.md",
    [
      `# ${config.name} — Bulk Export`,
      "",
      `Exported ${articles.length} article(s) on ${new Date().toISOString().slice(0, 10)}.`,
      categorySlug ? `Category: ${categorySlug}` : "All categories.",
      "",
      "Each article is a separate Markdown file with YAML front-matter.",
    ].join("\n")
  );

  // Group articles by category slug
  const byCategory = new Map<string, typeof articles>();
  for (const article of articles) {
    const key = article.category?.slug ?? "_uncategorized";
    const existing = byCategory.get(key) ?? [];
    existing.push(article);
    byCategory.set(key, existing);
  }

  // Add one file per article inside a category folder
  for (const [catSlug, catArticles] of byCategory) {
    for (const article of catArticles) {
      const filename = `${catSlug}/${article.slug}.md`;
      zip.file(filename, articleToMarkdown(article));
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  const safeName = (categorySlug ?? config.name).replace(/[^a-z0-9-]/gi, "_").toLowerCase();
  const filename = `${safeName}-export-${new Date().toISOString().slice(0, 10)}.zip`;
  const manifest = createExportManifest({
    files: [{ content: zipBuffer, path: filename }],
    format: "zip",
    omittedData: ["sessions", "apiKeys", "users"],
    scope: { category: categorySlug, status: status ?? "all", type: "articles" },
  });
  await recordExportHistory(manifest);
  await logAudit("export.create", { type: "export", label: "ZIP article export" }, {
    checksum: sha256(JSON.stringify(manifest)),
    fileCount: manifest.fileCount,
    format: manifest.format,
    omittedData: manifest.omittedData,
    scope: manifest.scope,
  }, { severity: "high", request });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Arkivel-Export-Checksum": sha256(zipBuffer),
      "X-Arkivel-Export-Manifest": JSON.stringify(manifest),
    },
  });
}
