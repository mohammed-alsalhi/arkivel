"use client";

import { useState, useEffect } from "react";
import { Button, Notice, Page, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function ExportPage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [scope, setScope] = useState<"all" | "category">("all");
  const [categorySlug, setCategorySlug] = useState("");
  const [format, setFormat] = useState<"markdown" | "html" | "zip">("markdown");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scope === "category" && categorySlug) {
        params.set("category", categorySlug);
      }

      const endpoint =
        format === "markdown" ? "/api/export/markdown" :
        format === "zip"      ? "/api/export/zip" :
                                "/api/export/html";

      const url = `${endpoint}?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const base = scope === "category" ? `wiki-export-${categorySlug}` : "wiki-export";
      a.download = format === "markdown" ? `${base}.md`
                 : format === "zip"      ? `${base}.zip`
                 :                         `${base}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      addToast("Export failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Export Wiki" />

      <Notice>
        Export your wiki articles as a single downloadable file. Choose the scope
        and format below.
      </Notice>

      <div className="max-w-lg space-y-4">
        {/* Scope selection */}
        <fieldset className="border border-border p-3">
          <legend className="px-2 text-[12px] font-bold text-muted uppercase">
            Scope
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              Entire wiki
            </label>
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="category"
                checked={scope === "category"}
                onChange={() => setScope("category")}
              />
              By category
            </label>

            {scope === "category" && (
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="ml-6 w-full max-w-xs border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        {/* Format selection */}
        <fieldset className="border border-border p-3">
          <legend className="px-2 text-[12px] font-bold text-muted uppercase">
            Format
          </legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="format"
                value="markdown"
                checked={format === "markdown"}
                onChange={() => setFormat("markdown")}
              />
              Markdown (.md)
              <span className="text-[11px] text-muted">
                &mdash; plain text, good for backups
              </span>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="format"
                value="html"
                checked={format === "html"}
                onChange={() => setFormat("html")}
              />
              HTML (.html)
              <span className="text-[11px] text-muted">
                &mdash; styled, with table of contents
              </span>
            </label>
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="format"
                value="zip"
                checked={format === "zip"}
                onChange={() => setFormat("zip")}
              />
              ZIP archive (.zip)
              <span className="text-[11px] text-muted">
                &mdash; one Markdown file per article, organised by category
              </span>
            </label>
          </div>
        </fieldset>

        {/* Download button */}
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={loading || (scope === "category" && !categorySlug)}
        >
          {loading ? "Exporting..." : "Download"}
        </Button>

        {loading && (
          <p className="text-[12px] text-muted italic">
            Preparing export, please wait...
          </p>
        )}
      </div>
    </Page>
  );
}
