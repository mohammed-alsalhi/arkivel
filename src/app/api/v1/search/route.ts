import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { apiV1Headers, createApiV1Error, parseApiV1Integer } from "@/lib/public-api-v1";

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const limit = parseApiV1Integer(request.nextUrl.searchParams.get("limit"), 20, 100);
  if (limit === null) {
    const error = createApiV1Error("limit must be a positive integer no greater than 100.", 400, "invalid_limit");
    return NextResponse.json(error.body, { status: error.status, headers: error.headers });
  }

  if (!query || query.length < 2) {
    return NextResponse.json({
      results: [],
      query: query || "",
    }, { headers: apiV1Headers });
  }

  const words = query.split(/\s+/).filter((w) => w.length >= 2);

  const where =
    words.length > 1
      ? {
          published: true,
          status: "published",
          AND: [
            ...words.map((word) => ({
              OR: [
                { title: { contains: word, mode: "insensitive" as const } },
                { content: { contains: word, mode: "insensitive" as const } },
                { excerpt: { contains: word, mode: "insensitive" as const } },
              ],
            })),
          ],
        }
      : {
          published: true,
          status: "published",
          AND: [
            {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { content: { contains: query, mode: "insensitive" as const } },
                { excerpt: { contains: query, mode: "insensitive" as const } },
              ],
            },
          ],
        };

  const articles = await prisma.article.findMany({
    where,
    take: limit * 3,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      category: { select: { name: true, slug: true } },
      updatedAt: true,
    },
  });

  const queryLower = query.toLowerCase();
  articles.sort((a, b) => {
    return relevanceScore(b.title, queryLower) - relevanceScore(a.title, queryLower);
  });

  const results = articles.slice(0, limit).map((a) => ({
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category ? { name: a.category.name, slug: a.category.slug } : null,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return NextResponse.json({ results, query }, { headers: apiV1Headers });
}

function relevanceScore(title: string, query: string): number {
  const t = title.toLowerCase();
  if (t === query) return 100;
  if (t.startsWith(query)) return 80;
  if (t.includes(query)) return 60;
  return 0;
}

export const dynamic = "force-dynamic";
