import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET — download all revisions as CSV
export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [article, revisions] = await Promise.all([
    prisma.article.findUnique({ where: { id }, select: { title: true, slug: true } }),
    prisma.articleRevision.findMany({
      where: { articleId: id },
      select: {
        id: true,
        title: true,
        editSummary: true,
        createdAt: true,
        user: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const escape = (s: string | null | undefined) =>
    `"${(s ?? "").replace(/"/g, '""')}"`;

  const rows = [
    ["Revision ID", "Date", "Author", "Edit Summary"],
    ...revisions.map((r) => [
      r.id,
      r.createdAt.toISOString(),
      r.user ? (r.user.displayName || r.user.username) : "Anonymous",
      r.editSummary ?? "",
    ]),
  ]
    .map((cols) => cols.map(escape).join(","))
    .join("\r\n");

  const filename = `${article.slug}-revisions.csv`;
  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
