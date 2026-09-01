"use client";

import { useState } from "react";
import { Button, Page, PageHeader } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

export default function PruneRevisionsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [keep, setKeep] = useState(50);
  const [preview, setPreview] = useState<{ totalWouldDelete: number; affectedArticles: number } | null>(null);
  const [result, setResult] = useState<{ deleted: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pruning, setPruning] = useState(false);

  async function handlePreview() {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/admin/prune-revisions?keep=${keep}`);
    if (res.ok) setPreview(await res.json());
    setLoading(false);
  }

  async function handlePrune() {
    if (!(await confirm(`Delete ${preview?.totalWouldDelete} revisions? This cannot be undone.`, { title: "Prune revisions", confirmLabel: "Delete", danger: true }))) return;
    setPruning(true);
    const res = await fetch("/api/admin/prune-revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setPreview(null);
    }
    setPruning(false);
  }

  return (
    <Page width="narrow">
      <PageHeader title="Revision Pruning" />

      <div className="border border-border rounded p-4 bg-surface space-y-4">
        <p className="text-[13px] text-muted">
          Delete old revision history beyond a threshold. Only the most recent <strong>N</strong> revisions are kept per article.
          This cannot be undone — make sure you have a backup.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-[13px] text-foreground">Keep latest</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={keep}
            onChange={(e) => { setKeep(parseInt(e.target.value, 10) || 1); setPreview(null); }}
            className="w-20 border border-border bg-background px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
          />
          <span className="text-[13px] text-foreground">revisions per article</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePreview} disabled={loading}>
            {loading ? "Calculating…" : "Preview"}
          </Button>
          {preview && preview.totalWouldDelete > 0 && (
            <Button variant="danger" onClick={handlePrune} disabled={pruning}>
              {pruning ? "Pruning…" : `Delete ${preview.totalWouldDelete} revisions`}
            </Button>
          )}
        </div>

        {preview && (
          <div className={`rounded px-3 py-2 text-[12px] ${preview.totalWouldDelete === 0 ? "bg-success-soft border border-success-border text-success" : "bg-warning-soft border border-warning-border text-warning"}`}>
            {preview.totalWouldDelete === 0
              ? "No revisions to prune — all articles are within the threshold."
              : `${preview.totalWouldDelete} revisions across ${preview.affectedArticles} article(s) would be deleted.`}
          </div>
        )}

        {result && (
          <div className="rounded bg-success-soft border border-success-border px-3 py-2 text-[12px] text-success">
            Pruned {result.deleted} revision(s) successfully.
          </div>
        )}
      </div>
      {confirmDialog}
    </Page>
  );
}

export const dynamic = "force-dynamic";
