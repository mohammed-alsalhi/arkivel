"use client";

import { useEffect, useState } from "react";

type Props = {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  depth: number;
  onDepthChange: (d: number) => void;
  centerSlug: string;
  onCenterChange: (slug: string) => void;
  nodeCount: number;
  edgeCount: number;
  clusterMode: boolean;
  onClusterModeChange: (v: boolean) => void;
};

export default function GraphControls({
  categories,
  selectedCategory,
  onCategoryChange,
  depth,
  onDepthChange,
  centerSlug,
  onCenterChange,
  nodeCount,
  edgeCount,
  clusterMode,
  onClusterModeChange,
}: Props) {
  const [open, setOpen] = useState(true);

  // The panel covers half the graph on a phone — start collapsed there.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }, []);

  return (
    <div className="absolute top-3 left-3 z-10 bg-surface border border-border text-[12px] shadow-sm max-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 font-semibold text-[13px] text-heading"
      >
        <span>graph controls</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={open ? "" : "-rotate-90"}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {/* Category filter */}
          <div>
            <label htmlFor="graph-space" className="block text-muted mb-0.5">space</label>
            <select
              id="graph-space"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full border border-border px-1.5 py-1 bg-surface text-[12px]"
            >
              <option value="">all spaces</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Depth slider */}
          <div>
            <label htmlFor="graph-depth" className="block text-muted mb-0.5">
              depth: {depth}
            </label>
            <input
              id="graph-depth"
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => onDepthChange(parseInt(e.target.value))}
              className="w-full pointer-coarse:py-3"
            />
          </div>

          {/* Center article */}
          {centerSlug && (
            <div>
              <span className="block text-muted mb-0.5">centered on</span>
              <div className="flex items-center gap-1">
                <span className="font-mono truncate flex-1">{centerSlug}</span>
                <button
                  type="button"
                  onClick={() => onCenterChange("")}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-muted hover:text-foreground pointer-coarse:h-9 pointer-coarse:w-9"
                  aria-label="clear center"
                  title="clear center"
                >
                  x
                </button>
              </div>
            </div>
          )}

          {/* Cluster mode */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer pointer-coarse:py-2">
              <input
                type="checkbox"
                checked={clusterMode}
                onChange={(e) => onClusterModeChange(e.target.checked)}
                className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5"
              />
              <span className="text-muted">show clusters</span>
            </label>
          </div>

          {/* Stats */}
          <div className="text-muted border-t border-border pt-1">
            {nodeCount} nodes, {edgeCount} edges
          </div>
        </div>
      )}
    </div>
  );
}
