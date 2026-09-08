import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { TRAIL_ROOTS } from "@/lib/trail";
import { formatDate, plural } from "@/lib/utils";
import { DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TagPage({ params }: Props) {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
  });

  if (!tag) notFound();

  const articles = await prisma.article.findMany({
    where: {
      published: true,
      status: "published",
      tags: { some: { tagId: tag.id } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });

  return (
    <Page trail={[TRAIL_ROOTS.library, TRAIL_ROOTS.tags, { label: tag.name }]}>
      <PageHeader
        kicker="tag"
        title={tag.name}
        description={
          <>
            {plural(articles.length, "page", "pages")} tagged with &ldquo;{tag.name}&rdquo;
          </>
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          description={
            <>no pages have been tagged with &ldquo;{tag.name}&rdquo; yet.</>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>page</th>
              <th className="w-32">space</th>
              <th className="w-28">last edited</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <Link href={`/articles/${article.slug}`} className="font-medium">
                    {article.title}
                  </Link>
                </td>
                <td className="text-muted">
                  {article.category ? (
                    <Link href={`/categories/${article.category.slug}`}>
                      {article.category.name}
                    </Link>
                  ) : (
                    <span className="italic">none</span>
                  )}
                </td>
                <td className="text-muted text-[12px]">
                  {formatDate(article.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
