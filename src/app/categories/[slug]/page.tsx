import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { categoryTrail } from "@/lib/trail-server";
import { formatDate, plural } from "@/lib/utils";
import { DataTable, EmptyState, LinkButton, Page, PageHeader, Section } from "@/components/ui";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { articles: { where: { published: true, status: "published" } } },
          },
        },
      },
    },
  });

  if (!category) notFound();

  const [articles, trail] = await Promise.all([
    prisma.article.findMany({
      where: { categoryId: category.id, published: true, status: "published" },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    }),
    categoryTrail(category.parentId),
  ]);
  trail.push({ label: category.name });

  const articleCountText = `${plural(articles.length, "page", "pages")} in this space`;

  return (
    <Page trail={trail}>
      {/* Cover image banner */}
      {category.coverImage && (
        <div className="w-full h-36 mb-4 overflow-hidden rounded-sm border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.coverImage}
            alt={`${category.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <PageHeader
        kicker="space"
        title={category.name}
        description={
          category.description ? (
            <>
              {category.description}
              <br />
              <span>{articleCountText}</span>
            </>
          ) : (
            articleCountText
          )
        }
      />

      {/* Subcategories */}
      {category.children.length > 0 && (
        <Section title="subspaces">
          <ul className="list-disc pl-5 space-y-0.5">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link href={`/categories/${child.slug}`}>
                  {child.name}
                </Link>
                {child._count.articles > 0 && (
                  <span className="text-[11px] text-muted ml-1">
                    ({plural(child._count.articles, "page", "pages")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {articles.length === 0 ? (
        <EmptyState
          title="no pages yet"
          description="this space is ready for its first page."
          actions={<LinkButton href="/articles/new" variant="primary">create one</LinkButton>}
        />
      ) : (
        <Section title="pages in this space">
          <DataTable>
            <thead>
              <tr>
                <th>page</th>
                <th className="w-28">last edited</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    {article.isPinned && (
                      <strong className="mr-1 text-[10px] uppercase text-muted">pinned</strong>
                    )}
                    <Link href={`/articles/${article.slug}`} className="font-medium">
                      {article.title}
                    </Link>
                    {article.excerpt && (
                      <span className="text-muted text-[12px]">
                        {" "}&ndash; {article.excerpt.substring(0, 100)}{article.excerpt.length > 100 ? "…" : ""}
                      </span>
                    )}
                  </td>
                  <td className="text-muted text-[12px]">
                    {formatDate(article.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
