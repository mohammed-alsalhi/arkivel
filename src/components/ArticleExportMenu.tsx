"use client";

import { useState, useRef } from "react";
import { config } from "@/lib/config";
import { useOutsideClick } from "@/lib/useOutsideClick";

interface Props {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  contentRaw: string | null;
  contentHtml: string;
}

export default function ArticleExportMenu({ articleId, articleSlug, articleTitle, contentRaw, contentHtml }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false));

  function exportPdf() {
    setOpen(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${escapeHtml(articleTitle)} - ${escapeHtml(config.name)}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #202122; }
        h1 { font-size: 1.6rem; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; }
        h2 { font-size: 1.3rem; border-bottom: 1px solid #a2a9b1; padding-bottom: 3px; }
        h3 { font-size: 1.1rem; }
        img { max-width: 100%; }
        a { color: #0645ad; }
        ul, ol { padding-left: 2rem; }
        blockquote { border-left: 3px solid #c8ccd1; padding-left: 1rem; color: #54595d; font-style: italic; }
      </style></head>
      <body><h1>${escapeHtml(articleTitle)}</h1>${contentHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function exportMarkdown() {
    setOpen(false);
    const content = contentRaw || htmlToMarkdownFallback(contentHtml);
    const blob = new Blob([`# ${articleTitle}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${articleSlug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRemote(format: "epub" | "docx") {
    setOpen(false);
    window.location.href = `/api/export/${format}?id=${articleId}`;
  }

  const items = [
    { label: "PDF",           action: exportPdf },
    { label: "Markdown",      action: exportMarkdown },
    { label: "ePub",          action: () => exportRemote("epub") },
    { label: "Word (.docx)",  action: () => exportRemote("docx") },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="ui-button"
        aria-haspopup="true"
        aria-expanded={open}
        title="Export article"
      >
        Export
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ui-dropdown min-w-[130px]">
          {items.map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="ui-dropdown-item"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlToMarkdownFallback(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}
