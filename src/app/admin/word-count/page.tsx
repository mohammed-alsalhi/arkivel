"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable, Page, PageHeader, SectionPanel, StatCard, StatGrid } from "@/components/ui";

type Bucket = { label: string; count: number };
type ArticleEntry = { id: string; title: string; slug: string; wordCount: number };
type Stats = { total: number; avg: number; max: number; min: number };
type Data = {
  distribution: Bucket[];
  topArticles: ArticleEntry[];
  shortArticles: ArticleEntry[];
  stats: Stats;
};

export default function WordCountPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/word-count")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Page>
        <PageHeader title="Word Count Distribution" />
        <p className="text-[13px] text-muted italic">Loading…</p>
      </Page>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(...data.distribution.map((b) => b.count), 1);

  return (
    <Page>
      <PageHeader title="Word Count Distribution" />

      {/* Summary stats */}
      <StatGrid className="mb-6">
        {[
          { label: "Articles", value: data.stats.total },
          { label: "Average words", value: data.stats.avg.toLocaleString() },
          { label: "Longest", value: data.stats.max.toLocaleString() },
          { label: "Shortest", value: data.stats.min.toLocaleString() },
        ].map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </StatGrid>

      {/* Bar chart */}
      <SectionPanel className="mb-6" title="Distribution">
          <div className="space-y-2">
            {data.distribution.map((b) => {
              const pct = Math.round((b.count / maxCount) * 100);
              return (
                <div key={b.label} className="flex items-center gap-3 text-[13px]">
                  <span className="w-24 text-right text-muted shrink-0">{b.label}</span>
                  <div className="flex-1 bg-surface-hover h-5 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-sm transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-muted text-right shrink-0">{b.count}</span>
                </div>
              );
            })}
          </div>
      </SectionPanel>

      {/* Top + shortest articles */}
      <div className="grid grid-cols-2 gap-4">
        <SectionPanel title="Longest articles">
            <DataTable>
              <tbody>
                {data.topArticles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/articles/${a.slug}`} className="text-accent hover:underline line-clamp-1">
                        {a.title}
                      </Link>
                    </td>
                    <td className="text-right text-muted whitespace-nowrap">{a.wordCount.toLocaleString()} w</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
        </SectionPanel>

        <SectionPanel title="Shortest articles">
            <DataTable>
              <tbody>
                {data.shortArticles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/articles/${a.slug}`} className="text-accent hover:underline line-clamp-1">
                        {a.title}
                      </Link>
                    </td>
                    <td className="text-right text-muted whitespace-nowrap">{a.wordCount.toLocaleString()} w</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
        </SectionPanel>
      </div>
    </Page>
  );
}
