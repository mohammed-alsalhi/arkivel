import type { Prisma } from "@prisma/client";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ARTICLE_STATUSES, type ArticleStatus } from "@/lib/article-status";
import { articleVisibilityFilter } from "@/lib/article-visibility";
import { isAdmin } from "@/lib/auth";
import { TRAIL_ROOTS } from "@/lib/trail";
import { formatDate, plural } from "@/lib/utils";
import {
  Button,
  DataTable,
  EmptyState,
  LinkButton,
  Page,
  PageHeader,
  SectionPanel,
  Select,
} from "@/components/ui";

const PAGE_SIZE = 20;
type ArticlesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePage(value: string): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

function parseStatus(value: string): ArticleStatus | "" {
  return ARTICLE_STATUSES.includes(value as ArticleStatus) ? (value as ArticleStatus) : "";
}

function articlesHref({
  category,
  page,
  status,
  tag,
}: {
  category?: string;
  page?: number;
  status?: string;
  tag?: string;
}): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", page.toString());

  const query = params.toString();
  return query ? `/articles?${query}` : "/articles";
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const category = firstValue(params.category);
  const tag = firstValue(params.tag);
  const status = parseStatus(firstValue(params.status));
  const page = parsePage(firstValue(params.page));
  const canViewDrafts = await isAdmin();

  const where: Prisma.ArticleWhereInput = {
    ...articleVisibilityFilter(canViewDrafts),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(canViewDrafts && status ? { status } : {}),
  };

  const [articles, total, categories, tags] = await Promise.all([
    prisma.article.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        updatedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.article.count({ where }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filterHref = (targetPage: number) =>
    articlesHref({ category, page: targetPage, status, tag });

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "all pages" }]}>
      <PageHeader
        kicker="library"
        title="all pages"
        description={`${plural(total, "page", "pages")}${
          category || tag || status ? " matching these filters" : " in the index"
        }.`}
        actions={canViewDrafts ? (
          <>
            <LinkButton href="/articles/new" variant="primary">
              new page
            </LinkButton>
            <LinkButton href="/recent-changes">recent changes</LinkButton>
          </>
        ) : undefined}
      />

      <SectionPanel title="filters">
        <form
          action="/articles"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)_auto]"
          method="get"
        >
          {canViewDrafts ? <label className="grid gap-1 text-[12px] text-muted">
            <span>space</span>
            <Select defaultValue={category} name="category">
              <option value="">all spaces</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label> : null}

          <label className="grid gap-1 text-[12px] text-muted">
            <span>tag</span>
            <Select defaultValue={tag} name="tag">
              <option value="">all tags</option>
              {tags.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1 text-[12px] text-muted">
            <span>status</span>
            <Select defaultValue={status} name="status">
              <option value="">all statuses</option>
              {ARTICLE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit">
              filter
            </Button>
            <LinkButton href="/articles">clear</LinkButton>
          </div>
        </form>
      </SectionPanel>

      {articles.length === 0 ? (
        <EmptyState
          actions={canViewDrafts ? <LinkButton href="/articles/new">new page</LinkButton> : undefined}
          description="adjust the filters or create the first matching page."
          title="no pages found"
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>page</th>
              <th className="w-36">space</th>
              <th className="w-48">tags</th>
              <th className="w-24">status</th>
              <th className="w-36">updated</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <Link className="font-medium" href={`/articles/${article.slug}`}>
                    {article.title}
                  </Link>
                  {article.excerpt ? (
                    <p className="mt-1 text-[12px] text-muted">
                      {article.excerpt.slice(0, 140)}
                      {article.excerpt.length > 140 ? "…" : ""}
                    </p>
                  ) : null}
                </td>
                <td>
                  {article.category ? (
                    <Link
                      href={articlesHref({ category: article.category.slug })}
                      className="text-muted"
                    >
                      {article.category.name}
                    </Link>
                  ) : (
                    <span className="text-muted">none</span>
                  )}
                </td>
                <td>
                  {article.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {article.tags.map(({ tag: articleTag }) => (
                        <Link
                          key={articleTag.id}
                          className="ui-chip hover:no-underline"
                          href={articlesHref({ tag: articleTag.slug })}
                        >
                          {articleTag.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">none</span>
                  )}
                </td>
                <td>
                  <Link
                    className="ui-chip hover:no-underline"
                    href={articlesHref({ status: article.status })}
                  >
                    {article.status.toLowerCase()}
                  </Link>
                </td>
                <td className="text-[12px] text-muted">{formatDate(article.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="page navigation"
          className="mt-4 flex items-center justify-between gap-3 text-[13px]"
        >
          <div>
            {page > 1 ? (
              <Link className="font-medium" href={filterHref(page - 1)} rel="prev">
                previous
              </Link>
            ) : null}
          </div>
          <span className="text-muted">
            page {page.toLocaleString()} of {totalPages.toLocaleString()}
          </span>
          <div>
            {page < totalPages ? (
              <Link className="font-medium" href={filterHref(page + 1)} rel="next">
                next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </Page>
  );
}

export const dynamic = "force-dynamic";
