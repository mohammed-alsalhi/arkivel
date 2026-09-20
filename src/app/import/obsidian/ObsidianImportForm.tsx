"use client";

import { useState, useRef } from "react";
import { Button, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.library, { label: "import", href: "/import" }, { label: "obsidian" }];

interface ImportResult {
  slug: string;
  title: string;
  created: boolean;
}

export default function ObsidianImportForm() {
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("select a .md or .zip file."); return; }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/import/obsidian", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "import failed. check the file and try again."); return; }
      setResults(data.results);
    } catch {
      setError("network error. please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page width="narrow" trail={TRAIL}>
      <PageHeader
        title="import from obsidian"
        description={
          <>
            upload a single <code>.md</code> file or a <code>.zip</code> vault export. front matter
            (tags, title) is preserved. wiki links (<code>[[Page Name]]</code>) are converted to internal links.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="obsidian-file" className="block text-sm font-medium mb-1">vault file (.md or .zip)</label>
          <input
            id="obsidian-file"
            ref={fileRef}
            type="file"
            accept=".md,.zip"
            className="block w-full text-sm border border-border rounded px-3 py-2 bg-surface"
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="self-start">
          {loading ? "importing…" : "import"}
        </Button>
      </form>

      {error && <p role="alert" className="mt-4 text-danger text-sm">{error}</p>}

      {results && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">
            {results.filter((r) => r.created).length} pages created,{" "}
            {results.filter((r) => !r.created).length} skipped (already exist)
          </p>
          <ul className="divide-y divide-border border border-border rounded">
            {results.map((r) => (
              <li key={r.slug} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{r.title}</span>
                <span className={r.created ? "text-success" : "text-muted"}>
                  {r.created ? "created" : "skipped"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  );
}
