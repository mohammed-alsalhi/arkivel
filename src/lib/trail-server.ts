import { cache } from "react";
import prisma from "@/lib/prisma";
import { TRAIL_ROOTS, categoryCrumbs, type TrailItem } from "@/lib/trail";

type CategoryNode = { id: string; name: string; slug: string; parentId: string | null };

/** Walks a category's ancestors (unbounded) and returns root-first, ending with the category itself. */
export const categoryChain = cache(async (categoryId: string | null | undefined): Promise<CategoryNode[]> => {
  const chain: CategoryNode[] = [];
  let currentId = categoryId ?? null;
  const seen = new Set<string>();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const node = await prisma.category
      .findUnique({ where: { id: currentId }, select: { id: true, name: true, slug: true, parentId: true } })
      .catch(() => null);
    if (!node) break;
    chain.unshift(node);
    currentId = node.parentId;
  }
  return chain;
});

/** `spaces / parent / … / category` — the trail for anything that lives in a category. */
export async function categoryTrail(categoryId: string | null | undefined): Promise<TrailItem[]> {
  const chain = await categoryChain(categoryId);
  return [TRAIL_ROOTS.spaces, ...categoryCrumbs(chain)];
}

type ArticleSummary = {
  slug: string;
  title: string;
  updatedAt: string;
  categories: { name: string; slug: string }[];
};

/** The article facts every article-workflow route needs for its trail; shared across the route's layout and page. */
export const articleSummary = cache(async (slug: string): Promise<ArticleSummary | null> => {
  const article = await prisma.article
    .findUnique({ where: { slug }, select: { slug: true, title: true, updatedAt: true, categoryId: true } })
    .catch(() => null);
  if (!article) return null;
  const chain = await categoryChain(article.categoryId);
  return {
    slug: article.slug,
    title: article.title,
    updatedAt: article.updatedAt.toISOString(),
    categories: chain.map(({ name, slug: categorySlug }) => ({ name, slug: categorySlug })),
  };
});
