import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;

  const revision = await prisma.articleRevision.findUnique({
    where: { id: revisionId },
    select: { articleId: true, title: true, content: true, contentRaw: true, infobox: true },
  });

  if (!revision || revision.articleId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Snapshot current state before restoring
  const current = await prisma.article.findUnique({
    where: { id },
    select: { title: true, content: true, contentRaw: true, infobox: true },
  });

  if (!current) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  // Save current as a revision snapshot
  await prisma.articleRevision.create({
    data: {
      articleId: id,
      title: current.title,
      content: current.content,
      contentRaw: current.contentRaw,
      infobox: current.infobox as Prisma.InputJsonValue ?? undefined,
      editSummary: `Before restore to revision ${revisionId}`,
    },
  });

  // Apply the old revision's content
  await prisma.article.update({
    where: { id },
    data: {
      content: revision.content,
      contentRaw: revision.contentRaw,
      infobox: revision.infobox as Prisma.InputJsonValue ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
