import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { canViewArticle } from "@/lib/article-visibility";

export const dynamic = "force-dynamic";

type Paragraph = {
  text: string;
  revisionId: string;
  editedAt: string;
  editor: string | null;
  editSummary: string | null;
};

/**
 * GET /api/articles/[id]/blame
 * Returns a per-paragraph blame annotation: for each non-empty paragraph in
 * the current article content, finds the earliest revision that introduced it.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canViewDrafts = await isAdmin();

  const article = await prisma.article.findUnique({
    where: { id },
    select: { content: true, published: true, status: true },
  });
  if (!article || !canViewArticle(article, canViewDrafts)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Extract paragraphs from current content
  const paragraphs = extractParagraphs(article.content);

  // Load all revisions newest-first
  const revisions = await prisma.articleRevision.findMany({
    where: { articleId: id },
    orderBy: { createdAt: "asc" }, // oldest first for blame (first introduction)
    select: {
      id: true,
      content: true,
      editSummary: true,
      createdAt: true,
      user: { select: { username: true, displayName: true } },
    },
    take: 200, // cap for performance
  });

  // For each paragraph, find the earliest revision that contained it
  const result: Paragraph[] = paragraphs.map((text) => {
    const normalised = normaliseText(text);
    const earliest = revisions.find((r) => normaliseText(r.content).includes(normalised));
    return {
      text,
      revisionId: earliest?.id ?? "current",
      editedAt: earliest?.createdAt.toISOString() ?? new Date().toISOString(),
      editor: earliest?.user?.displayName || earliest?.user?.username || null,
      editSummary: earliest?.editSummary ?? null,
    };
  });

  return NextResponse.json(result);
}

function extractParagraphs(html: string): string[] {
  // Extract text from block-level tags as proxy for paragraphs
  const matches = [...html.matchAll(/<(p|h[1-6]|li)[^>]*>([\s\S]*?)<\/\1>/gi)];
  return matches
    .map((m) => m[2].replace(/<[^>]+>/g, "").trim())
    .filter((t) => t.length > 20); // skip very short spans
}

function normaliseText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
