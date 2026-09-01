"use client";

import { useState } from "react";

interface ReadabilityScore {
  fleschScore: number;
  grade: string;
  avgSentenceLength: number;
  readingTimeMinutes: number;
  wordCount: number;
}

interface WritingIssue {
  type: string;
  message: string;
  severity: "info" | "warning" | "error";
}

interface CoachResult {
  readability: ReadabilityScore;
  issues: WritingIssue[];
  aiSuggestions: string | null;
}

interface WritingCoachPanelProps {
  getHtml: () => string;
  hasExcerpt: boolean;
}

const severityColors = {
  info: "text-info border-info-border bg-info-soft",
  warning: "text-warning border-warning-border bg-warning-soft",
  error: "text-danger border-danger-border bg-danger-soft",
};

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 70 ? "var(--color-success)" : score >= 50 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-mono font-semibold" style={{ color }}>
        {score}/100
      </span>
    </div>
  );
}

export default function WritingCoachPanel({ getHtml, hasExcerpt }: WritingCoachPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const html = getHtml();
      const res = await fetch("/api/ai/writing-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, hasExcerpt }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && !result) runAnalysis();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-muted hover:bg-surface-hover transition-colors"
      >
        <span className="font-medium">Writing Coach</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="text-[11px] text-accent hover:underline disabled:opacity-50"
          >
            {loading ? "Analysing…" : "Re-analyse"}
          </button>

          {result && (
            <>
              {/* Readability score */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-foreground">Readability</div>
                <ScoreMeter score={result.readability.fleschScore} />
                <div className="text-[10px] text-muted grid grid-cols-3 gap-1 mt-1">
                  <span>{result.readability.grade}</span>
                  <span>{result.readability.avgSentenceLength} words/sentence</span>
                  <span>~{result.readability.readingTimeMinutes} min read</span>
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-foreground">Issues</div>
                  {result.issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`text-[11px] border rounded px-2 py-1 ${severityColors[issue.severity]}`}
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}

              {result.issues.length === 0 && (
                <div className="text-[11px] text-success">No issues found.</div>
              )}

              {/* AI suggestions */}
              {result.aiSuggestions && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-foreground">AI Suggestions</div>
                  <div className="text-[11px] text-muted whitespace-pre-wrap bg-surface-hover rounded p-2">
                    {result.aiSuggestions}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
