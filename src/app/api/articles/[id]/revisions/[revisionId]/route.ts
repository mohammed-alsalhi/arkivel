import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { articleVisibilityFilter } from "@/lib/article-visibility";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const { id, revisionId } = await params;
  const canViewDrafts = await isAdmin();

  const revision = await prisma.articleRevision.findFirst({
    where: {
      id: revisionId,
      articleId: id,
      article: articleVisibilityFilter(canViewDrafts),
    },
  });

  if (!revision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(revision);
}

// POST = revert to this revision (admin only)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id, revisionId } = await params;

  const revision = await prisma.articleRevision.findUnique({
    where: { id: revisionId },
  });

  if (!revision) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  // Snapshot current state before reverting
  const current = await prisma.article.findUnique({
    where: { id },
    select: { title: true, content: true, contentRaw: true },
  });
  if (current) {
    await prisma.articleRevision.create({
      data: {
        articleId: id,
        title: current.title,
        content: current.content,
        contentRaw: current.contentRaw,
        editSummary: `Reverted to revision from ${revision.createdAt.toISOString()}`,
      },
    });
  }

  // Revert article to the revision's content
  const article = await prisma.article.update({
    where: { id },
    data: {
      title: revision.title,
      content: revision.content,
      contentRaw: revision.contentRaw,
    },
  });

  await logAudit("revision.revert", { type: "article", id, label: article.title }, { revisionId, revertedTo: revision.createdAt });
  return NextResponse.json(article);
}

export const dynamic = "force-dynamic";
