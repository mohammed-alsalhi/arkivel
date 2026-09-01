"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminContext";
import { Page, PageHeader, SectionPanel } from "@/components/ui";

type ImportResult = {
  filename: string;
  success: boolean;
  title?: string;
  slug?: string;
  error?: string;
};

const ACCEPTED = ".md,.markdown,.txt,.text,.html,.htm,.json,.xml";

type UrlImportResult = { title: string; html: string; sourceUrl: string };

export default function ImportPage() {
  const isAdmin = useAdmin();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // URL import state
  const [urlInput, setUrlInput] = useState("");
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlResult, setUrlResult] = useState<UrlImportResult | null>(null);
  const [urlError, setUrlError] = useState("");

  // Image import state
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageImporting, setImageImporting] = useState(false);
  const [imageResult, setImageResult] = useState<UrlImportResult | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageDragOver, setImageDragOver] = useState(false);

  // YouTube import state
  const [ytUrl, setYtUrl] = useState("");
  const [ytImporting, setYtImporting] = useState(false);
  const [ytResult, setYtResult] = useState<UrlImportResult | null>(null);
  const [ytError, setYtError] = useState("");

  if (!isAdmin) {
    return (
      <Page>
        <PageHeader title="Import Articles" />
        <div className="wiki-notice">
          You must be{" "}
          <Link href="/admin">logged in as admin</Link> to import articles.
        </div>
      </Page>
    );
  }

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["md", "markdown", "txt", "text", "html", "htm", "json", "xml"].includes(
        ext || ""
      );
    });
    setFiles((prev) => [...prev, ...arr]);
    setResults(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatBadge(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
      md: "MD",
      markdown: "MD",
      txt: "TXT",
      text: "TXT",
      html: "HTML",
      htm: "HTML",
      json: "JSON",
      xml: "XML",
    };
    return map[ext] || ext.toUpperCase();
  }

  async function handleImport() {
    setImporting(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/articles/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResults(data.results);
      setFiles([]);
    } catch {
      setResults([
        { filename: "upload", success: false, error: "Network error" },
      ]);
    } finally {
      setImporting(false);
    }
  }

  async function handleUrlImport() {
    if (!urlInput.trim()) return;
    setUrlImporting(true);
    setUrlError("");
    setUrlResult(null);
    try {
      const res = await fetch("/api/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setUrlError(data.error || "Import failed"); return; }
      setUrlResult(data);
    } catch {
      setUrlError("Network error");
    } finally {
      setUrlImporting(false);
    }
  }

  function handleCreateFromUrl() {
    if (!urlResult) return;
    try {
      sessionStorage.setItem("wiki_url_import_draft", JSON.stringify({
        title: urlResult.title,
        html: urlResult.html,
      }));
    } catch { /* noop */ }
    router.push("/articles/new?from=url-import");
  }

  async function handleYouTubeImport() {
    if (!ytUrl.trim()) return;
    setYtImporting(true);
    setYtError("");
    setYtResult(null);
    try {
      const res = await fetch("/api/import/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setYtError(data.error || "Import failed"); return; }
      setYtResult(data);
    } catch {
      setYtError("Network error");
    } finally {
      setYtImporting(false);
    }
  }

  function handleCreateFromYouTube() {
    if (!ytResult) return;
    try {
      sessionStorage.setItem("wiki_url_import_draft", JSON.stringify({ title: ytResult.title, html: ytResult.html }));
    } catch { /* noop */ }
    router.push("/articles/new?from=url-import");
  }

  async function handleImageImport() {
    if (!imageFile) return;
    setImageImporting(true);
    setImageError("");
    setImageResult(null);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/import/image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setImageError(data.error || "Import failed"); return; }
      setImageResult(data);
    } catch {
      setImageError("Network error");
    } finally {
      setImageImporting(false);
    }
  }

  function handleCreateFromImage() {
    if (!imageResult) return;
    try {
      sessionStorage.setItem("wiki_url_import_draft", JSON.stringify({
        title: imageResult.title,
        html: imageResult.html,
      }));
    } catch { /* noop */ }
    router.push("/articles/new?from=url-import");
  }

  return (
    <Page>
      <PageHeader title="Import Articles" />

      <SectionPanel className="mb-4" title="Upload Files">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-accent bg-accent/5"
                : "border-border hover:border-muted"
            }`}
          >
            <p className="text-[14px] text-foreground mb-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-[12px] text-muted">
              Supported: Markdown (.md), Text (.txt), HTML (.html), JSON (.json), MediaWiki XML (.xml)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3">
              <div className="text-[12px] text-muted mb-1">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </div>
              <ul className="divide-y divide-border border border-border text-[13px]">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block bg-surface-hover border border-border px-1.5 py-0.5 text-[10px] font-mono">
                        {formatBadge(file.name)}
                      </span>
                      <span>{file.name}</span>
                      <span className="text-muted text-[11px]">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-muted hover:text-foreground text-[12px]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="ui-button ui-button-primary"
                >
                  {importing ? "Importing..." : `Import ${files.length} file${files.length !== 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={() => setFiles([])}
                  className="ui-button"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
      </SectionPanel>

      {/* Results */}
      {results && (
        <SectionPanel title="Import Results" bodyClassName="p-0">
            <ul className="divide-y divide-border text-[13px]">
              {results.map((result, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        result.success ? "text-success" : "text-danger"
                      }
                    >
                      {result.success ? "\u2713" : "\u2717"}
                    </span>
                    <span className="text-muted">{result.filename}</span>
                    {result.title && (
                      <span className="font-medium">{result.title}</span>
                    )}
                  </span>
                  {result.success && result.slug ? (
                    <Link
                      href={`/articles/${result.slug}`}
                      className="text-[12px]"
                    >
                      View article
                    </Link>
                  ) : (
                    <span className="text-[12px] text-danger">
                      {result.error}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 border-t border-border text-[12px] text-muted">
              {results.filter((r) => r.success).length} of {results.length}{" "}
              imported successfully
            </div>
        </SectionPanel>
      )}

      {/* URL Import */}
      <SectionPanel className="mb-4" title="Import from URL" bodyClassName="space-y-3">
          <p className="text-[12px] text-muted">
            Paste any public URL — article, Wikipedia page, documentation, blog post — and AI will extract and reformat the content as a wiki article draft.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
              placeholder="https://en.wikipedia.org/wiki/..."
              className="flex-1 border border-border bg-surface px-3 py-1.5 text-[13px] focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleUrlImport}
              disabled={urlImporting || !urlInput.trim()}
              className="ui-button ui-button-primary"
            >
              {urlImporting ? "Fetching…" : "Import"}
            </button>
          </div>

          {urlError && (
            <div className="text-danger text-[13px] p-3 bg-danger-soft border border-danger-border rounded">
              {urlError}
            </div>
          )}

          {urlResult && (
            <div className="space-y-3">
              <div className="border border-border rounded p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted uppercase font-medium mb-0.5">Generated title</p>
                    <p className="text-[15px] font-semibold text-heading">{urlResult.title}</p>
                  </div>
                  <a href={urlResult.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-muted hover:text-foreground underline">
                    Source ↗
                  </a>
                </div>
                <div
                  className="prose prose-sm max-w-none border-t border-border pt-3 text-[13px] leading-relaxed max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: urlResult.html }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFromUrl}
                  className="ui-button ui-button-primary"
                >
                  Open in editor
                </button>
                <button
                  onClick={() => { setUrlResult(null); setUrlInput(""); }}
                  className="ui-button"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
      </SectionPanel>

      {/* YouTube Import */}
      <SectionPanel className="mb-4" title="Import from YouTube" bodyClassName="space-y-3">
          <p className="text-[12px] text-muted">
            Paste a YouTube URL. AI fetches the video transcript and formats it as a structured wiki article.
            Works with any video that has auto-generated or manual captions.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleYouTubeImport()}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 border border-border bg-surface px-3 py-1.5 text-[13px] focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleYouTubeImport}
              disabled={ytImporting || !ytUrl.trim()}
              className="ui-button ui-button-primary"
            >
              {ytImporting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Fetching…
                </>
              ) : "Import"}
            </button>
          </div>

          {ytError && (
            <div className="text-danger text-[13px] p-3 bg-danger-soft border border-danger-border rounded">{ytError}</div>
          )}

          {ytResult && (
            <div className="space-y-3">
              <div className="border border-border rounded p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted uppercase font-medium mb-0.5">Video title</p>
                    <p className="text-[15px] font-semibold text-heading">{ytResult.title}</p>
                  </div>
                  <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted hover:text-foreground underline">
                    Watch ↗
                  </a>
                </div>
                <div
                  className="prose prose-sm max-w-none border-t border-border pt-3 text-[13px] leading-relaxed max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: ytResult.html }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateFromYouTube} className="ui-button ui-button-primary">
                  Open in editor
                </button>
                <button onClick={() => { setYtResult(null); setYtUrl(""); }} className="ui-button">
                  Clear
                </button>
              </div>
            </div>
          )}
      </SectionPanel>

      {/* Image Import */}
      <SectionPanel className="mb-4" title="Import from Image" bodyClassName="space-y-3">
          <p className="text-[12px] text-muted">
            Upload a photo of handwritten notes, a whiteboard, a book page, or a screenshot. Claude Vision will extract and structure the content as a wiki article.
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
            onDragLeave={() => setImageDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setImageDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) { setImageFile(f); setImageResult(null); setImageError(""); }
            }}
            onClick={() => imageInputRef.current?.click()}
            className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
              imageDragOver ? "border-accent bg-accent/5" : "border-border hover:border-muted"
            }`}
          >
            {imageFile ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-[13px] font-medium">{imageFile.name}</p>
                  <p className="text-[11px] text-muted">{(imageFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setImageFile(null); setImageResult(null); }}
                  className="text-[11px] text-muted hover:text-danger ml-2 pointer-coarse:py-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <p className="text-[14px] text-foreground mb-1">Drop image here or click to browse</p>
                <p className="text-[12px] text-muted">JPEG, PNG, WebP, GIF</p>
              </>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImageResult(null); setImageError(""); }
                e.target.value = "";
              }}
            />
          </div>

          {imageFile && !imageResult && (
            <button
              onClick={handleImageImport}
              disabled={imageImporting}
              className="ui-button ui-button-primary"
            >
              {imageImporting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Analysing image…
                </span>
              ) : "Extract content"}
            </button>
          )}

          {imageError && (
            <div className="text-danger text-[13px] p-3 bg-danger-soft border border-danger-border rounded">{imageError}</div>
          )}

          {imageResult && (
            <div className="space-y-3">
              <div className="border border-border rounded p-4 space-y-2">
                <p className="text-[11px] text-muted uppercase font-medium">Generated title</p>
                <p className="text-[15px] font-semibold text-heading">{imageResult.title}</p>
                <div
                  className="prose prose-sm max-w-none border-t border-border pt-3 text-[13px] leading-relaxed max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: imageResult.html }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFromImage}
                  className="ui-button ui-button-primary"
                >
                  Open in editor
                </button>
                <button
                  onClick={() => { setImageResult(null); setImageFile(null); }}
                  className="ui-button"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
      </SectionPanel>

      {/* Other import sources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-4">
        <a
          href="/import/obsidian"
          className="border border-border rounded p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="font-medium mb-1">Obsidian Vault</div>
          <div className="text-xs text-muted">
            Import .md files or a .zip vault with front matter and [[wiki links]]
          </div>
        </a>
        <a
          href="/import/notion"
          className="border border-border rounded p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="font-medium mb-1">Notion Page</div>
          <div className="text-xs text-muted">
            Import a Notion page via integration token — headings, lists, and images preserved
          </div>
        </a>
      </div>

      {/* Help section */}
      <div className="wiki-notice mt-4">
        <strong>File formats:</strong>
        <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[13px]">
          <li>
            <strong>Markdown</strong> (.md) — Title from frontmatter{" "}
            (<code className="bg-surface-hover px-1 text-[12px]">
              title: My Article
            </code>
            ), first heading, or filename
          </li>
          <li>
            <strong>Text</strong> (.txt) — Title from filename, content wrapped
            in paragraphs
          </li>
          <li>
            <strong>HTML</strong> (.html) — Title from{" "}
            <code className="bg-surface-hover px-1 text-[12px]">
              &lt;title&gt;
            </code>{" "}
            or{" "}
            <code className="bg-surface-hover px-1 text-[12px]">
              &lt;h1&gt;
            </code>
            , body content imported as-is
          </li>
          <li>
            <strong>JSON</strong> (.json) — Object or array with{" "}
            <code className="bg-surface-hover px-1 text-[12px]">title</code>,{" "}
            <code className="bg-surface-hover px-1 text-[12px]">content</code>,
            optional{" "}
            <code className="bg-surface-hover px-1 text-[12px]">
              format: &quot;markdown&quot;
            </code>
          </li>
          <li>
            <strong>MediaWiki XML</strong> (.xml) — Standard MediaWiki export
            format with{" "}
            <code className="bg-surface-hover px-1 text-[12px]">
              &lt;page&gt;
            </code>{" "}
            elements containing title and revision text
          </li>
        </ul>
      </div>
    </Page>
  );
}
