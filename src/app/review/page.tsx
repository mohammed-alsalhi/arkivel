"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

type ReviewArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: { name: string } | null;
};

type ReviewItem = {
  id: string;
  articleId: string;
  interval: number;
  repetitions: number;
  ease: number;
  nextReviewAt: string;
  lastReviewAt: string | null;
  isDue?: boolean;
  daysUntilDue?: number;
  article: ReviewArticle;
};

const QUALITY_BUTTONS = [
  { q: 0, label: "Blank", desc: "Complete blackout", color: "bg-danger-soft text-danger border border-danger-border hover:border-danger" },
  { q: 2, label: "Hard", desc: "Recalled with effort", color: "bg-warning-soft text-warning border border-warning-border hover:border-warning" },
  { q: 4, label: "Good", desc: "Recalled correctly", color: "bg-info-soft text-info border border-info-border hover:border-info" },
  { q: 5, label: "Easy", desc: "Perfect, instant recall", color: "bg-success-soft text-success border border-success-border hover:border-success" },
];

export default function ReviewPage() {
  const [dueItems, setDueItems] = useState<ReviewItem[]>([]);
  const [allItems, setAllItems] = useState<ReviewItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"review" | "enrolled">("review");
  const [reviewed, setReviewed] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [dueRes, allRes] = await Promise.all([
      fetch("/api/spaced-repetition?mode=due"),
      fetch("/api/spaced-repetition?mode=all"),
    ]);
    if (dueRes.ok) setDueItems(await dueRes.json());
    if (allRes.ok) setAllItems(await allRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReview(quality: number) {
    const item = dueItems[current];
    if (!item) return;
    setReviewing(true);
    await fetch("/api/spaced-repetition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", articleId: item.articleId, quality }),
    });
    setReviewing(false);
    setReviewed((v) => v + 1);
    if (current + 1 >= dueItems.length) {
      setDone(true);
    } else {
      setCurrent((v) => v + 1);
      setRevealed(false);
    }
  }

  async function unenroll(articleId: string) {
    await fetch("/api/spaced-repetition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unenroll", articleId }),
    });
    setAllItems((prev) => prev.filter((i) => i.articleId !== articleId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-1.5">
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Review Queue"
        description={
          <>
            Spaced repetition surfaces articles at increasing intervals so knowledge stays fresh.
            <Link href="/articles" className="ml-2 text-accent hover:underline">Enrol articles from their pages →</Link>
          </>
        }
        actions={
          <span className="text-[12px] text-muted">{dueItems.length} due today · {allItems.length} enrolled</span>
        }
      />

      <div>
      {/* Tabs */}
      <div className="wiki-tabs mb-0">
        <button
          onClick={() => setTab("review")}
          className={`wiki-tab ${tab === "review" ? "wiki-tab-active" : ""}`}
        >
          Review ({dueItems.length} due)
        </button>
        <button
          onClick={() => setTab("enrolled")}
          className={`wiki-tab ${tab === "enrolled" ? "wiki-tab-active" : ""}`}
        >
          All enrolled ({allItems.length})
        </button>
      </div>

      <div className="border border-t-0 border-border bg-surface px-5 py-4">
        {tab === "review" && (
          <>
            {dueItems.length === 0 && (
              <div className="text-center py-16">
                <div className="text-[2rem] mb-3">
                  <svg className="w-12 h-12 mx-auto text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[16px] font-medium text-heading">All caught up!</p>
                <p className="text-[13px] text-muted mt-1">No articles due for review right now.</p>
                {allItems.length === 0 && (
                  <p className="text-[13px] text-muted mt-3">
                    Enrol articles by clicking <strong>+ Review later</strong> on any article page.
                  </p>
                )}
              </div>
            )}

            {dueItems.length > 0 && !done && (
              <div className="max-w-2xl mx-auto">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4 text-[12px] text-muted">
                  <span>{current + 1} / {dueItems.length}</span>
                  <div className="flex-1 mx-4 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${((current) / dueItems.length) * 100}%` }}
                    />
                  </div>
                  <span>{reviewed} reviewed</span>
                </div>

                {/* Card */}
                {(() => {
                  const item = dueItems[current];
                  return (
                    <div className="border border-border rounded-lg p-6 space-y-4">
                      <div className="text-[11px] text-muted uppercase">
                        {item.article.category?.name ?? "Uncategorised"} · interval {item.interval}d · rep #{item.repetitions}
                      </div>
                      <h2 className="text-[1.4rem] font-semibold text-heading" style={{ fontFamily: "var(--font-serif)" }}>
                        {item.article.title}
                      </h2>

                      {!revealed ? (
                        <div className="text-center pt-4">
                          <p className="text-[13px] text-muted mb-4">Try to recall what you know about this topic.</p>
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/articles/${item.article.slug}`}
                              target="_blank"
                              className="ui-button"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Read article
                            </Link>
                            <button
                              onClick={() => setRevealed(true)}
                              className="ui-button ui-button-primary"
                            >
                              Show answer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {item.article.excerpt && (
                            <p className="text-[14px] text-foreground border-t border-border pt-4 leading-relaxed">
                              {item.article.excerpt}
                            </p>
                          )}
                          <div className="border-t border-border pt-4">
                            <p className="text-[12px] text-muted mb-2">How well did you recall this?</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {QUALITY_BUTTONS.map(({ q, label, desc, color }) => (
                                <button
                                  key={q}
                                  onClick={() => handleReview(q)}
                                  disabled={reviewing}
                                  className={`${color} rounded px-3 py-2 pointer-coarse:py-3 text-[12px] text-left transition-colors disabled:opacity-50`}
                                >
                                  <div className="font-semibold">{label}</div>
                                  <div className="text-[10px] opacity-80">{desc}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {done && (
              <div className="text-center py-16">
                <svg className="w-12 h-12 mx-auto text-success mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[16px] font-medium text-heading">Session complete!</p>
                <p className="text-[13px] text-muted mt-1">Reviewed {reviewed} article{reviewed !== 1 ? "s" : ""}.</p>
                <button
                  onClick={() => { load(); setCurrent(0); setDone(false); setRevealed(false); setReviewed(0); }}
                  className="ui-button ui-button-primary mt-4"
                >
                  Start again
                </button>
              </div>
            )}
          </>
        )}

        {tab === "enrolled" && (
          <div>
            {allItems.length === 0 ? (
              <EmptyState
                description={
                  <>
                    No articles enrolled. Click <strong>+ Review later</strong> on any article page to start.
                  </>
                }
              />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="w-20">Reps</th>
                    <th className="w-28">Next review</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/articles/${item.article.slug}`} className="font-medium hover:underline">
                          {item.article.title}
                        </Link>
                        {item.article.category && (
                          <span className="text-muted text-[11px] ml-1.5">· {item.article.category.name}</span>
                        )}
                      </td>
                      <td className="text-muted">{item.repetitions}</td>
                      <td>
                        {item.isDue ? (
                          <span className="text-warning font-medium">Due now</span>
                        ) : (
                          <span className="text-muted">
                            {item.daysUntilDue === 0 ? "Today" : `In ${item.daysUntilDue}d`}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => unenroll(item.articleId)}
                          className="text-[11px] text-muted hover:text-danger transition-colors pointer-coarse:py-2"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        )}
      </div>
      </div>
    </Page>
  );
}
