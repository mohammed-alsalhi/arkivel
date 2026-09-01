import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function gradeLabel(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A", color: "text-success" };
  if (score >= 75) return { grade: "B", color: "text-info" };
  if (score >= 60) return { grade: "C", color: "text-warning" };
  if (score >= 40) return { grade: "D", color: "text-warning" };
  return { grade: "F", color: "text-danger" };
}

export default async function WikiHealthPage() {
  const user = await getSession();
  if (!user || !await isAdmin()) redirect("/admin");

  const [totalArticles, publishedArticles, staleArticles, searchGapCount, certifiedCount] =
    await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "published" } }),
      prisma.article.count({
        where: {
          status: "published",
          // eslint-disable-next-line react-hooks/purity
          updatedAt: { lt: new Date(Date.now() - 180 * 86400000) },
        },
      }),
      prisma.metricLog.count({ where: { type: "search_no_results" } }),
      prisma.article.count({ where: { certified: true } }),
    ]);

  const freshnessScore = publishedArticles > 0
    ? Math.round(((publishedArticles - staleArticles) / publishedArticles) * 100)
    : 100;
  const certScore = publishedArticles > 0
    ? Math.round((certifiedCount / publishedArticles) * 100)
    : 0;
  const searchGapScore = Math.max(0, 100 - Math.min(100, searchGapCount));

  const overallScore = Math.round((freshnessScore + certScore + searchGapScore) / 3);
  const { grade, color } = gradeLabel(overallScore);

  const metrics = [
    { label: "Freshness (articles updated < 6 months ago)", score: freshnessScore, link: "/admin/staleness" },
    { label: "Certified articles", score: certScore, link: null },
    { label: "Search gap score (fewer zero-result queries = better)", score: searchGapScore, link: "/admin/search-gaps" },
  ];

  return (
    <Page>
      <PageHeader title="Wiki Health Score" />

      <div className="flex items-center gap-6 mb-8">
        <div className="text-center">
          <div className={`text-6xl font-bold ${color}`}>{grade}</div>
          <div className="text-sm text-muted mt-1">Overall</div>
        </div>
        <div>
          <div className="text-3xl font-bold">{overallScore}/100</div>
          <div className="text-sm text-muted mt-1">
            {totalArticles} total articles · {publishedArticles} published
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => {
          const { grade: g, color: c } = gradeLabel(m.score);
          return (
            <div key={m.label} className="border border-border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${c}`}>{g}</span>
                  <span className="text-muted text-sm">{m.score}%</span>
                  {m.link && (
                    <Link href={m.link} className="text-xs text-wiki-link hover:underline ml-2">
                      View →
                    </Link>
                  )}
                </div>
              </div>
              <div className="w-full bg-surface-hover rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-accent transition-all"
                  style={{ width: `${m.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
