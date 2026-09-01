"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Annotation = {
  id: string;
  selector: { text: string; context?: string };
  note: string;
  isShared: boolean;
  userId: string;
  user: { username: string; displayName: string | null };
  createdAt: string;
};

type Props = {
  articleId: string;
  isLoggedIn: boolean;
};

export default function AnnotationLayer({ articleId, isLoggedIn }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingSelector, setPendingSelector] = useState<{ text: string; context: string } | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Load annotations for this article
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`/api/annotations?articleId=${articleId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAnnotations(data); })
      .catch(() => {});
  }, [articleId, isLoggedIn]);

  // Highlight annotated text in the article DOM
  useEffect(() => {
    if (!annotations.length) return;
    const articleEl = document.querySelector(".article-content");
    if (!articleEl) return;

    annotations.forEach((ann) => {
      const selectedText = ann.selector?.text;
      if (!selectedText) return;
      highlightTextInElement(articleEl as HTMLElement, selectedText, ann.id);
    });

    // Attach click handlers to highlights
    document.querySelectorAll(".annotation-highlight").forEach((el) => {
      (el as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const annId = (el as HTMLElement).dataset.annotationId;
        const ann = annotations.find((a) => a.id === annId);
        if (ann) setActiveAnnotation(ann);
      });
    });
  }, [annotations]);

  // Listen for text selection to create new annotations
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isLoggedIn) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

      // Only annotate within article content
      const range = selection.getRangeAt(0);
      const articleEl = document.querySelector(".article-content");
      if (!articleEl || !articleEl.contains(range.commonAncestorContainer)) return;

      const text = selection.toString().trim();
      const context = range.commonAncestorContainer.textContent?.substring(0, 100) || "";
      setPendingSelector({ text, context });
      setPopoverPos({ x: e.clientX, y: e.clientY + window.scrollY });
      setNoteText("");
      setIsShared(false);
      setTimeout(() => noteInputRef.current?.focus(), 50);
    },
    [isLoggedIn]
  );

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  async function saveAnnotation() {
    if (!pendingSelector || !noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, selector: pendingSelector, note: noteText, isShared }),
      });
      if (res.ok) {
        const ann = await res.json();
        setAnnotations((prev) => [...prev, ann]);
      }
    } finally {
      setSaving(false);
      setPendingSelector(null);
      setPopoverPos(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  async function deleteAnnotation(id: string) {
    await fetch("/api/annotations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setActiveAnnotation(null);
    // Remove highlight from DOM
    document.querySelectorAll(`[data-annotation-id="${id}"]`).forEach((el) => {
      const parent = el.parentNode;
      if (parent) parent.replaceChild(document.createTextNode(el.textContent || ""), el);
    });
  }

  if (!isLoggedIn) return null;

  return (
    <>
      {/* New annotation popover */}
      {pendingSelector && popoverPos && (
        <div
          style={{ top: popoverPos.y + 8, left: Math.min(popoverPos.x, window.innerWidth - 280) }}
          className="fixed z-50 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Annotate: &ldquo;{pendingSelector.text.slice(0, 60)}{pendingSelector.text.length > 60 ? "…" : ""}&rdquo;
          </p>
          <textarea
            ref={noteInputRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Your note…"
            rows={3}
            className="w-full text-sm px-2 py-1 border border-border rounded bg-background resize-none"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-3 h-3"
            />
            Share with all readers
          </label>
          <div className="flex gap-2">
            <button
              onClick={saveAnnotation}
              disabled={saving || !noteText.trim()}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setPendingSelector(null); setPopoverPos(null); }}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active annotation detail */}
      {activeAnnotation && (
        <div
          className="fixed bottom-6 right-6 z-50 w-72 bg-popover border border-border rounded-lg shadow-lg p-4 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground italic">
              &ldquo;{activeAnnotation.selector?.text?.slice(0, 80)}&rdquo;
            </p>
            <button
              onClick={() => setActiveAnnotation(null)}
              className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
          <p className="text-sm">{activeAnnotation.note}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {activeAnnotation.user.displayName || activeAnnotation.user.username}
              {activeAnnotation.isShared && (
                <span className="ml-1 text-[10px] bg-info-soft text-info px-1 rounded">shared</span>
              )}
            </span>
            <button
              onClick={() => deleteAnnotation(activeAnnotation.id)}
              className="text-destructive hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Annotation count indicator */}
      {annotations.length > 0 && (
        <div className="fixed bottom-6 left-6 z-40 text-xs text-muted-foreground bg-background border border-border rounded px-2 py-1">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
        </div>
      )}
    </>
  );
}

/** Wrap occurrences of `text` inside `el` with highlight spans */
function highlightTextInElement(el: HTMLElement, text: string, annotationId: string) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodesToProcess: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent?.includes(text)) nodesToProcess.push(node);
  }
  // Only highlight first occurrence to avoid cluttering
  const target = nodesToProcess[0];
  if (!target) return;
  const idx = target.textContent!.indexOf(text);
  if (idx < 0) return;
  const before = target.textContent!.slice(0, idx);
  const after = target.textContent!.slice(idx + text.length);
  const highlight = document.createElement("mark");
  highlight.className =
    "annotation-highlight bg-warning/30 cursor-pointer rounded-sm";
  highlight.dataset.annotationId = annotationId;
  highlight.textContent = text;
  const parent = target.parentNode!;
  parent.insertBefore(document.createTextNode(before), target);
  parent.insertBefore(highlight, target);
  parent.insertBefore(document.createTextNode(after), target);
  parent.removeChild(target);
}
