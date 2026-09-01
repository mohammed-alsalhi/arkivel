"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, LoadingState, Page, PageHeader, Section, StatCard, StatGrid } from "@/components/ui";

interface MetricsSummary {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  totalTags: number;
  totalRevisions: number;
  totalDiscussions: number;
  recentEdits24h: number;
  recentArticles24h: number;
  topCategories: { name: string; slug: string; count: number }[];
  articlesByMonth: { month: string; count: number }[];
  timestamp: string;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => {
        if (r.status === 401) {
          setError("Unauthorized. Please log in as admin.");
          router.push("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setMetrics(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load metrics");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <LoadingState label="Loading metrics..." />
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-wiki-link-broken text-[13px]">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  const maxCategoryCount = Math.max(...metrics.topCategories.map((c) => c.count), 1);
  const maxMonthCount = Math.max(...metrics.articlesByMonth.map((m) => m.count), 1);

  return (
    <Page>
      <PageHeader
        title="Wiki Metrics"
        description={<>Last updated: {new Date(metrics.timestamp).toLocaleString()}</>}
      />

      {/* Summary cards */}
      <StatGrid>
        <StatCard label="Total Articles" value={metrics.totalArticles.toLocaleString()} />
        <StatCard label="Published" value={metrics.publishedArticles.toLocaleString()} />
        <StatCard label="Drafts" value={metrics.draftArticles.toLocaleString()} />
        <StatCard label="Categories" value={metrics.totalCategories.toLocaleString()} />
        <StatCard label="Tags" value={metrics.totalTags.toLocaleString()} />
        <StatCard label="Revisions" value={metrics.totalRevisions.toLocaleString()} />
        <StatCard label="Discussions" value={metrics.totalDiscussions.toLocaleString()} />
        <StatCard label="Edits (24h)" value={metrics.recentEdits24h.toLocaleString()} />
      </StatGrid>

      {/* Recent activity */}
      <div className="wiki-notice mb-4">
        <strong>Recent Activity (24h):</strong>{" "}
        {metrics.recentEdits24h} edit(s), {metrics.recentArticles24h} new article(s)
      </div>

      {/* Top categories bar chart */}
      <Section title="Top Categories by Article Count">
        <div className="space-y-2">
          {metrics.topCategories.length === 0 && (
            <EmptyState title="No categories yet." />
          )}
          {metrics.topCategories.map((cat) => (
            <div key={cat.slug} className="flex items-center gap-2">
              <span className="w-28 text-[12px] text-foreground truncate flex-shrink-0">
                {cat.name}
              </span>
              <div className="flex-1 h-5 bg-background border border-border-light relative">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${(cat.count / maxCategoryCount) * 100}%`,
                    minWidth: cat.count > 0 ? "2px" : "0",
                  }}
                />
              </div>
              <span className="text-[11px] text-muted w-8 text-right flex-shrink-0">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Articles by month chart */}
      {metrics.articlesByMonth.length > 0 && (
        <Section title="Articles Created by Month">
          <div className="space-y-2">
            {metrics.articlesByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="w-20 text-[12px] text-foreground flex-shrink-0">
                  {m.month}
                </span>
                <div className="flex-1 h-5 bg-background border border-border-light relative">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${(m.count / maxMonthCount) * 100}%`,
                      minWidth: m.count > 0 ? "2px" : "0",
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted w-8 text-right flex-shrink-0">
                  {m.count}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
