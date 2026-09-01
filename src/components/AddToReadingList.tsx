"use client";

import { useRef, useState } from "react";
import { useOutsideClick } from "@/lib/useOutsideClick";

interface ReadingList {
  id: string;
  name: string;
}

interface Props {
  articleId: string;
}

export default function AddToReadingList({ articleId }: Props) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);

  function loadLists() {
    if (lists.length > 0) return;
    setLoading(true);
    fetch("/api/reading-lists?own=1")
      .then((r) => r.json())
      .then((data) => { setLists(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function addToList(listId: string) {
    const res = await fetch(`/api/reading-lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    if (res.ok) setAdded((prev) => [...prev, listId]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); loadLists(); }}
        className="ui-button"
        aria-haspopup="true"
        aria-expanded={open}
        title="Add to reading list"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        List
      </button>

      {open && (
        <div className="ui-dropdown top-8 z-20 w-52 p-1">
          {loading ? (
            <p className="text-muted px-2 py-1">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="text-muted px-2 py-1">No lists yet. Create one in Reading Lists.</p>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                onClick={() => addToList(list.id)}
                disabled={added.includes(list.id)}
                className={`ui-dropdown-item ${
                  added.includes(list.id) ? "text-muted line-through" : "text-foreground"
                }`}
              >
                {added.includes(list.id) && (
                  <svg className="inline mr-1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                {list.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
