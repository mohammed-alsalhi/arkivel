import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { getSession, isAdmin, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isArticleStatus } from "@/lib/article-status";
import { canViewArticle } from "@/lib/article-visibility";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const canViewDrafts = await isAdmin();
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  return article && canViewArticle(article, canViewDrafts)
    ? NextResponse.json(article)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const current = await prisma.article.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const content = typeof body.content === "string" ? body.content : undefined;
  const contentRaw = typeof body.contentRaw === "string" ? body.contentRaw : body.contentRaw === null ? null : undefined;
  const editSummary = typeof body.editSummary === "string" ? body.editSummary.trim() : null;
  const tagIds: string[] | undefined = Array.isArray(body.tagIds)
    ? body.tagIds.filter((tagId: unknown): tagId is string => typeof tagId === "string")
    : undefined;
  const status = typeof body.status === "string" ? body.status : undefined;

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (status !== undefined && !isArticleStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let nextSlug = current.slug;
  if (typeof body.slug === "string") {
    nextSlug = generateSlug(body.slug);
    if (!nextSlug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    const conflict = await prisma.article.findFirst({
      where: { slug: nextSlug, NOT: { id } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ error: "An article with that slug already exists" }, { status: 409 });
    }
  }

  const session = await getSession();
  const article = await prisma.$transaction(async (transaction) => {
    await transaction.articleRevision.create({
      data: {
        articleId: id,
        title: current.title,
        content: current.content,
        contentRaw: current.contentRaw,
        infobox: current.infobox || undefined,
        editSummary: editSummary || null,
        userId: session?.id || null,
      },
    });

    if (tagIds !== undefined) {
      await transaction.articleTag.deleteMany({ where: { articleId: id } });
    }

    const updated = await transaction.article.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(nextSlug !== current.slug && { slug: nextSlug }),
        ...(content !== undefined && { content }),
        ...(contentRaw !== undefined && { contentRaw }),
        ...(typeof body.excerpt === "string" && { excerpt: body.excerpt.trim() || null }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.redirectTo !== undefined && { redirectTo: body.redirectTo || null }),
        ...(status !== undefined && { status, published: status === "published" }),
        ...(typeof body.isPinned === "boolean" && { isPinned: body.isPinned }),
        ...(tagIds !== undefined && {
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    if (nextSlug !== current.slug) {
      await transaction.redirect.upsert({
        where: { fromSlug: current.slug },
        create: { fromSlug: current.slug, toSlug: nextSlug },
        update: { toSlug: nextSlug },
      });
    }

    return updated;
  });

  revalidatePath(`/articles/${current.slug}`);
  revalidatePath(`/articles/${article.slug}`);
  revalidatePath("/");
  if (article.category?.slug) revalidatePath(`/categories/${article.category.slug}`);

  return NextResponse.json(article);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(await isAdmin());
  if (denied) return denied;

  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: { slug: true, title: true },
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.article.delete({ where: { id } });
  await logAudit("article.delete", { type: "article", id, label: article.title });
  revalidatePath(`/articles/${article.slug}`);
  revalidatePath("/");
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
