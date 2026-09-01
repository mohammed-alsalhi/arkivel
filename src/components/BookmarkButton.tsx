"use client";

import { useRef, useState } from "react";
import { useOutsideClick } from "@/lib/useOutsideClick";

interface Props {
  articleId: string;
  initialBookmarked?: boolean;
}

export default function BookmarkButton({ articleId, initialBookmarked = false }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setShowNote(false), showNote);

  async function toggle() {
    if (bookmarked) {
      await fetch(`/api/bookmarks?articleId=${articleId}`, { method: "DELETE" });
      setBookmarked(false);
    } else {
      setShowNote(true);
    }
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, note: note.trim() || undefined }),
    });
    if (res.ok) {
      setBookmarked(true);
      setShowNote(false);
      setNote("");
    }
    setSaving(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        title={bookmarked ? "Remove bookmark" : "Bookmark this article"}
        aria-pressed={bookmarked}
        className="ui-button"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {bookmarked ? "Saved" : "Bookmark"}
      </button>

      {showNote && (
        <div className="ui-dropdown top-8 z-20 w-64 p-3">
          <p className="text-[12px] font-medium mb-1">Add a note (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="ui-textarea min-h-16"
            rows={3}
            placeholder="Why are you bookmarking this?"
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setShowNote(false)} className="ui-button">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="ui-button ui-button-primary disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
