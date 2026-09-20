import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { isAdmin, requireAdmin } from "@/lib/auth";
import { isArticleStatus } from "@/lib/article-status";
import { articleVisibilityFilter } from "@/lib/article-visibility";

function positiveInteger(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), maximum) : fallback;
}

export async function GET(request: NextRequest) {
  const canViewDrafts = await isAdmin();
  const { searchParams } = request.nextUrl;
  const page = positiveInteger(searchParams.get("page"), 1, 10_000);
  const limit = positiveInteger(searchParams.get("limit"), 20, 100);
  const where = {
    ...articleVisibilityFilter(canViewDrafts),
    ...(searchParams.get("category") && { category: { slug: searchParams.get("category")! } }),
    ...(searchParams.get("tag") && { tags: { some: { tag: { slug: searchParams.get("tag")! } } } }),
    ...(canViewDrafts && searchParams.get("status") && { status: searchParams.get("status")! }),
    ...(searchParams.get("slug") && { slug: searchParams.get("slug")! }),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const baseSlug = generateSlug(title);
  if (!baseSlug) return NextResponse.json({ error: "Title must produce a valid slug" }, { status: 400 });

  const existing = await prisma.article.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
  const tagIds: string[] = Array.isArray(body.tagIds)
    ? body.tagIds.filter((tagId: unknown): tagId is string => typeof tagId === "string")
    : [];
  const status = typeof body.status === "string" ? body.status : "published";
  if (!isArticleStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      content,
      contentRaw: typeof body.contentRaw === "string" ? body.contentRaw : null,
      excerpt: typeof body.excerpt === "string"
        ? body.excerpt.trim() || null
        : content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
      categoryId: body.categoryId || null,
      status,
      published: status === "published",
      isPinned: Boolean(body.isPinned),
      tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  revalidatePath("/");
  revalidatePath("/articles");
  return NextResponse.json(article, { status: 201 });
}

export const dynamic = "force-dynamic";
