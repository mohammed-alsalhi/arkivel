"use client";

import { useState, useRef } from "react";
import { Page, PageHeader } from "@/components/ui";

interface ImportResult {
  slug: string;
  title: string;
  created: boolean;
}

export default function ObsidianImportPage() {
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Select a .md or .zip file."); return; }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/import/obsidian", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Import failed"); return; }
      setResults(data.results);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page width="narrow">
      <PageHeader
        title="Import from Obsidian"
        description={
          <>
            Upload a single <code>.md</code> file or a <code>.zip</code> vault export. Front matter
            (tags, title) is preserved. Wiki links (<code>[[Page Name]]</code>) are converted to internal links.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vault file (.md or .zip)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.zip"
            className="block w-full text-sm border border-border rounded px-3 py-2 bg-surface"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="ui-button ui-button-primary self-start"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </form>

      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      {results && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">
            {results.filter((r) => r.created).length} articles created,{" "}
            {results.filter((r) => !r.created).length} skipped (already exist)
          </p>
          <ul className="divide-y divide-border border border-border rounded">
            {results.map((r) => (
              <li key={r.slug} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{r.title}</span>
                <span className={r.created ? "text-success" : "text-muted"}>
                  {r.created ? "Created" : "Skipped"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
