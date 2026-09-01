"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState, Page, PageHeader, StatCard, StatGrid, TabButton, Tabs } from "@/components/ui";

type ArticleIssue = {
  slug: string;
  title: string;
  category: string | null;
  status: string;
  updatedAt: string;
  issues: string[];
};

type HealthData = {
  total: number;
  healthScore: number;
  stubs: number;
  outdated: number;
  noExcerpt: number;
  noCategory: number;
  noTags: number;
  longArticles: number;
  brokenLinks: number;
  articleIssues: ArticleIssue[];
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
};

const SCORE_LABEL = (score: number) => {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs work";
  return "Critical";
};

type Stat = { label: string; value: number; desc: string; color: string };

export default function WikiHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/health/wiki")
      .then((r) => r.json())
      .then((d: HealthData) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-1.5">
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    );
  }

  if (!data) return <p className="text-muted text-[13px]">Failed to load health data.</p>;

  const stats: Stat[] = [
    { label: "Stubs", value: data.stubs, desc: "< 100 words", color: "text-danger" },
    { label: "Outdated", value: data.outdated, desc: "1+ year old", color: "text-warning" },
    { label: "No excerpt", value: data.noExcerpt, desc: "Missing summary", color: "text-warning" },
    { label: "No category", value: data.noCategory, desc: "Uncategorized", color: "text-chart-5" },
    { label: "No tags", value: data.noTags, desc: "Untagged", color: "text-chart-1" },
    { label: "Broken links", value: data.brokenLinks, desc: "Dead wiki links", color: "text-danger" },
    { label: "Very long", value: data.longArticles, desc: "> 5000 words", color: "text-muted" },
  ];

  const FILTERS = [
    { value: "all", label: "All issues" },
    { value: "Stub", label: "Stubs" },
    { value: "Outdated", label: "Outdated" },
    { value: "excerpt", label: "No excerpt" },
    { value: "category", label: "No category" },
    { value: "tags", label: "No tags" },
    { value: "broken", label: "Broken links" },
    { value: "long", label: "Very long" },
  ];

  const filtered =
    filter === "all"
      ? data.articleIssues
      : data.articleIssues.filter((a) =>
          a.issues.some((i) => i.toLowerCase().includes(filter.toLowerCase()))
        );

  return (
    <Page>
      <PageHeader
        title="Wiki Health Dashboard"
        description={`Quality audit across ${data.total} articles. Fix issues to improve your wiki's health score.`}
      />

      {/* Score */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-surface border border-border rounded">
        <div className="text-center">
          <p className={`text-5xl font-bold tabular-nums ${SCORE_COLOR(data.healthScore)}`}>
            {data.healthScore}
          </p>
          <p className={`text-[12px] font-semibold mt-1 ${SCORE_COLOR(data.healthScore)}`}>
            {SCORE_LABEL(data.healthScore)}
          </p>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-surface-hover rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all ${
                data.healthScore >= 80
                  ? "bg-success"
                  : data.healthScore >= 40
                  ? "bg-warning"
                  : "bg-danger"
              }`}
              style={{ width: `${data.healthScore}%` }}
            />
          </div>
          <p className="text-[11px] text-muted mt-2">
            {data.articleIssues.length} of {data.total} articles have at least one issue
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <StatGrid className="mb-6">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={<span className={s.color}>{s.value}</span>}
            detail={s.desc}
          />
        ))}
      </StatGrid>

      {/* Filter */}
      <Tabs label="Health issue filters" className="mb-4">
        {FILTERS.map((f) => (
          <TabButton
            key={f.value}
            active={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </TabButton>
        ))}
      </Tabs>

      {/* Article list */}
      {filtered.length === 0 ? (
        <EmptyState title="No issues found" description="No issues found for this filter." />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.slug} className="bg-surface border border-border rounded p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/articles/${a.slug}`}
                      className="text-[13px] font-semibold text-heading hover:underline"
                    >
                      {a.title}
                    </Link>
                    {a.category && (
                      <span className="text-[10px] text-muted bg-surface-hover border border-border px-1.5 py-0.5 rounded">
                        {a.category}
                      </span>
                    )}
                    {a.status !== "published" && (
                      <span className="text-[10px] text-warning bg-warning-soft border border-warning-border px-1.5 py-0.5 rounded capitalize">
                        {a.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {a.issues.map((issue, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-danger-soft text-danger border border-danger-border px-1.5 py-0.5 rounded"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/articles/${a.slug}/edit`}
                  className="flex-shrink-0 h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  Fix
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
