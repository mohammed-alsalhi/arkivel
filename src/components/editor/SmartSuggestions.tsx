"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Suggestion = {
  wikiLinkSuggestions: { title: string; slug: string }[];
  relatedArticles: { title: string; slug: string }[];
  missingSections: string[];
  wordCount: number;
};

type Props = {
  title: string;
  getHtml: () => string;
};

export default function SmartSuggestions({ title, getHtml }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-refresh every 30s when open, or on demand
  useEffect(() => {
    if (!open) return;
    if (Date.now() - lastFetch > 30000) {
      fetchSuggestions();
    }
    timerRef.current = setInterval(() => {
      fetchSuggestions();
    }, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchSuggestions() {
    if (loading || !title.trim()) return;
    setLoading(true);
    try {
      const html = getHtml();
      const res = await fetch("/api/ai/editor-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, html }),
      });
      if (res.ok) {
        setData(await res.json());
        setLastFetch(Date.now());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  function toggle() {
    if (!open) {
      setOpen(true);
      if (!data) fetchSuggestions();
    } else {
      setOpen(false);
    }
  }

  const hasAny = data && (
    data.wikiLinkSuggestions.length > 0 ||
    data.relatedArticles.length > 0 ||
    data.missingSections.length > 0
  );

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={!title.trim()}
        className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1 disabled:opacity-40"
        title="Smart editor suggestions"
      >
        {loading ? (
          <>
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
          </>
        ) : (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Suggestions {open ? "▲" : "▼"}
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 border border-border bg-surface rounded p-3 space-y-3 text-[12px]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase text-accent">Smart suggestions</p>
            <div className="flex items-center gap-2">
              {data && <span className="text-[10px] text-muted">{data.wordCount} words</span>}
              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loading}
                className="text-[10px] text-muted hover:text-foreground disabled:opacity-40"
              >
                Refresh
              </button>
            </div>
          </div>

          {!data && loading && (
            <p className="text-[12px] text-muted">Analyzing your article...</p>
          )}

          {data && !hasAny && (
            <p className="text-[12px] text-muted">
              Looking good! No missing links or sections detected.
            </p>
          )}

          {data && data.wikiLinkSuggestions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-foreground mb-1">
                Wiki links to add ({data.wikiLinkSuggestions.length})
              </p>
              <p className="text-[10px] text-muted mb-1.5">These articles are mentioned in your text but not linked:</p>
              <div className="flex flex-wrap gap-1">
                {data.wikiLinkSuggestions.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/articles/${a.slug}`}
                    target="_blank"
                    className="text-[11px] bg-info-soft text-info border border-info-border px-1.5 py-0.5 rounded hover:border-info"
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-1">
                Use <code className="bg-surface-hover px-0.5">[[Article Name]]</code> syntax to add wiki links.
              </p>
            </div>
          )}

          {data && data.relatedArticles.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-foreground mb-1">Related articles</p>
              <div className="flex flex-wrap gap-1">
                {data.relatedArticles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/articles/${a.slug}`}
                    target="_blank"
                    className="text-[11px] bg-surface-hover border border-border px-1.5 py-0.5 rounded hover:bg-surface text-muted hover:text-foreground"
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data && data.missingSections.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-foreground mb-1">Suggested additions</p>
              <ul className="space-y-0.5">
                {data.missingSections.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <svg className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-[11px] text-muted">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
