"use client";

import { useState } from "react";

type Level = "standard" | "beginner" | "technical" | "eli5";

const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "standard", label: "Standard", desc: "Original article" },
  { id: "beginner", label: "Beginner", desc: "Plain English, no jargon" },
  { id: "technical", label: "Technical", desc: "Expert depth + nuance" },
  { id: "eli5", label: "ELI5", desc: "Explain like I'm 5" },
];

type Props = {
  articleId: string;
  onLevelChange: (html: string | null, level: Level) => void;
};

export default function ReadingLevelButton({ articleId, onLevelChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState<Level>("standard");
  const [loading, setLoading] = useState(false);

  async function applyLevel(level: Level) {
    setOpen(false);
    if (level === "standard") {
      setActiveLevel("standard");
      onLevelChange(null, "standard");
      return;
    }
    setLoading(true);
    setActiveLevel(level);
    try {
      const res = await fetch("/api/ai/reading-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, level }),
      });
      if (res.ok) {
        const { html } = await res.json();
        onLevelChange(html, level);
      } else {
        setActiveLevel("standard");
        onLevelChange(null, "standard");
      }
    } catch {
      setActiveLevel("standard");
      onLevelChange(null, "standard");
    }
    setLoading(false);
  }

  const active = LEVELS.find((l) => l.id === activeLevel)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={`h-6 pointer-coarse:h-9 px-2 text-[11px] border rounded transition-colors flex items-center gap-1 ${
          activeLevel !== "standard"
            ? "border-accent text-accent bg-accent/10 hover:bg-accent/20"
            : "border-border text-muted hover:text-foreground hover:bg-surface-hover"
        }`}
        title="Adjust reading level"
      >
        {loading ? (
          <>
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Adapting…
          </>
        ) : (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {active.label}
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-50 bg-surface border border-border rounded shadow-lg w-52 py-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted border-b border-border mb-1">
              Reading Level
            </div>
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => applyLevel(l.id)}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-surface-hover transition-colors ${
                  l.id === activeLevel ? "text-accent font-medium" : "text-foreground"
                }`}
              >
                <div className="font-medium">{l.label}</div>
                <div className="text-[11px] text-muted">{l.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
