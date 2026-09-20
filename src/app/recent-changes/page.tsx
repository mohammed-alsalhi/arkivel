import Link from "next/link";
import prisma from "@/lib/prisma";
import { TRAIL_ROOTS } from "@/lib/trail";
import { formatDate } from "@/lib/utils";
import { EmptyState, LinkButton, Page, PageHeader, Section } from "@/components/ui";

export default async function RecentChangesPage() {
  // Get recent revisions (edits)
  const revisions = await prisma.articleRevision.findMany({
    where: { article: { published: true, status: "published" } },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      article: {
        select: {
          title: true,
          slug: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });

  // Get recently created articles
  const recentArticles = await prisma.article.findMany({
    where: { published: true, status: "published" },
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
    },
  });

  // Merge into a unified timeline
  type ChangeEntry = {
    id: string;
    date: Date;
    type: "edit" | "create";
    articleTitle: string;
    articleSlug: string;
    summary: string | null;
    category: { name: string; slug: string } | null;
  };

  const entries: ChangeEntry[] = [
    ...revisions.map((r) => ({
      id: `rev-${r.id}`,
      date: r.createdAt,
      type: "edit" as const,
      articleTitle: r.article.title,
      articleSlug: r.article.slug,
      summary: r.editSummary,
      category: r.article.category,
    })),
    ...recentArticles.map((a) => ({
      id: `new-${a.id}`,
      date: a.createdAt,
      type: "create" as const,
      articleTitle: a.title,
      articleSlug: a.slug,
      summary: null,
      category: a.category,
    })),
  ];

  // Sort by date descending and take top 50
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  const timeline = entries.slice(0, 50);

  // Group by date string
  const grouped: Record<string, ChangeEntry[]> = {};
  for (const entry of timeline) {
    const dateKey = formatDate(entry.date);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(entry);
  }

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "inbox" }]}>
      <PageHeader
        title="inbox"
        description="recent changes across the wiki"
        actions={<LinkButton href="/articles">all pages</LinkButton>}
      />
      {timeline.length === 0 ? (
        <EmptyState title="no recent changes" description="edits and newly created pages will appear here." />
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([date, changes]) => (
            <Section key={date} title={date}>
              <ul className="wiki-compact-list text-[13px]">
                {changes.map((entry) => (
                  <li key={entry.id} className="wiki-compact-list-item">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={`ui-chip flex-shrink-0 ${
                          entry.type === "create"
                            ? "ui-chip-info"
                            : ""
                        }`}
                      >
                        {entry.type === "create" ? "new" : "edit"}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/articles/${entry.articleSlug}`} className="font-medium">
                          {entry.articleTitle}
                        </Link>
                        {entry.category && (
                          <span className="text-muted text-[11px] ml-1">
                            (<Link href={`/categories/${entry.category.slug}`}>
                              {entry.category.name}
                            </Link>)
                          </span>
                        )}
                        {entry.summary && (
                          <span className="text-muted italic ml-1">
                            - {entry.summary}
                          </span>
                        )}
                        {entry.type === "create" && (
                          <span className="text-muted italic ml-1">- created</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
