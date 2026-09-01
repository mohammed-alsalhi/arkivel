"use client";

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";

type GrammarIssue = {
  offset: number;
  length: number;
  message: string;
  suggestion: string;
  severity: "error" | "warning" | "style";
};

const SEVERITY_COLOR: Record<string, string> = {
  error: "text-danger",
  warning: "text-warning",
  style: "text-info",
};

const SEVERITY_BG: Record<string, string> = {
  error: "bg-danger-soft border-danger-border",
  warning: "bg-warning-soft border-warning-border",
  style: "bg-info-soft border-info-border",
};

export default function GrammarCheckPanel({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const check = useCallback(async () => {
    const text = editor.getText();
    if (!text.trim()) return;
    setLoading(true);
    setChecked(false);
    try {
      const res = await fetch("/api/ai/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues ?? []);
      }
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [editor]);

  function applySuggestion(issue: GrammarIssue) {
    if (!issue.suggestion) return;
    // Find the position in the editor's text and replace
    const text = editor.getText();
    const before = text.slice(0, issue.offset);
    // Count newlines to estimate node positions — simple text replacement via commands
    const from = issue.offset + 1; // ProseMirror positions are 1-indexed
    editor.chain()
      .focus()
      .setTextSelection({ from, to: from + issue.length })
      .insertContent(issue.suggestion)
      .run();
    setIssues((prev) => prev.filter((i) => i !== issue));
    void before; // suppress unused warning
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const styleCount = issues.filter((i) => i.severity === "style").length;

  return (
    <div className="border-t border-border">
      {/* Header toggle */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && !checked) check();
        }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-muted hover:text-foreground transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        <span>Grammar &amp; style</span>
        {checked && issues.length > 0 && (
          <span className="ml-auto flex items-center gap-1">
            {errorCount > 0 && <span className="text-danger font-bold">{errorCount}e</span>}
            {warnCount > 0 && <span className="text-warning font-bold">{warnCount}w</span>}
            {styleCount > 0 && <span className="text-info">{styleCount}s</span>}
          </span>
        )}
        {checked && issues.length === 0 && (
          <span className="ml-auto text-success text-[11px]">No issues</span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-1 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={check}
              disabled={loading}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40"
            >
              {loading ? "Checking…" : "Check now"}
            </button>
            {issues.length > 0 && (
              <span className="text-[11px] text-muted">{issues.length} issue{issues.length !== 1 ? "s" : ""} found</span>
            )}
          </div>

          {issues.length === 0 && checked && (
            <p className="text-[12px] text-success">
              No grammar or style issues found.
            </p>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={`border rounded px-2 py-1.5 text-[12px] ${SEVERITY_BG[issue.severity]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`font-semibold text-[10px] uppercase ${SEVERITY_COLOR[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <p className="text-foreground mt-0.5 leading-snug">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-muted text-[11px] mt-0.5">
                        Suggestion:{" "}
                        <code className="bg-surface px-0.5 rounded">&ldquo;{issue.suggestion}&rdquo;</code>
                      </p>
                    )}
                  </div>
                  {issue.suggestion && (
                    <button
                      onClick={() => applySuggestion(issue)}
                      className="shrink-0 h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-foreground hover:bg-surface transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
