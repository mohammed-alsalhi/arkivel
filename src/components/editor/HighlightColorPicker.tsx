"use client";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";

const COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Purple", value: "#e9d5ff" },
];

interface Props {
  editor: Editor;
}

export default function HighlightColorPicker({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isHighlighted = editor.isActive("highlight");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Highlight text"
        onClick={() => setOpen((o) => !o)}
        className={`px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
          isHighlighted ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-surface hover:text-accent"
        }`}
      >
        <span style={{ background: "#fef08a", padding: "0 2px" }}>A</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-0.5 bg-surface border border-border rounded shadow-md p-1.5 flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => {
                editor.chain().focus().setHighlight({ color: c.value }).run();
                setOpen(false);
              }}
              className="w-5 h-5 pointer-coarse:w-9 pointer-coarse:h-9 rounded border border-border hover:scale-110 transition-transform"
              style={{ background: c.value }}
            />
          ))}
          <button
            type="button"
            title="Remove highlight"
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
            className="w-5 h-5 pointer-coarse:w-9 pointer-coarse:h-9 rounded border border-border text-[10px] text-muted hover:bg-surface-hover flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
