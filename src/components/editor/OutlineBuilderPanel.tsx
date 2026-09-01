"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
  articleTitle?: string;
}

type OutlineStyle = "encyclopedic" | "tutorial" | "reference";

export default function OutlineBuilderPanel({ editor, articleTitle = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(articleTitle);
  const [summary, setSummary] = useState("");
  const [style, setStyle] = useState<OutlineStyle>("encyclopedic");
  const [outline, setOutline] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai" | "template" | null>(null);

  async function generate() {
    if (!title.trim()) return;
    setLoading(true);
    setOutline([]);
    try {
      const res = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), summary: summary.trim(), style }),
      });
      const data = await res.json();
      if (data.outline && Array.isArray(data.outline)) {
        setOutline(data.outline);
        setSource(data.source ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  function insertOutline() {
    if (!editor || outline.length === 0) return;
    // Convert heading strings to Tiptap HTML nodes
    const html = outline
      .map((line) => {
        const h3 = line.startsWith("### ");
        const h2 = line.startsWith("## ");
        const text = line.replace(/^#{2,3}\s+/, "");
        const level = h3 ? 3 : h2 ? 2 : 2;
        return `<h${level}>${text}</h${level}><p></p>`;
      })
      .join("");
    editor.chain().focus().insertContent(html).run();
    setOpen(false);
  }

  return (
    <div className="border-t border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-muted hover:text-foreground hover:bg-surface-hover"
      >
        <span className="font-medium">Outline Builder</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">Article title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title…"
                className="w-full h-6 pointer-coarse:h-9 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-0.5">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as OutlineStyle)}
                className="h-6 pointer-coarse:h-9 px-1.5 text-[12px] border border-border rounded bg-surface focus:outline-none"
              >
                <option value="encyclopedic">Encyclopedic</option>
                <option value="tutorial">Tutorial</option>
                <option value="reference">Reference</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted mb-0.5">Brief description (optional)</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One sentence about the topic…"
              className="w-full h-6 pointer-coarse:h-9 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={loading || !title.trim()}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate outline"}
            </button>
            {outline.length > 0 && (
              <button
                type="button"
                onClick={insertOutline}
                className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-accent rounded text-accent hover:bg-accent hover:text-accent-foreground"
              >
                Insert into article
              </button>
            )}
          </div>

          {outline.length > 0 && (
            <div>
              {source === "template" && (
                <p className="text-[10px] text-muted italic mb-1">Template outline (configure AI_API_KEY for AI-generated outlines)</p>
              )}
              <ol className="space-y-0.5">
                {outline.map((line, i) => {
                  const isH3 = line.startsWith("### ");
                  const text = line.replace(/^#{2,3}\s+/, "");
                  return (
                    <li
                      key={i}
                      className={`text-[12px] ${isH3 ? "pl-4 text-muted" : "font-medium text-foreground"}`}
                    >
                      {isH3 ? "↳ " : "§ "}{text}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
