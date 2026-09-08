import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ArticleWorkflowShell } from "@/components/ArticleWorkflowShell";
import RestoreRevisionButton from "@/components/RestoreRevisionButton";
import { EmptyState } from "@/components/ui";
import { canViewArticle } from "@/lib/article-visibility";
import { isAdmin } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function HistoryPage({ params }: Props) {
  const { slug } = await params;

  const [article, canViewDrafts] = await Promise.all([
    prisma.article.findUnique({
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
    }),
    isAdmin(),
  ]);

  if (!article || !canViewArticle(article, canViewDrafts)) notFound();

  return (
    <ArticleWorkflowShell
      active="history"
      showEditTab
      slug={slug}
      title={<>revision history of &ldquo;{article.title}&rdquo;</>}
    >
        {article.revisions.length === 0 ? (
          <EmptyState description="no previous revisions. this article has not been edited since creation." />
        ) : (
          <DiffForm slug={slug} articleId={article.id} revisions={article.revisions} />
        )}
    </ArticleWorkflowShell>
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
          compare selected revisions
        </button>
      </div>

      <div className="overflow-x-auto" tabIndex={0}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-1.5 px-2 font-bold text-heading w-8">old</th>
              <th className="py-1.5 px-2 font-bold text-heading w-8">new</th>
              <th className="py-1.5 px-2 font-bold text-heading">date</th>
              <th className="py-1.5 px-2 font-bold text-heading">summary</th>
              <th className="py-1.5 px-2 font-bold text-heading w-16"></th>
            </tr>
          </thead>
          <tbody>
            {/* Current version row */}
            <tr className="border-b border-border-light bg-accent-soft">
              <td className="py-1.5 px-2 pointer-coarse:py-3">
                <label className="flex min-h-6 items-center justify-center pointer-coarse:min-h-9">
                  <span className="sr-only">compare from current version</span>
                  <input type="radio" name="from" value="current" className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5" />
                </label>
              </td>
              <td className="py-1.5 px-2 pointer-coarse:py-3">
                <label className="flex min-h-6 items-center justify-center pointer-coarse:min-h-9">
                  <span className="sr-only">compare to current version</span>
                  <input type="radio" name="to" value="current" defaultChecked className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5" />
                </label>
              </td>
              <td className="py-1.5 px-2 text-muted">current version</td>
              <td className="py-1.5 px-2 italic text-muted">latest</td>
              <td className="py-1.5 px-2">
                <Link href={`/articles/${slug}`} className="text-wiki-link text-[12px]">
                  view
                </Link>
              </td>
            </tr>

            {revisions.map((rev, index) => (
              <tr key={rev.id} className="border-b border-border-light hover:bg-surface-hover">
                <td className="py-1.5 px-2 pointer-coarse:py-3">
                  <label className="flex min-h-6 items-center justify-center pointer-coarse:min-h-9">
                    <span className="sr-only">compare from revision of {formatDate(rev.createdAt)}</span>
                    <input
                      type="radio"
                      name="from"
                      value={rev.id}
                      defaultChecked={index === 0}
                      className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5"
                    />
                  </label>
                </td>
                <td className="py-1.5 px-2 pointer-coarse:py-3">
                  <label className="flex min-h-6 items-center justify-center pointer-coarse:min-h-9">
                    <span className="sr-only">compare to revision of {formatDate(rev.createdAt)}</span>
                    <input type="radio" name="to" value={rev.id} className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5" />
                  </label>
                </td>
                <td className="py-1.5 px-2 text-muted">
                  {formatDate(rev.createdAt)}
                </td>
                <td className="py-1.5 px-2">
                  {rev.editSummary ? (
                    <span className="italic">{rev.editSummary}</span>
                  ) : (
                    <span className="text-muted italic">no summary</span>
                  )}
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/articles/${slug}/diff?from=${rev.id}&to=current`}
                      className="text-wiki-link text-[12px]"
                    >
                      view
                    </Link>
                    <RestoreRevisionButton articleId={articleId} revisionId={rev.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}

export const dynamic = "force-dynamic";
