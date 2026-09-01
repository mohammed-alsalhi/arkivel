"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";

interface Source {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  /** The current article slug — used as a pre-seeded context hint in the question */
  articleSlug?: string;
}

/**
 * A collapsible Q&A panel that lets readers ask questions and get answers
 * grounded in wiki content via /api/ai/qa.
 */
export default function ArticleQA({ articleSlug: _slug }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    setError(null);
    try {
      const res = await fetch("/api/ai/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Request failed");
        return;
      }
      const data = await res.json();
      setAnswer(data.answer ?? null);
      setSources(data.sources ?? []);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border border-border rounded">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-muted hover:text-foreground hover:bg-surface-hover"
      >
        <span className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Ask a question about this wiki
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-border">
          <div className="flex flex-wrap gap-2 mt-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder="Ask anything about this wiki…"
              className="h-7 pointer-coarse:h-9 min-w-0 flex-1 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={ask}
              disabled={loading || !question.trim()}
              className="h-7 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
            >
              {loading ? "…" : "Ask"}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-[12px] text-red-600">{error}</p>
          )}

          {answer !== null && (
            <div className="mt-2">
              <p className="text-[13px] text-foreground leading-relaxed">{answer}</p>
              {sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="text-[10px] text-muted">Sources:</span>
                  {sources.map((s) => (
                    <Link key={s.id} href={`/articles/${s.slug}`} className="text-[10px] wiki-link hover:underline">
                      {s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {answer === null && !loading && !error && question && (
            <EmptyState className="mt-2" description="No answer found in the wiki." />
          )}
        </div>
      )}
    </div>
  );
}
