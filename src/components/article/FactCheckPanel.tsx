"use client";

import { useState } from "react";

type ClaimResult = {
  claim: string;
  verdict: "verified" | "plausible" | "uncertain" | "questionable";
  explanation: string;
  confidence: number;
};

type Props = { html: string };

const VERDICT_STYLE: Record<ClaimResult["verdict"], { color: string; bg: string; border: string; label: string }> = {
  verified: { color: "text-success", bg: "bg-success-soft", border: "border-success-border", label: "Verified" },
  plausible: { color: "text-info", bg: "bg-info-soft", border: "border-info-border", label: "Plausible" },
  uncertain: { color: "text-warning", bg: "bg-warning-soft", border: "border-warning-border", label: "Uncertain" },
  questionable: { color: "text-danger", bg: "bg-danger-soft", border: "border-danger-border", label: "Questionable" },
};

export default function FactCheckPanel({ html }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClaimResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (res.ok) {
        const { results: r } = await res.json();
        setResults(r);
        setOpen(true);
      } else {
        setError("Fact-check failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={open ? () => setOpen(false) : results ? () => setOpen(true) : run}
          disabled={loading}
          className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors flex items-center gap-1 disabled:opacity-50"
          title="Check factual claims in this article using AI"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              {open ? "Hide fact-check" : results ? "Show fact-check" : "Fact-check"}
            </>
          )}
        </button>
        {results && !loading && (
          <button
            onClick={run}
            className="text-[10px] text-muted hover:text-foreground"
          >
            Re-check
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}

      {open && results && results.length > 0 && (
        <div className="mt-3 border border-border rounded bg-surface p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase text-accent mb-2">
            AI Fact-Check — {results.length} claims analyzed
          </p>
          <p className="text-[10px] text-muted mb-3">
            Based on AI training knowledge (cutoff Aug 2025). Not a substitute for authoritative sources.
          </p>
          {results.map((r, i) => {
            const style = VERDICT_STYLE[r.verdict];
            return (
              <div key={i} className={`rounded border p-2.5 ${style.bg} ${style.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] text-foreground font-medium leading-snug flex-1">
                    {r.claim}
                  </p>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${style.color} ${style.border} ${style.bg}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{r.explanation}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex-1 h-1 bg-background/60 rounded-full overflow-hidden border border-border/30">
                    <div
                      className={`h-full rounded-full ${
                        r.confidence >= 80 ? "bg-success" : r.confidence >= 50 ? "bg-warning" : "bg-danger"
                      }`}
                      style={{ width: `${r.confidence}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted tabular-nums">{r.confidence}% confidence</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
