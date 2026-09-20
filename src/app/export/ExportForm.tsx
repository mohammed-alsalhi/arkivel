"use client";

import { useEffect, useState } from "react";
import { Button, Page, PageHeader, Select } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.library, { label: "export" }];

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function ExportForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [scope, setScope] = useState<"all" | "category">("all");
  const [categorySlug, setCategorySlug] = useState("");
  const [format, setFormat] = useState<"markdown" | "zip">("markdown");
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

      const endpoint = format === "markdown" ? "/api/export/markdown" : "/api/export/zip";

      const url = `${endpoint}?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("export failed");
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const base = scope === "category" ? `wiki-export-${categorySlug}` : "wiki-export";
      a.download = format === "markdown" ? `${base}.md` : `${base}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      alert("export failed. please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page trail={TRAIL}>
      <PageHeader
        title="export"
        description="export your wiki pages as a single downloadable file. choose the scope and format below."
      />

      <div className="max-w-lg space-y-4">
        {/* Scope selection */}
        <fieldset className="border border-border p-3">
          <legend className="px-2 text-[12px] font-bold text-muted">
            scope
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
              entire wiki
            </label>
            <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="category"
                checked={scope === "category"}
                onChange={() => setScope("category")}
              />
              by space
            </label>

            {scope === "category" && (
              <Select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="ml-6 max-w-xs"
              >
                <option value="">select a space…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </fieldset>

        {/* Format selection */}
        <fieldset className="border border-border p-3">
          <legend className="px-2 text-[12px] font-bold text-muted">
            format
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
              markdown (.md)
              <span className="text-[11px] text-muted">
                &mdash; one readable file, useful for backups
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
              zip archive (.zip)
              <span className="text-[11px] text-muted">
                &mdash; one markdown file per page, organized by space
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
          {loading ? "exporting…" : "download"}
        </Button>

        {loading && (
          <p className="text-[12px] text-muted italic">
            preparing the export…
          </p>
        )}
      </div>
    </Page>
  );
}
