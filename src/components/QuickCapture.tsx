"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/lib/useScrollLock";

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useScrollLock(open);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setTitle(""); setContent(""); }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const slug = `inbox-${Date.now()}`;
      const body = JSON.stringify({
        title: title.trim() || "Untitled capture",
        slug,
        content: content ? `<p>${content}</p>` : "<p></p>",
        status: "draft",
        categoryName: "Inbox",
      });
      const res = await fetch("/api/quick-capture", { method: "POST", body, headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        setOpen(false);
        router.push(`/articles/${data.slug}/edit`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-32 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        className="bg-surface border border-border rounded shadow-2xl w-full max-w-lg p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-heading">Quick Capture</span>
          <kbd className="text-[10px] text-muted border border-border rounded px-1 py-0.5">Ctrl+Shift+N</kbd>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          placeholder="Start writing... (saved to Inbox as draft)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSave();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Ctrl+Enter to save · Esc to dismiss</span>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-muted/50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50">
              {saving ? "Saving…" : "Capture"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
