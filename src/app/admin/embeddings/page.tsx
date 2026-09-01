"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, DataTable, EmptyState, LinkButton, Page, PageHeader, StatCard, StatGrid } from "@/components/ui";

interface EmbeddingStats {
  total: number;
  embedded: number;
  missing: Array<{ id: string; title: string; slug: string }>;
}

export default function EmbeddingsAdminPage() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetch("/api/ai/embeddings")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function generateAll() {
    if (!stats) return;
    setGenerating(true);
    setProgress(0);

    for (let i = 0; i < stats.missing.length; i++) {
      const article = stats.missing[i];
      await fetch("/api/ai/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      setProgress(i + 1);
    }

    // Refresh stats
    const updated = await fetch("/api/ai/embeddings").then((r) => r.json());
    setStats(updated);
    setGenerating(false);
  }

  const coverage = stats ? Math.round((stats.embedded / Math.max(1, stats.total)) * 100) : 0;

  return (
    <Page>
      <PageHeader
        title="Semantic Embeddings"
        actions={<LinkButton href="/admin">← Admin</LinkButton>}
      />

      {!stats ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <>
          <StatGrid>
            <StatCard label="Total articles" value={stats.total} />
            <StatCard label="With embeddings" value={<span className="text-success">{stats.embedded}</span>} />
            <StatCard label="Missing" value={<span className="text-warning">{stats.missing.length}</span>} />
          </StatGrid>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>Embedding coverage</span>
              <span>{coverage}%</span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>

          {stats.missing.length === 0 ? (
            <EmptyState title="All articles have embeddings." />
          ) : (
            <>
              {!process.env.NEXT_PUBLIC_OPENAI_ENABLED && (
                <div className="text-sm text-warning bg-warning-soft border border-warning-border rounded p-3 mb-4">
                  Set <code>OPENAI_API_KEY</code> to enable semantic embeddings.
                </div>
              )}
              <Button
                variant="primary"
                onClick={generateAll}
                disabled={generating}
                className="mb-4"
              >
                {generating
                  ? `Generating… (${progress}/${stats.missing.length})`
                  : `Generate all missing (${stats.missing.length})`}
              </Button>

              <DataTable>
                <thead>
                  <tr>
                    <th>Article</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.missing.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/articles/${a.slug}`} className="text-wiki-link hover:underline">
                          {a.title}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </>
          )}
        </>
      )}
    </Page>
  );
}
