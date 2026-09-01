"use client";

import { useState } from "react";
import { Page, PageHeader } from "@/components/ui";

export default function NotionImportPage() {
  const [accessToken, setAccessToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slug?: string; title?: string; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/import/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, pageId }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page width="narrow">
      <PageHeader
        title="Import from Notion"
        description="Enter your Notion integration token and the page ID to import. The page will be created as a draft article."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Integration token</label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="secret_…"
            className="block w-full text-sm border border-border rounded px-3 py-2 bg-surface"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Page ID</label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="32-character page ID from the URL"
            className="block w-full text-sm border border-border rounded px-3 py-2 bg-surface"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="ui-button ui-button-primary self-start"
        >
          {loading ? "Importing…" : "Import page"}
        </button>
      </form>

      {result?.error && <p className="mt-4 text-danger text-sm">{result.error}</p>}
      {result?.slug && (
        <p className="mt-4 text-success text-sm">
          Imported as draft:{" "}
          <a href={`/articles/${result.slug}`} className="underline">
            {result.title}
          </a>
        </p>
      )}
    </Page>
  );
}
