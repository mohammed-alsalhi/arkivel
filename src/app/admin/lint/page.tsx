"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";
import { Button, DataTable, Page, PageHeader, TabButton, Tabs } from "@/components/ui";

type LintResult = {
  level: "error" | "warning" | "info";
  message: string;
  rule: string;
};

type ArticleLintReport = {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  results: LintResult[];
};

type LintSummary = {
  totalArticles: number;
  errors: number;
  warnings: number;
  info: number;
  total: number;
};

type LintResponse = {
  reports: ArticleLintReport[];
  summary: LintSummary;
};

type FilterLevel = "all" | "error" | "warning" | "info";

const LEVEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  error: { bg: "bg-danger-soft", text: "text-danger", label: "Error" },
  warning: { bg: "bg-warning-soft", text: "text-warning", label: "Warning" },
  info: { bg: "bg-info-soft", text: "text-info", label: "Info" },
};

export default function LintPage() {
  const isAdmin = useAdmin();
  const [data, setData] = useState<LintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterLevel>("all");

  const fetchLintResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/articles/lint");
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch lint results");
      }
      const json: LintResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLintResults();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchLintResults]);

  if (!isAdmin) {
    return (
      <Page>
        <PageHeader title="Content Linting" />
        <div className="wiki-notice">
          You must be <Link href="/admin">logged in as admin</Link> to view lint results.
        </div>
      </Page>
    );
  }

  // Filter reports based on selected level
  const filteredReports = data?.reports
    .map((report) => ({
      ...report,
      results:
        filter === "all"
          ? report.results
          : report.results.filter((r) => r.level === filter),
    }))
    .filter((report) => report.results.length > 0) ?? [];

  const filteredTotal = filteredReports.reduce((sum, r) => sum + r.results.length, 0);

  return (
    <Page>
      <PageHeader
        title="Content Linting"
        description="Automated content quality checks across all wiki articles."
      />

      {loading ? (
        <p className="text-[13px] text-muted italic">Analyzing articles...</p>
      ) : error ? (
        <div className="wiki-notice text-danger">{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="border border-border bg-surface p-3 text-center">
              <div className="text-[22px] font-bold text-heading">{data.summary.total}</div>
              <div className="text-[12px] text-muted">Total Issues</div>
            </div>
            <div className="border border-danger-border bg-danger-soft p-3 text-center">
              <div className="text-[22px] font-bold text-danger">{data.summary.errors}</div>
              <div className="text-[12px] text-danger">Errors</div>
            </div>
            <div className="border border-warning-border bg-warning-soft p-3 text-center">
              <div className="text-[22px] font-bold text-warning">{data.summary.warnings}</div>
              <div className="text-[12px] text-warning">Warnings</div>
            </div>
            <div className="border border-info-border bg-info-soft p-3 text-center">
              <div className="text-[22px] font-bold text-info">{data.summary.info}</div>
              <div className="text-[12px] text-info">Info</div>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex items-start gap-2 mb-4">
            <Tabs label="Lint result filters">
              {(["all", "error", "warning", "info"] as FilterLevel[]).map((level) => (
                <TabButton
                  key={level}
                  active={filter === level}
                  onClick={() => setFilter(level)}
                >
                  {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                </TabButton>
              ))}
            </Tabs>
            <Button
              onClick={fetchLintResults}
              className="ml-auto"
            >
              Re-scan
            </Button>
          </div>

          {/* Results */}
          {filteredReports.length === 0 ? (
            <div className="wiki-notice">
              {data.summary.total === 0
                ? "All articles pass content linting checks."
                : "No issues match the current filter."}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[12px] text-muted mb-2">
                Showing {filteredTotal} issue{filteredTotal !== 1 ? "s" : ""} across{" "}
                {filteredReports.length} article{filteredReports.length !== 1 ? "s" : ""}
              </p>
              <DataTable>
                  <thead>
                    <tr>
                      <th className="w-16">Level</th>
                      <th>Article</th>
                      <th className="w-36">Rule</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.flatMap((report) =>
                      report.results.map((result, idx) => {
                        const style = LEVEL_STYLES[result.level];
                        return (
                          <tr key={`${report.articleId}-${idx}`}>
                            <td>
                              <span
                                className={`inline-block px-1.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}
                              >
                                {style.label}
                              </span>
                            </td>
                            <td>
                              <Link
                                href={`/articles/${report.articleSlug}`}
                                className="text-wiki-link hover:underline font-medium"
                              >
                                {report.articleTitle}
                              </Link>
                            </td>
                            <td>
                              <code className="text-[11px] bg-surface-hover px-1 py-0.5">
                                {result.rule}
                              </code>
                            </td>
                            <td className="text-muted">
                              {result.message}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
              </DataTable>
            </div>
          )}
        </>
      ) : null}
    </Page>
  );
}
