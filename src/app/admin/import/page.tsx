"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Button, Page, PageHeader, SectionPanel } from "@/components/ui";

type ImportedArticle = { id: string; title: string; slug: string };

const JSON_EXAMPLE = JSON.stringify(
  [
    {
      title: "Example Article",
      slug: "example-article",
      content: "<p>Article body in HTML.</p>",
      excerpt: "Short summary.",
      status: "published",
      categorySlug: "general",
      tags: ["tag-one", "tag-two"],
    },
  ],
  null,
  2
);

export default function ImportPage() {
  // ── Bulk JSON ────────────────────────────────────────────────────────────────
  const [jsonText, setJsonText] = useState("");
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonResult, setJsonResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [jsonError, setJsonError] = useState("");
  const jsonFileRef = useRef<HTMLInputElement>(null);

  function loadJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
    e.target.value = "";
  }

  async function runJsonImport() {
    setJsonError("");
    setJsonResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("Invalid JSON — check syntax before importing.");
      return;
    }
    if (!Array.isArray(parsed)) {
      setJsonError("JSON must be an array of article objects.");
      return;
    }
    setJsonLoading(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) setJsonError(data.error ?? "Import failed.");
      else setJsonResult(data);
    } catch {
      setJsonError("Network error.");
    } finally {
      setJsonLoading(false);
    }
  }

  // ── Confluence ──────────────────────────────────────────────────────────────
  const [confHtml, setConfHtml] = useState("");
  const [confCategory, setConfCategory] = useState("");
  const [confLoading, setConfLoading] = useState(false);
  const [confResult, setConfResult] = useState<ImportedArticle | null>(null);
  const [confError, setConfError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setConfHtml((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  async function importConfluence() {
    if (!confHtml.trim()) { setConfError("Paste or upload HTML first"); return; }
    setConfLoading(true);
    setConfError("");
    setConfResult(null);
    const res = await fetch("/api/import/confluence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: confHtml, categoryId: confCategory || undefined }),
    });
    setConfLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setConfError(d.error ?? "Import failed");
    } else {
      setConfResult(await res.json());
      setConfHtml("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Page>
      <PageHeader title="Import" />

      {/* ── Bulk JSON ───────────────────────────────────────────────────────── */}
      <SectionPanel className="mb-6" title="Bulk JSON import" bodyClassName="space-y-3">
          <p className="text-[12px] text-muted">
            Import an array of articles from a <code>.json</code> file.
            Required field: <code>title</code>.
            Optional: <code>slug</code>, <code>content</code> (HTML), <code>contentRaw</code> (Markdown),
            <code>excerpt</code>, <code>status</code> (draft/review/published),
            <code>categorySlug</code>, <code>tags</code> (array of names).
            Existing slugs are skipped. Tags are auto-created. Max 500 per import.
          </p>

          <div className="flex items-center gap-2">
            <Button onClick={() => jsonFileRef.current?.click()}>
              Load .json file
            </Button>
            <Button onClick={() => setJsonText(JSON_EXAMPLE)} className="text-muted">
              Load example
            </Button>
            <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={loadJsonFile} />
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            placeholder={`Paste JSON array…\n\n${JSON_EXAMPLE}`}
            className="w-full border border-border bg-surface px-2 py-1 text-[11px] font-mono focus:border-accent focus:outline-none"
          />

          {jsonError && <p className="text-[12px] text-danger">{jsonError}</p>}
          {jsonResult && (
            <div className="text-[12px] space-y-0.5">
              <p className="text-success">✓ Created {jsonResult.created} article{jsonResult.created !== 1 ? "s" : ""}</p>
              {jsonResult.skipped > 0 && <p className="text-warning">Skipped {jsonResult.skipped}</p>}
              {jsonResult.errors.length > 0 && (
                <ul className="text-muted max-h-32 overflow-y-auto space-y-0.5">
                  {jsonResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}

          <Button variant="primary" onClick={runJsonImport} disabled={jsonLoading || !jsonText.trim()}>
            {jsonLoading ? "Importing…" : "Run JSON import"}
          </Button>
      </SectionPanel>

      {/* ── Confluence ──────────────────────────────────────────────────────── */}
      <SectionPanel className="mb-6" title="Confluence HTML export" bodyClassName="space-y-3">
          <p className="text-[12px] text-muted">
            Export a single page from Confluence (<strong>Space Tools → Content Tools → Export → HTML</strong>),
            then paste or upload the resulting <code>.html</code> file.
            The page is imported as a <strong>draft</strong> article.
          </p>

          <div>
            <label className="block text-[11px] text-muted font-bold mb-0.5">Upload HTML file</label>
            <input ref={fileRef} type="file" accept=".html,.htm" onChange={handleFile}
              className="text-[12px]" />
          </div>

          <div>
            <label className="block text-[11px] text-muted font-bold mb-0.5">
              — or paste HTML directly —
            </label>
            <textarea
              value={confHtml}
              onChange={(e) => setConfHtml(e.target.value)}
              rows={6}
              placeholder="<html>…</html>"
              className="w-full border border-border bg-surface px-2 py-1 text-[11px] font-mono focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-muted font-bold mb-0.5">Category ID (optional)</label>
            <input
              value={confCategory}
              onChange={(e) => setConfCategory(e.target.value)}
              placeholder="Leave blank for uncategorised"
              className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
            />
          </div>

          {confError && <p className="text-[12px] text-danger">{confError}</p>}
          {confResult && (
            <p className="text-[12px] text-success">
              Imported as draft:{" "}
              <Link href={`/articles/${confResult.slug}/edit`} className="underline font-medium">
                {confResult.title}
              </Link>
            </p>
          )}

          <Button onClick={importConfluence} disabled={confLoading}>
            {confLoading ? "Importing…" : "Import page"}
          </Button>
      </SectionPanel>

      {/* ── Other importers notice ──────────────────────────────────────────── */}
      <div className="wiki-notice text-[12px]">
        <strong>Other importers:</strong> Use the API directly at{" "}
        <code className="bg-surface-hover px-1 rounded">/api/import/notion</code> (Notion) and{" "}
        <code className="bg-surface-hover px-1 rounded">/api/import/obsidian</code> (Obsidian Markdown vault).
      </div>
    </Page>
  );
}

export const dynamic = "force-dynamic";
