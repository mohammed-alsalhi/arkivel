"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import Link from "next/link";

type ArticleRef = { id: string; title: string; slug: string; excerpt?: string | null };

type NodeType = "article" | "text";
type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  articleId?: string;
  articleTitle?: string;
  articleSlug?: string;
  articleExcerpt?: string;
  text?: string;
};

type Edge = { id: string; from: string; to: string };

type CanvasState = {
  nodes: CanvasNode[];
  edges: Edge[];
};

function emptyState(): CanvasState {
  return { nodes: [], edges: [] };
}

function parseState(raw: Record<string, unknown>): CanvasState {
  try {
    if (Array.isArray((raw as CanvasState).nodes)) return raw as unknown as CanvasState;
  } catch {}
  return emptyState();
}

export default function CanvasEditor({
  canvasId,
  canvasName,
  initialState,
  articles,
}: {
  canvasId: string;
  canvasName: string;
  initialState: Record<string, unknown>;
  articles: ArticleRef[];
}) {
  const [state, setState] = useState<CanvasState>(() => parseState(initialState));
  const [name, setName] = useState(canvasName);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDragging, setPanDragging] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);

  useScrollLock(pickerOpen);

  useEffect(() => {
    if (!pickerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickerOpen]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce
  const scheduleSave = useCallback((nextState: CanvasState, nextName: string) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/canvas/${canvasId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nextName, state: nextState }),
        });
        setSaved(true);
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [canvasId]);

  function updateState(updater: (prev: CanvasState) => CanvasState) {
    setState((prev) => {
      const next = updater(prev);
      scheduleSave(next, name);
      return next;
    });
  }

  function addArticleNode(article: ArticleRef) {
    const node: CanvasNode = {
      id: `node-${Date.now()}`,
      type: "article",
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      width: 240,
      articleId: article.id,
      articleTitle: article.title,
      articleSlug: article.slug,
      articleExcerpt: article.excerpt ?? undefined,
    };
    updateState((s) => ({ ...s, nodes: [...s.nodes, node] }));
    setPickerOpen(false);
    setPickerQuery("");
  }

  function addTextNode() {
    const node: CanvasNode = {
      id: `node-${Date.now()}`,
      type: "text",
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      width: 180,
      text: "New note",
    };
    updateState((s) => ({ ...s, nodes: [...s.nodes, node] }));
  }

  function deleteNode(nodeId: string) {
    updateState((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }));
    setSelectedNode(null);
  }

  // Pointer drag for nodes (works for mouse and touch)
  function onNodePointerDown(e: React.PointerEvent, nodeId: string) {
    e.stopPropagation();
    setSelectedNode(nodeId);
    setDragging({ nodeId, offsetX: e.clientX, offsetY: e.clientY });
  }

  useEffect(() => {
    function onMouseMove(e: PointerEvent) {
      if (dragging) {
        const dx = e.clientX - dragging.offsetX;
        const dy = e.clientY - dragging.offsetY;
        setState((s) => ({
          ...s,
          nodes: s.nodes.map((n) =>
            n.id === dragging.nodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n
          ),
        }));
        setDragging((d) => d ? { ...d, offsetX: e.clientX, offsetY: e.clientY } : null);
      }
      if (panDragging) {
        setPan({ x: panStart.px + e.clientX - panStart.x, y: panStart.py + e.clientY - panStart.y });
      }
    }
    function onMouseUp() {
      if (dragging) {
        setState((s) => { scheduleSave(s, name); return s; });
        setDragging(null);
      }
      setPanDragging(false);
    }
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onMouseUp);
    return () => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      window.removeEventListener("pointercancel", onMouseUp);
    };
  }, [dragging, panDragging, panStart, scheduleSave, name]);

  function onCanvasPointerDown(e: React.PointerEvent) {
    if ((e.target as Element).closest(".canvas-node")) return;
    setSelectedNode(null);
    setPanDragging(true);
    setPanStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  }

  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(pickerQuery.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <Link href="/canvas" className="text-[11px] text-muted hover:text-foreground">
          ← All canvases
        </Link>
        <span className="w-px h-4 bg-border mx-0.5" />
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); scheduleSave(state, e.target.value); }}
          className="text-sm font-medium text-heading bg-transparent border-none outline-none w-48"
        />
        <span className="text-[10px] text-muted ml-2">
          {saving ? "Saving…" : saved ? "Saved" : "Unsaved"}
        </span>
        <span className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={() => setPickerOpen(true)}
          className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-muted/30"
        >
          + Article card
        </button>
        <button
          onClick={addTextNode}
          className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-muted/30"
        >
          + Text note
        </button>
        {selectedNode && (
          <>
            <span className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => deleteNode(selectedNode)}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-danger hover:bg-danger-soft"
            >
              Delete
            </button>
          </>
        )}
        <span className="ml-auto text-[10px] text-muted">Drag to pan · Click node to select</span>
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 overflow-hidden touch-none bg-[var(--color-background)] relative cursor-grab active:cursor-grabbing"
        style={{ backgroundImage: "radial-gradient(circle, var(--color-border) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        onPointerDown={onCanvasPointerDown}
      >
        <div
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "0 0", position: "absolute", inset: 0 }}
        >
          {/* Nodes */}
          {state.nodes.map((node) => (
            <div
              key={node.id}
              className={`canvas-node absolute touch-none rounded-lg border shadow-sm select-none cursor-move ${
                selectedNode === node.id ? "ring-2 ring-accent" : ""
              } ${node.type === "article" ? "bg-surface border-border" : "bg-warning-soft border-warning-border"}`}
              style={{ left: node.x, top: node.y, width: node.width, minHeight: 80 }}
              onPointerDown={(e) => onNodePointerDown(e, node.id)}
            >
              {node.type === "article" && (
                <div className="p-3">
                  <div className="text-[10px] text-muted uppercase mb-1">Article</div>
                  <Link
                    href={`/articles/${node.articleSlug}`}
                    className="text-sm font-semibold text-heading hover:underline block"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {node.articleTitle}
                  </Link>
                  {node.articleExcerpt && (
                    <p className="text-[11px] text-muted mt-1 line-clamp-3">{node.articleExcerpt}</p>
                  )}
                </div>
              )}
              {node.type === "text" && (
                <textarea
                  className="w-full p-3 text-sm bg-transparent resize-none border-none outline-none text-foreground"
                  value={node.text}
                  rows={3}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    updateState((s) => ({
                      ...s,
                      nodes: s.nodes.map((n) => n.id === node.id ? { ...n, text: e.target.value } : n),
                    }));
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Article picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24 bg-black/40" onClick={() => setPickerOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add article card"
            className="bg-surface border border-border rounded shadow-2xl w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-heading mb-3">Add article card</div>
            <input
              type="text"
              autoFocus
              placeholder="Search articles…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent mb-2"
            />
            <div className="max-h-60 overflow-y-auto divide-y divide-border">
              {filteredArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => addArticleNode(a)}
                  className="w-full text-left px-2 py-2 text-sm hover:bg-muted/30 text-heading"
                >
                  {a.title}
                </button>
              ))}
              {filteredArticles.length === 0 && (
                <div className="text-sm text-muted px-2 py-4 text-center">No articles found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
