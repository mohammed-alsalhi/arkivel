"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSearchResults } from "@/lib/search-response";
import { useOutsideClick } from "@/lib/useOutsideClick";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: { name: string } | null;
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear search on navigation
  useEffect(() => {
    setQuery("");
    setOpen(false);
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const nextResults = getSearchResults<SearchResult>(data);
        setResults(nextResults);
        setOpen(nextResults.length > 0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useOutsideClick(ref, () => {
    setOpen(false);
    if (!query.trim()) setExpanded(false);
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setExpanded(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setQuery("");
      setOpen(false);
      setExpanded(false);
    }
  }

  return (
    <div ref={ref} className={`wiki-header-search-shell ${expanded ? "wiki-header-search-shell-open" : ""}`}>
      {!expanded && (
        <button
          type="button"
          className="wiki-search-trigger"
          onClick={() => setExpanded(true)}
          aria-label="Open search"
          aria-expanded={expanded}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="wiki-search-trigger-label">Search</span>
          <kbd className="wiki-search-shortcut">/</kbd>
        </button>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="wiki-search-form">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
            </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles"
            className="ui-input wiki-header-search pl-7 pr-8"
          />
            <button
              type="button"
              className="wiki-search-close"
              onClick={() => {
                setQuery("");
                setOpen(false);
                setExpanded(false);
              }}
              aria-label="Close search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </form>
      )}

      {open && results.length > 0 && (
        <div className="ui-dropdown wiki-search-dropdown">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/articles/${result.slug}`}
              onClick={() => { setOpen(false); setQuery(""); }}
              className="flex flex-col border-b border-border-light px-3 py-1.5 last:border-0 hover:bg-surface-hover hover:no-underline"
            >
              <span className="text-[13px] text-wiki-link">
                {result.title}
              </span>
              {result.excerpt && (
                <span className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                  {result.excerpt}
                </span>
              )}
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            onClick={() => { setOpen(false); setQuery(""); }}
            className="ui-dropdown-item border-t border-border text-center text-wiki-link"
          >
            See all results
          </Link>
        </div>
      )}
    </div>
  );
}
