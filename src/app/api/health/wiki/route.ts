import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") || undefined;

  const where = categoryId ? { categoryId } : {};

  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      categoryId: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      tags: { select: { tag: { select: { name: true } } } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  const now = new Date();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

  const issues: Record<string, string[]> = {};

  function addIssue(slug: string, issue: string) {
    if (!issues[slug]) issues[slug] = [];
    issues[slug].push(issue);
  }

  let stubs = 0;
  let outdated = 0;
  let noExcerpt = 0;
  let noCategory = 0;
  let noTags = 0;
  let longArticles = 0;
  let brokenLinks = 0;

  // Collect all slugs for broken-link detection
  const allSlugs = new Set(articles.map((a) => a.slug));

  for (const article of articles) {
    const wordCount = article.content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const ageMs = now.getTime() - new Date(article.updatedAt).getTime();

    // Stub: < 100 words
    if (wordCount < 100) {
      stubs++;
      addIssue(article.slug, `Stub (${wordCount} words)`);
    }

    // Long: > 5000 words
    if (wordCount > 5000) {
      longArticles++;
      addIssue(article.slug, `Very long (${wordCount} words) — consider splitting`);
    }

    // Outdated: not updated in a year
    if (ageMs > ONE_YEAR_MS) {
      outdated++;
      addIssue(article.slug, `Not updated in ${Math.floor(ageMs / ONE_YEAR_MS)} year(s)`);
    } else if (ageMs > SIX_MONTHS_MS) {
      addIssue(article.slug, "Not updated in 6+ months");
    }

    // Missing excerpt
    if (!article.excerpt || article.excerpt.trim().length < 10) {
      noExcerpt++;
      addIssue(article.slug, "Missing excerpt");
    }

    // Missing category
    if (!article.categoryId) {
      noCategory++;
      addIssue(article.slug, "No category");
    }

    // Missing tags
    if (article.tags.length === 0) {
      noTags++;
      addIssue(article.slug, "No tags");
    }

    // Broken wiki links: [[Article Name]] pointing to non-existent slug
    const wikiLinkMatches = article.content.matchAll(/data-wiki-link="([^"]+)"/g);
    let articleBrokenLinks = 0;
    for (const match of wikiLinkMatches) {
      const linkedSlug = match[1];
      if (!allSlugs.has(linkedSlug)) {
        articleBrokenLinks++;
      }
    }
    if (articleBrokenLinks > 0) {
      brokenLinks += articleBrokenLinks;
      addIssue(article.slug, `${articleBrokenLinks} broken wiki link(s)`);
    }
  }

  const total = articles.length;
  if (total === 0) {
    return NextResponse.json({
      total: 0,
      healthScore: 100,
      stubs: 0,
      outdated: 0,
      noExcerpt: 0,
      noCategory: 0,
      noTags: 0,
      longArticles: 0,
      brokenLinks: 0,
      articleIssues: [],
    });
  }

  // Health score: start at 100, deduct per problem
  const deductions =
    (stubs / total) * 25 +
    (outdated / total) * 20 +
    (noExcerpt / total) * 15 +
    (noCategory / total) * 15 +
    (noTags / total) * 10 +
    (longArticles / total) * 5 +
    Math.min(brokenLinks, total) / total * 10;

  const healthScore = Math.max(0, Math.round(100 - deductions));

  // Build article-level issue list sorted by issue count desc
  const articleIssues = articles
    .filter((a) => issues[a.slug]?.length > 0)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      category: a.category?.name ?? null,
      status: a.status,
      updatedAt: a.updatedAt.toISOString(),
      issues: issues[a.slug],
    }))
    .sort((a, b) => b.issues.length - a.issues.length);

  return NextResponse.json({
    total,
    healthScore,
    stubs,
    outdated,
    noExcerpt,
    noCategory,
    noTags,
    longArticles,
    brokenLinks,
    articleIssues,
  });
}
