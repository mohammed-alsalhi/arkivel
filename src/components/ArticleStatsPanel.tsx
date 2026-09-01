"use client";

import { useState } from "react";
import ViewSparkline from "@/components/ViewSparkline";

type Props = {
  articleId: string;
  reads: number;
  reactions: number;
  qualityScore: number | null;
  qualityLabel: string | null;
  ageDays: number;
  wordCount: number;
};

export default function ArticleStatsPanel({
  articleId,
  reads,
  reactions,
  qualityScore,
  qualityLabel,
  ageDays,
  wordCount,
}: Props) {
  const [open, setOpen] = useState(false);

  const ageText = ageDays === 0 ? "Today" : ageDays === 1 ? "1 day ago" : `${ageDays} days ago`;

  const qualityColor =
    qualityScore === null
      ? "text-muted-foreground"
      : qualityScore >= 80
      ? "text-success"
      : qualityScore >= 60
      ? "text-info"
      : qualityScore >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="border border-border rounded-lg overflow-hidden my-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium bg-muted/30 hover:bg-muted/50"
      >
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Article stats
        </span>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Reads</span>
            <div className="font-medium">{reads.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Reactions</span>
            <div className="font-medium">{reactions.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Word count</span>
            <div className="font-medium">{wordCount.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <div className="font-medium">{ageText}</div>
          </div>
          {qualityScore !== null && (
            <div>
              <span className="text-muted-foreground">Quality</span>
              <div className={`font-medium ${qualityColor}`}>
                {qualityScore}/100 · {qualityLabel}
              </div>
            </div>
          )}
          <div className="col-span-2 sm:col-span-3 pt-1">
            <span className="text-muted-foreground block mb-1">Views (30 days)</span>
            <ViewSparkline articleId={articleId} />
          </div>
        </div>
      )}
    </div>
  );
}
