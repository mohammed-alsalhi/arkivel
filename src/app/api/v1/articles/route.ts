import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import prisma from "@/lib/prisma";
import { apiV1Headers, createApiV1Error, parseApiV1Integer } from "@/lib/public-api-v1";

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  const { searchParams } = request.nextUrl;
  const page = parseApiV1Integer(searchParams.get("page"), 1, 10_000);
  const limit = parseApiV1Integer(searchParams.get("limit"), 20, 100);
  if (page === null || limit === null) {
    const error = createApiV1Error("page and limit must be positive integers within range.", 400, "invalid_pagination");
    return NextResponse.json(error.body, { status: error.status, headers: error.headers });
  }
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const where: Record<string, unknown> = {
    published: true,
    status: "published",
  };
  if (category) {
    where.category = { slug: category };
  }
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        contentRaw: true,
        published: true,
        status: true,
        coverImage: true,
        infobox: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { tag: { select: { name: true, slug: true } } } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  const formatted = articles.map((a) => ({
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    content: a.content,
    contentRaw: a.contentRaw,
    published: a.published,
    status: a.status,
    coverImage: a.coverImage,
    infobox: a.infobox,
    category: a.category ? { name: a.category.name, slug: a.category.slug } : null,
    tags: a.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    articles: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
