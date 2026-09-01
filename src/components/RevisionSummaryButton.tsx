"use client";

import { useState } from "react";

type Props = {
  articleId: string;
  revisionId: string;
  compareToId?: string;
};

export default function RevisionSummaryButton({ articleId, revisionId, compareToId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function fetchSummary() {
    if (summary) { setOpen((o) => !o); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/revisions/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, compareToId }),
      });
      const data = await res.json();
      setSummary(data.summary ?? data.error ?? "Unable to generate summary.");
    } catch {
      setSummary("Unable to generate summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button
        onClick={fetchSummary}
        className="ui-button"
      >
        {loading ? "…" : "What changed?"}
      </button>
      {open && summary && (
        <div className="mt-1 text-xs text-muted-foreground bg-muted/40 border border-border rounded px-2 py-1.5 max-w-sm">
          {summary}
        </div>
      )}
    </span>
  );
}
