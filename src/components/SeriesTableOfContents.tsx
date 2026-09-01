"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SeriesMember = { position: number; article: { id?: string; title: string; slug: string } };
type SeriesInfo = { id: string; name: string; slug: string; members: SeriesMember[] };

function getReadSlugs(): Set<string> {
  try {
    const history: { slug: string }[] = JSON.parse(localStorage.getItem("wiki_view_history") ?? "[]");
    return new Set(history.map((h) => h.slug));
  } catch {
    return new Set();
  }
}

export default function SeriesTableOfContents({ articleId }: { articleId: string }) {
  const [info, setInfo] = useState<{ series: SeriesInfo; position: number } | null>(null);
  const [readSlugs, setReadSlugs] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/series")
      .then((r) => r.json())
      .then((data: SeriesInfo[]) => {
        for (const s of data) {
          const idx = s.members.findIndex((m) => m.article?.id === articleId);
          if (idx !== -1) {
            setInfo({ series: s, position: s.members[idx].position });
            setReadSlugs(getReadSlugs());
            return;
          }
        }
      })
      .catch(() => {});
  }, [articleId]);

  if (!info) return null;

  const { series, position } = info;
  const readCount = series.members.filter((m) => readSlugs.has(m.article.slug)).length;

  return (
    <div className="border border-border rounded mb-3 text-[12px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 font-medium text-left bg-surface-hover hover:bg-muted/50 transition-colors rounded"
      >
        <span className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          {series.name}
          <span className="text-muted font-normal">— {position + 1} of {series.members.length}</span>
          {readCount > 0 && (
            <span className="text-accent">{readCount}/{series.members.length} read</span>
          )}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ol className="px-3 pb-3 pt-1 space-y-0.5">
          {series.members.map((m) => {
            const isCurrent = m.position === position;
            const isRead = readSlugs.has(m.article.slug);
            return (
              <li key={m.position} className="flex items-center gap-2">
                <span className="w-4 text-right shrink-0 text-muted">{m.position + 1}.</span>
                {isRead ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="w-[10px] shrink-0" />
                )}
                <Link
                  href={`/articles/${m.article.slug}`}
                  className={isCurrent ? "font-semibold text-accent" : "text-foreground hover:underline text-muted"}
                >
                  {m.article.title}
                </Link>
                {isCurrent && (
                  <span className="text-accent ml-1">← current</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
