"use client";

import { useState } from "react";
import { Button, DataTable, EmptyState } from "@/components/ui";

type RedirectRow = { id: string; fromSlug: string; toSlug: string; createdAt: Date | string };

export default function RedirectsManager({ initialRedirects }: { initialRedirects: RedirectRow[] }) {
  const [redirects, setRedirects] = useState<RedirectRow[]>(initialRedirects);
  const [fromSlug, setFromSlug] = useState("");
  const [toSlug, setToSlug] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromSlug: fromSlug.trim(), toSlug: toSlug.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
      } else {
        const newRedirect = await res.json();
        setRedirects((prev) => {
          const existing = prev.findIndex((r) => r.id === newRedirect.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newRedirect;
            return updated;
          }
          return [newRedirect, ...prev];
        });
        setFromSlug("");
        setToSlug("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch("/api/admin/redirects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRedirects((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From slug (old)</label>
          <input
            value={fromSlug}
            onChange={(e) => setFromSlug(e.target.value)}
            placeholder="old-article-slug"
            required
            className="h-8 px-2 text-sm border border-border rounded bg-background w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To slug (new)</label>
          <input
            value={toSlug}
            onChange={(e) => setToSlug(e.target.value)}
            placeholder="new-article-slug"
            required
            className="h-8 px-2 text-sm border border-border rounded bg-background w-48"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add redirect"}
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </form>

      {/* Table */}
      {redirects.length === 0 ? (
        <EmptyState title="No redirects yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>From slug</th>
              <th>To slug</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {redirects.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.fromSlug}</td>
                <td className="font-mono text-xs">{r.toSlug}</td>
                <td className="text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-destructive hover:underline pointer-coarse:py-2 pointer-coarse:px-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
