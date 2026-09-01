"use client";

import dynamicImport from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/ui";

// Excalidraw must be dynamically imported (no SSR) due to browser APIs
const Excalidraw = dynamicImport(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted text-[13px] italic">Loading canvas…</div> }
);

type Board = {
  id: string;
  title: string;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  updatedAt: string;
};

export default function WhiteboardPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingDataRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      // Find board by slug via list endpoint
      const res = await fetch("/api/whiteboards");
      const all = await res.json();
      const found = Array.isArray(all) ? all.find((b: Board) => b.slug === slug) : null;
      if (found) {
        const detailRes = await fetch(`/api/whiteboards/${found.id}`);
        const detail = await detailRes.json();
        setBoard(detail);
        setTitle(detail.title);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const scheduleSave = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      pendingDataRef.current = data;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!board || !pendingDataRef.current) return;
        setSaving(true);
        await fetch(`/api/whiteboards/${board.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: pendingDataRef.current }),
        });
        setSaving(false);
        setSavedAt(new Date());
      }, 2000);
    },
    [board]
  );

  async function saveTitle() {
    if (!board) return;
    await fetch(`/api/whiteboards/${board.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBoard({ ...board, title });
    setEditingTitle(false);
  }

  if (loading) return <LoadingState label="Loading…" />;
  if (!board) return <div className="wiki-notice">Whiteboard not found. <Link href="/whiteboards">Back to whiteboards.</Link></div>;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "80vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-2 mb-2">
        <Link href="/whiteboards" className="text-[12px] text-muted hover:text-foreground">
          ← Whiteboards
        </Link>
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              className="border border-border bg-surface px-2 py-0.5 text-[14px] font-medium focus:border-accent focus:outline-none"
            />
            <button onClick={saveTitle} className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-surface-hover">Save</button>
            <button onClick={() => setEditingTitle(false)} className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-surface-hover">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-[15px] font-medium text-heading hover:underline"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {board.title}
          </button>
        )}
        <span className="ml-auto text-[11px] text-muted">
          {saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : ""}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 border border-border" style={{ height: "75vh" }}>
        <Excalidraw
          initialData={{ elements: board.data?.elements ?? [], appState: board.data?.appState ?? {}, files: board.data?.files ?? {} }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(elements: any, appState: any, files: any) => scheduleSave({ elements, appState, files })}
        />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
