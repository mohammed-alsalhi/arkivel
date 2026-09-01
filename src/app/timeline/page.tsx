"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EmptyState, Page, PageHeader } from "@/components/ui";

type TimelineArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
};

type Category = { id: string; name: string; slug: string };

function groupByYear(articles: TimelineArticle[]) {
  const map = new Map<number, TimelineArticle[]>();
  for (const a of articles) {
    const year = new Date(a.createdAt).getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(a);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

export default function TimelinePage() {
  const [articles, setArticles] = useState<TimelineArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) => {
      const flat: Category[] = [];
      function walk(list: (Category & { children?: Category[] })[]) {
        for (const c of list) { flat.push(c); if (c.children) walk(c.children); }
      }
      walk(data);
      setCategories(flat);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("categoryId", categoryFilter);
    fetch(`/api/timeline?${params}`)
      .then((r) => r.json())
      .then((data) => { setArticles(data); setLoading(false); });
  }, [categoryFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter((a) => a.title.toLowerCase().includes(q));
  }, [articles, search]);

  const grouped = useMemo(() => groupByYear(filtered), [filtered]);

  return (
    <Page>
      <PageHeader
        title="Timeline"
        description={`${articles.length} article${articles.length !== 1 ? "s" : ""} in chronological order`}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title..."
          className="border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none flex-1 max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="No articles found." />
      ) : (
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[88px] top-0 bottom-0 w-px bg-border" />

          {grouped.map(([year, items]) => (
            <div key={year} className="mb-8">
              {/* Year label */}
              <div className="flex items-center mb-4">
                <span className="w-[80px] text-right text-[13px] font-bold text-muted pr-3 shrink-0">{year}</span>
                <div className="w-4 h-4 rounded-full bg-accent border-2 border-surface z-10 shrink-0" />
              </div>

              <div className="space-y-2 pl-[104px]">
                {items.map((a) => {
                  const date = new Date(a.createdAt);
                  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={a.id} className="flex items-start gap-3 group">
                      {/* Date dot */}
                      <div className="relative shrink-0 -ml-[calc(104px-8px)]">
                        <div className="absolute -left-[8px] top-[6px] w-2 h-2 rounded-full bg-border group-hover:bg-accent transition-colors" />
                      </div>
                      <div className="shrink-0 w-[72px] text-[11px] text-muted text-right -ml-[72px] mt-[2px]">
                        {monthDay}
                      </div>
                      <div className="min-w-0 ml-[8px]">
                        <Link
                          href={`/articles/${a.slug}`}
                          className="text-[13px] font-medium text-heading hover:text-accent"
                        >
                          {a.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.category && (
                            <span className="text-[11px] text-muted">{a.category.name}</span>
                          )}
                          {a.status !== "published" && (
                            <span className={`text-[10px] px-1 border rounded ${
                              a.status === "draft"
                                ? "border-warning-border text-warning"
                                : "border-info-border text-info"
                            }`}>
                              {a.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
