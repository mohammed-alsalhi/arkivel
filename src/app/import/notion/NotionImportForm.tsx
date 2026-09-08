"use client";

import { useState } from "react";
import { Button, Input, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.library, { label: "import", href: "/import" }, { label: "notion" }];

export default function NotionImportForm() {
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
      setResult({ error: "network error. please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page width="narrow" trail={TRAIL}>
      <PageHeader
        title="import from notion"
        description="enter your notion integration token and the page id to import. the page will be created as a draft page."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="notion-token" className="block text-sm font-medium mb-1">integration token</label>
          <Input
            id="notion-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="secret_…"
            required
          />
        </div>
        <div>
          <label htmlFor="notion-page-id" className="block text-sm font-medium mb-1">page id</label>
          <Input
            id="notion-page-id"
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="32-character page id from the url"
            required
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="self-start">
          {loading ? "importing…" : "import page"}
        </Button>
      </form>

      {result?.error && <p role="alert" className="mt-4 text-danger text-sm">{result.error}</p>}
      {result?.slug && (
        <p className="mt-4 text-success text-sm">
          imported as draft:{" "}
          <a href={`/articles/${result.slug}`} className="underline">
            {result.title}
          </a>
        </p>
      )}
    </Page>
  );
}
