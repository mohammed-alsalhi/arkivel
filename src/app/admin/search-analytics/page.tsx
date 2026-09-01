"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, DataTable, EmptyState, Page, PageHeader, SectionPanel } from "@/components/ui";

type TopQuery = { query: string; count: number; avgResults: number };
type ZeroQuery = { query: string; count: number };
type DayVolume = { date: string; count: number };

type Analytics = {
  topQueries: TopQuery[];
  zeroResultQueries: ZeroQuery[];
  dailyVolume: DayVolume[];
  totalCount: number;
  days: number;
};

export default function SearchAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/search-analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const maxVolume = data ? Math.max(...data.dailyVolume.map((d) => d.count), 1) : 1;

  return (
    <Page>
      <PageHeader
        title="Search Analytics"
        actions={
          <>
            <span className="text-[13px] text-muted">Period:</span>
            {[7, 14, 30, 90].map((d) => (
              <Button
                key={d}
                onClick={() => setDays(d)}
                variant={days === d ? "primary" : "default"}
              >
                {d}d
              </Button>
            ))}
            {data && !loading && (
              <span className="text-[13px] text-muted ml-2">{data.totalCount.toLocaleString()} total searches</span>
            )}
          </>
        }
      />

      {loading && <div className="text-muted text-[13px] italic">Loading…</div>}

      {data && !loading && (
        <div className="space-y-6">
          {/* Daily volume bar chart */}
          <SectionPanel title={`Search volume — last ${days} days`}>
              {data.dailyVolume.length === 0 ? (
                <EmptyState title="No data yet." />
              ) : (
                <div className="flex items-end gap-0.5 h-24 w-full">
                  {data.dailyVolume.map((d) => {
                    const height = Math.round((d.count / maxVolume) * 96);
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.count} searches`}
                        style={{ height: `${Math.max(height, 2)}px`, flex: 1 }}
                        className="bg-accent/60 hover:bg-accent rounded-t-sm transition-colors"
                      />
                    );
                  })}
                </div>
              )}
          </SectionPanel>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Top queries */}
            <SectionPanel title="Top queries">
                {data.topQueries.length === 0 ? (
                  <EmptyState title="No data yet." />
                ) : (
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th className="text-right">Searches</th>
                        <th className="text-right">Avg results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topQueries.map((q) => (
                        <tr key={q.query}>
                          <td className="font-mono text-[12px]">{q.query}</td>
                          <td className="text-right text-muted">{q.count}</td>
                          <td className={`text-right ${q.avgResults === 0 ? "text-wiki-link-broken" : "text-muted"}`}>
                            {q.avgResults}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
            </SectionPanel>

            {/* Zero-result queries */}
            <SectionPanel title="Zero-result queries">
                {data.zeroResultQueries.length === 0 ? (
                  <EmptyState title="No zero-result searches in this period." />
                ) : (
                  <>
                    <p className="text-[12px] text-muted mb-2">
                      These searches returned no results — consider creating articles for them.
                    </p>
                    <DataTable>
                      <thead>
                        <tr>
                          <th>Query</th>
                          <th className="text-right">Searches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.zeroResultQueries.map((q) => (
                          <tr key={q.query}>
                            <td>
                              <span className="font-mono text-[12px] text-wiki-link-broken">{q.query}</span>
                            </td>
                            <td className="text-right text-muted">{q.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                    <div className="mt-2 text-[12px]">
                      <Link href="/admin/knowledge-gaps" className="text-muted hover:text-foreground">
                        Also see Knowledge Gaps →
                      </Link>
                    </div>
                  </>
                )}
            </SectionPanel>
          </div>
        </div>
      )}
    </Page>
  );
}
