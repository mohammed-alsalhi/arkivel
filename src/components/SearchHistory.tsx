"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "wiki_search_history";
const MAX = 20;

export function recordSearch(query: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const deduped = [query, ...existing.filter((q) => q !== query)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(deduped));
  } catch {
    // ignore
  }
}

export function clearSearchHistory() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Shows recent search history below the search bar when there is no active query */
export default function SearchHistory({ currentQuery }: { currentQuery: string }) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      setHistory([]);
    }
  }, [currentQuery]);

  if (currentQuery.trim() || history.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted uppercase">Recent searches</span>
        <button
          onClick={() => { clearSearchHistory(); setHistory([]); }}
          className="text-[10px] text-muted hover:text-foreground pointer-coarse:py-2"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((q, i) => (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(q)}`}
            className="px-2 py-0.5 pointer-coarse:py-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
