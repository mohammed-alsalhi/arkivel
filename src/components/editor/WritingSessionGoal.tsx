"use client";

import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor | null;
};

export default function WritingSessionGoal({ editor }: Props) {
  const [goal, setGoal] = useState(0);
  const [input, setInput] = useState("");
  const [active, setActive] = useState(false);
  const [sessionStart, setSessionStart] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!editor || !active) return;

    function update() {
      const text = editor?.state.doc.textContent ?? "";
      const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    }

    editor.on("update", update);
    update();
    return () => { editor.off("update", update); };
  }, [editor, active]);

  function startSession() {
    const g = parseInt(input, 10);
    if (!g || g < 1) return;
    setGoal(g);
    setActive(true);
    const t = Date.now();
    setSessionStart(t);
    setNow(t);

    // Snapshot current word count as baseline
    const text = editor?.state.doc.textContent ?? "";
    const baseline = text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(baseline);
  }

  function stopSession() {
    setActive(false);
    setGoal(0);
    setInput("");
  }

  if (!active) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max="50000"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") startSession(); }}
          placeholder="word goal"
          className="h-6 pointer-coarse:h-9 w-20 px-2 text-[11px] border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={startSession}
          disabled={!input || parseInt(input, 10) < 1}
          className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded hover:bg-surface-hover disabled:opacity-40 transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  const elapsed = Math.floor((now - sessionStart) / 1000);
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");
  const pct = Math.min(100, Math.round((wordCount / goal) * 100));
  const done = wordCount >= goal;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-[11px]">
        <span className={done ? "text-success font-bold" : "text-foreground"}>
          {wordCount}/{goal}
        </span>
        <span className="text-muted">words</span>
        <span className="text-muted">·</span>
        <span className="text-muted font-mono">{mm}:{ss}</span>
      </div>
      <div className="w-24 h-1.5 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        type="button"
        onClick={stopSession}
        className="h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-foreground transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
