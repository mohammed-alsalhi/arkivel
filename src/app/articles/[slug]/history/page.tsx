import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import AdminEditTab from "@/components/AdminEditTab";
import RevisionSummaryButton from "@/components/RevisionSummaryButton";
import RestoreRevisionButton from "@/components/RestoreRevisionButton";
import { DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function HistoryPage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      revisions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          editSummary: true,
          createdAt: true,
        },
      },
    },
  });

  if (!article) notFound();

  return (
    <div>
      <nav className="article-tabbar" aria-label="Article sections">
        <Link href={`/articles/${slug}`} className="article-tab">
          Article
        </Link>
        <AdminEditTab slug={slug} className="article-tab" />
        <span className="article-tab article-tab-active">History</span>
        <Link href={`/articles/${slug}/discussion`} className="article-tab">
          Discussion
        </Link>
      </nav>

      <Page className="border border-border bg-surface px-5 py-4">
        <PageHeader title={<>Revision history of &ldquo;{article.title}&rdquo;</>} />

        {article.revisions.length === 0 ? (
          <EmptyState description="No previous revisions. This article has not been edited since creation." />
        ) : (
          <DiffForm slug={slug} articleId={article.id} revisions={article.revisions} />
        )}
      </Page>
    </div>
  );
}

function DiffForm({
  slug,
  articleId,
  revisions,
}: {
  slug: string;
  articleId: string;
  revisions: { id: string; title: string; editSummary: string | null; createdAt: Date }[];
}) {
  return (
    <form action={`/articles/${slug}/diff`} method="get">
      <div className="flex gap-2 mb-3">
        <button type="submit" className="ui-button ui-button-primary">
          Compare selected revisions
        </button>
      </div>

      <DataTable className="text-[13px]">
        <thead>
          <tr>
            <th className="w-8">Old</th>
            <th className="w-8">New</th>
            <th>Date</th>
            <th>Summary</th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {/* Current version row */}
          <tr className="bg-accent-soft">
            <td>
              <input type="radio" name="from" value="current" />
            </td>
            <td>
              <input type="radio" name="to" value="current" defaultChecked />
            </td>
            <td className="text-muted">Current version</td>
            <td className="italic text-muted">Latest</td>
            <td>
              <Link href={`/articles/${slug}`} className="text-wiki-link text-[12px]">
                view
              </Link>
            </td>
          </tr>

          {revisions.map((rev, i) => (
            <tr key={rev.id}>
              <td>
                <input
                  type="radio"
                  name="from"
                  value={rev.id}
                  defaultChecked={i === 0}
                />
              </td>
              <td>
                <input type="radio" name="to" value={rev.id} />
              </td>
              <td className="text-muted">
                {formatDate(rev.createdAt)}
              </td>
              <td>
                {rev.editSummary ? (
                  <span className="italic">{rev.editSummary}</span>
                ) : (
                  <span className="text-muted italic">No summary</span>
                )}
              </td>
              <td>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <Link
                      href={`/articles/${slug}/diff?from=${rev.id}&to=current`}
                      className="text-wiki-link text-[12px]"
                    >
                      view
                    </Link>
                    <RestoreRevisionButton articleId={articleId} revisionId={rev.id} />
                  </div>
                  <RevisionSummaryButton
                    articleId={articleId}
                    revisionId={rev.id}
                    compareToId={revisions[i + 1]?.id}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </form>
  );
}

export const dynamic = "force-dynamic";
