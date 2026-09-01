"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LinkButton, Page, PageHeader } from "@/components/ui";

type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
  category?: { name: string } | null;
};

const COLUMNS: { key: string; label: string; colour: string }[] = [
  { key: "draft",     label: "Draft",     colour: "bg-warning-soft border-warning-border" },
  { key: "review",    label: "In Review", colour: "bg-info-soft border-info-border" },
  { key: "published", label: "Published", colour: "bg-success-soft border-success-border" },
];

export default function KanbanPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch all statuses
    const [drafts, reviews, published] = await Promise.all([
      fetch("/api/articles?status=draft&limit=200").then((r) => r.json()),
      fetch("/api/articles?status=review&limit=200").then((r) => r.json()),
      fetch("/api/articles?status=published&limit=200").then((r) => r.json()),
    ]);
    setArticles([
      ...(drafts.articles ?? []),
      ...(reviews.articles ?? []),
      ...(published.articles ?? []),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function promoteArticle(id: string, newStatus: string) {
    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    if (!dragging) return;
    const article = articles.find((a) => a.id === dragging);
    if (article && article.status !== targetStatus) {
      promoteArticle(dragging, targetStatus);
    }
    setDragging(null);
  }

  const grouped = COLUMNS.reduce<Record<string, Article[]>>((acc, col) => {
    acc[col.key] = articles.filter((a) => a.status === col.key);
    return acc;
  }, {});

  return (
    <Page>
      <PageHeader
        title="Article Pipeline"
        description="Drag cards between columns to change status, or use the promote buttons."
        actions={<LinkButton href="/admin">← Admin</LinkButton>}
      />

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 items-start md:grid-cols-3">
          {COLUMNS.map((col, colIdx) => (
            <div
              key={col.key}
              className={`border rounded-md p-3 min-h-[300px] ${col.colour}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-heading">{col.label}</h2>
                <span className="text-[11px] text-muted">{grouped[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].length === 0 && (
                  <p className="text-[12px] text-muted italic text-center py-4">Empty</p>
                )}
                {grouped[col.key].map((article) => (
                  <div
                    key={article.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, article.id)}
                    className="bg-surface border border-border rounded p-2.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Link
                      href={`/articles/${article.slug}`}
                      className="text-[13px] font-medium text-heading hover:text-accent block mb-1 leading-tight"
                    >
                      {article.title}
                    </Link>
                    {article.category && (
                      <span className="text-[11px] text-muted">{article.category.name}</span>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      {colIdx > 0 && (
                        <button
                          onClick={() => promoteArticle(article.id, COLUMNS[colIdx - 1].key)}
                          className="h-6 px-2 text-[11px] pointer-coarse:h-9 border border-border rounded bg-surface-hover hover:bg-surface text-muted"
                        >
                          ← {COLUMNS[colIdx - 1].label}
                        </button>
                      )}
                      {colIdx < COLUMNS.length - 1 && (
                        <button
                          onClick={() => promoteArticle(article.id, COLUMNS[colIdx + 1].key)}
                          className="h-6 px-2 text-[11px] pointer-coarse:h-9 border border-border rounded bg-surface-hover hover:bg-surface text-muted ml-auto"
                        >
                          {COLUMNS[colIdx + 1].label} →
                        </button>
                      )}
                      <Link
                        href={`/articles/${article.slug}/edit`}
                        className="h-6 px-2 text-[11px] pointer-coarse:h-9 inline-flex items-center border border-border rounded bg-surface-hover hover:bg-surface text-muted ml-auto"
                      >
                        edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
