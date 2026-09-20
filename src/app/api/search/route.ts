import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function score(title: string, body: string, query: string, words: string[]): number {
  const normalizedTitle = title.toLowerCase();
  const normalizedBody = body.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 80;
  if (normalizedTitle.includes(normalizedQuery)) return 60;

  return words.reduce(
    (total, word) => total + (normalizedTitle.includes(word) ? 10 : 0) + (normalizedBody.includes(word) ? 1 : 0),
    0,
  );
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length >= 2);
  const articles = await prisma.article.findMany({
    where: {
      published: true,
      status: "published",
      AND: words.map((word) => ({
        OR: [
          { title: { contains: word, mode: "insensitive" } },
          { excerpt: { contains: word, mode: "insensitive" } },
          { content: { contains: word, mode: "insensitive" } },
        ],
      })),
    },
    take: limit * 3,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  const results = articles
    .map((article) => {
      const body = stripHtml(article.content);
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        highlightedExcerpt: article.excerpt || body.slice(0, 240),
        updatedAt: article.updatedAt,
        category: article.category,
        tags: article.tags,
        score: score(article.title, `${article.excerpt ?? ""} ${body}`, query, words),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return NextResponse.json({ results });
}
