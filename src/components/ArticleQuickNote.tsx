"use client";

import { useEffect, useState } from "react";

const KEY_PREFIX = "wiki_quick_note_";

export default function ArticleQuickNote({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const key = KEY_PREFIX + articleId;

  useEffect(() => {
    try {
      setNote(localStorage.getItem(key) || "");
    } catch {
      // ignore
    }
  }, [key]);

  function save() {
    try {
      if (note.trim()) {
        localStorage.setItem(key, note);
      } else {
        localStorage.removeItem(key);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // ignore
    }
  }

  const hasNote = note.trim().length > 0;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-6 pointer-coarse:h-9 px-2 text-[11px] border rounded transition-colors ${
          hasNote
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-muted hover:text-foreground"
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
        </svg>
        {open ? "Close note" : hasNote ? "My note" : "Add note"}
      </button>

      {open && (
        <div className="mt-2 border border-border rounded p-3 bg-surface space-y-2">
          <p className="text-[11px] text-muted">Private note — stored only in this browser</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a private note about this article…"
            rows={4}
            className="w-full border border-border rounded px-2 py-1 text-[12px] bg-background text-foreground resize-none focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={save}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded bg-accent text-accent-foreground hover:opacity-90"
            >
              {saved ? "Saved!" : "Save"}
            </button>
            {hasNote && (
              <button
                onClick={() => { setNote(""); localStorage.removeItem(key); }}
                className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-danger"
              >
                Delete note
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
