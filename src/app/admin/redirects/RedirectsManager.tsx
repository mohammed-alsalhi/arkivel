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
        setError(data.error || "could not save the redirect. check both slugs and try again.");
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

  async function handleDelete(r: RedirectRow) {
    if (!confirm(`delete the redirect from ${r.fromSlug} to ${r.toSlug}?`)) return;
    await fetch("/api/admin/redirects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id }),
    });
    setRedirects((prev) => prev.filter((row) => row.id !== r.id));
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-none">
          <label htmlFor="redirect-from" className="text-xs text-muted-foreground">from slug (old)</label>
          <input
            id="redirect-from"
            value={fromSlug}
            onChange={(e) => setFromSlug(e.target.value)}
            placeholder="old-page-slug"
            required
            className="h-8 px-2 text-sm border border-border rounded bg-background w-full sm:w-48"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-none">
          <label htmlFor="redirect-to" className="text-xs text-muted-foreground">to slug (new)</label>
          <input
            id="redirect-to"
            value={toSlug}
            onChange={(e) => setToSlug(e.target.value)}
            placeholder="new-page-slug"
            required
            className="h-8 px-2 text-sm border border-border rounded bg-background w-full sm:w-48"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "saving…" : "add redirect"}
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </form>

      {/* Table */}
      {redirects.length === 0 ? (
        <EmptyState
          title="no redirects yet"
          description="add one above to send an old slug to its new page."
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>from slug</th>
              <th>to slug</th>
              <th>created</th>
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
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="text-xs text-destructive hover:underline"
                  >
                    delete
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
