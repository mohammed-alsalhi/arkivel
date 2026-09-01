import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export default async function LearningPathPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  const path = await prisma.learningPath.findUnique({
    where: { id },
    include: {
      author: { select: { username: true, displayName: true } },
      articles: {
        orderBy: { order: "asc" },
        include: { article: { select: { id: true, title: true, slug: true, excerpt: true } } },
      },
    },
  });
  if (!path) notFound();

  let completedIds: string[] = [];
  if (session) {
    const progress = await prisma.learningPathProgress.findUnique({
      where: { userId_pathId: { userId: session.id, pathId: id } },
    });
    completedIds = progress?.completedArticleIds || [];
  }

  const completed = new Set(completedIds);
  const percent = path.articles.length > 0
    ? Math.round((completedIds.length / path.articles.length) * 100)
    : 0;

  return (
    <Page width="narrow">
      <Link href="/learning-paths" className="text-sm text-muted hover:text-foreground">
        ← Learning Paths
      </Link>

      <PageHeader
        title={path.name}
        description={
          <>
            {path.description && <p>{path.description}</p>}
            {path.author && (
              <p className="text-xs">
                Created by {path.author.displayName || path.author.username}
              </p>
            )}
          </>
        }
      />

      {session && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Progress</span>
            <span>{completedIds.length} / {path.articles.length} — {percent}%</span>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <ol className="space-y-3">
        {path.articles.map(({ article }, i) => (
          <li key={article.id} className="flex items-start gap-3">
            <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              completed.has(article.id) ? "bg-success-soft text-success" : "bg-surface-hover text-muted"
            }`}>
              {completed.has(article.id) ? "✓" : i + 1}
            </span>
            <div>
              <Link href={`/articles/${article.slug}`} className="font-medium text-wiki-link hover:underline">
                {article.title}
              </Link>
              {article.excerpt && (
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{article.excerpt}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Page>
  );
}

export const dynamic = "force-dynamic";
