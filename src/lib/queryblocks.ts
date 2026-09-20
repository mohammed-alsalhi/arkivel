import prisma from "./prisma";

/**
 * Simple query DSL for embedding live article lists in wiki content.
 *
 * Syntax (HTML comment): <!-- query: FROM #tag WHERE status=published SORT updatedAt LIMIT 10 AS LIST -->
 * Or in editor as <div data-query-block="..."></div>
 *
 * Supported clauses:
 *   FROM #tag         — articles with this tag
 *   FROM @category    — articles in this category
 *   FROM *            — all published articles
 *   SORT field        — sort by title|createdAt|updatedAt|wordCount (desc by default)
 *   SORT field ASC    — ascending
 *   LIMIT N           — max results (default 10, max 50)
 *   AS TABLE|LIST     — output format (default LIST)
 */

type QueryResult = { id: string; title: string; slug: string; updatedAt: Date; createdAt: Date; excerpt?: string | null };

export async function executeQueryBlock(query: string): Promise<string> {
  // Parse FROM clause
  const fromMatch = query.match(/FROM\s+([^\s]+)/i);
  const fromClause = fromMatch ? fromMatch[1] : "*";

  // Parse SORT clause
  const sortMatch = query.match(/SORT\s+(\w+)(?:\s+(ASC|DESC))?/i);
  const sortField = sortMatch ? sortMatch[1].toLowerCase() : "updatedAt";
  const sortDir = sortMatch?.[2]?.toLowerCase() === "asc" ? "asc" : "desc";

  // Parse LIMIT clause
  const limitMatch = query.match(/LIMIT\s+(\d+)/i);
  const limit = Math.min(50, parseInt(limitMatch?.[1] ?? "10"));

  // Parse AS clause
  const asMatch = query.match(/AS\s+(TABLE|LIST)/i);
  const format = asMatch ? asMatch[1].toUpperCase() : "LIST";

  // Build Prisma query
  let where: Record<string, unknown> = { published: true, status: "published" };

  if (fromClause.startsWith("#")) {
    const tagName = fromClause.slice(1);
    where = { ...where, tags: { some: { tag: { name: { equals: tagName, mode: "insensitive" } } } } };
  } else if (fromClause.startsWith("@")) {
    const catSlug = fromClause.slice(1);
    where = { ...where, category: { slug: { equals: catSlug, mode: "insensitive" } } };
  }

  const orderBy: Record<string, string> = {};
  const validSortFields: Record<string, string> = {
    title: "title",
    createdat: "createdAt",
    updatedat: "updatedAt",
  };
  const prismaField = validSortFields[sortField] ?? "updatedAt";
  orderBy[prismaField] = sortDir;

  const articles = await prisma.article.findMany({
    where,
    orderBy,
    take: limit,
    select: { id: true, title: true, slug: true, updatedAt: true, createdAt: true, excerpt: true },
  });

  if (articles.length === 0) {
    return `<div class="query-block-empty text-sm text-muted italic py-2">No articles found for query: <code>${query}</code></div>`;
  }

  if (format === "TABLE") {
    const rows = articles.map((a: QueryResult) =>
      `<tr><td><a href="/articles/${a.slug}">${a.title}</a></td><td>${a.updatedAt.toLocaleDateString()}</td></tr>`
    ).join("");
    return `<div class="query-block"><table class="query-block-table w-full text-sm border-collapse"><thead><tr><th class="text-left border-b border-border pb-1">Article</th><th class="text-left border-b border-border pb-1">Updated</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const items = articles.map((a: QueryResult) =>
    `<li><a href="/articles/${a.slug}">${a.title}</a></li>`
  ).join("");
  return `<div class="query-block"><ul class="query-block-list list-disc pl-5 space-y-0.5 text-sm">${items}</ul></div>`;
}

/**
 * Find all query blocks in article HTML and replace them with live results.
 * Query blocks are stored as: <div data-query-block="query string"></div>
 */
export async function resolveQueryBlocks(html: string): Promise<string> {
  const regex = /<div[^>]*data-query-block="([^"]*)"[^>]*>.*?<\/div>/gi;
  const matches = [...html.matchAll(regex)];
  if (matches.length === 0) return html;

  let resolved = html;
  for (const m of matches) {
    const query = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const result = await executeQueryBlock(query);
    resolved = resolved.replace(m[0], result);
  }
  return resolved;
}
