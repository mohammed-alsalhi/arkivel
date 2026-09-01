"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAdmin } from "@/components/AdminContext";
import { config } from "@/lib/config";

const WorldMap = dynamic(() => import("@/components/map/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted italic text-[13px]">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  const isAdmin = useAdmin();
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="-my-4 flex h-[calc(100vh-40px)] min-w-0 flex-col overflow-hidden sm:-mx-6">
      <div className="flex min-w-0 flex-col gap-2 border-b border-border bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <h1
          className="min-w-0 text-lg font-normal text-heading"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {config.mapLabel}
        </h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="min-w-0 text-[11px] text-muted italic">
            {editMode
              ? "Draw areas to link regions to articles"
              : "Hover over areas to explore locations"}
          </span>
          {isAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`min-w-0 px-3 py-1 text-[12px] transition-colors ${
                editMode
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface-hover text-foreground hover:bg-surface"
              }`}
            >
              {editMode ? "Done editing" : "Edit map"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1">
        <WorldMap
          mapImage={config.mapImage || "/maps/world.webp"}
          editMode={editMode}
        />
      </div>
    </div>
  );
}
