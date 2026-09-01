"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, EmptyState, Page, PageHeader, ToggleSwitch } from "@/components/ui";

export const dynamic = "force-dynamic";

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  alertEnabled: boolean;
  createdAt: string;
};

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/saved-searches");
    if (res.ok) setSearches(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAlert(s: SavedSearch) {
    const res = await fetch(`/api/saved-searches?id=${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled: !s.alertEnabled }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSearches((prev) => prev.map((x) => (x.id === updated.id ? { ...x, alertEnabled: updated.alertEnabled } : x)));
    }
  }

  async function deleteSearch(id: string) {
    const res = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    if (res.ok) setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <Page>
      <PageHeader
        title="Saved searches"
        description="Enable alerts to receive an in-app notification when new articles match a saved search."
      />

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : searches.length === 0 ? (
        <EmptyState
          title="No saved searches yet."
          description={
            <>
              <Link href="/search" className="text-wiki-link hover:underline">
                Search something
              </Link>{" "}
              and save it with the &ldquo;Save search&rdquo; button.
            </>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Query</th>
              <th className="text-center">Alert</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-muted font-mono text-[12px]">
                  <Link href={`/search?q=${encodeURIComponent(s.query)}`} className="text-wiki-link hover:underline">
                    {s.query}
                  </Link>
                </td>
                <td className="text-center">
                  <ToggleSwitch
                    checked={s.alertEnabled}
                    onClick={() => toggleAlert(s)}
                    title={s.alertEnabled ? "Disable alert" : "Enable alert"}
                  />
                </td>
                <td>
                  <button
                    onClick={() => deleteSearch(s.id)}
                    className="text-[11px] text-muted hover:text-danger transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}
