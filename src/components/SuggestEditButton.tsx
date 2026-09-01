"use client";

import { useState } from "react";

interface Props {
  articleId: string;
}

export default function SuggestEditButton({ articleId }: Props) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, author: author.trim(), email: email.trim(), suggestion: suggestion.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Submission failed");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-muted hover:text-foreground"
      >
        Suggest edit
      </button>
    );
  }

  return (
    <div className="mt-2 border border-border rounded p-3 bg-surface-hover">
      {done ? (
        <div className="text-[13px] text-foreground">
          <p className="font-medium mb-1">Thank you for your suggestion!</p>
          <p className="text-muted text-[12px]">An editor will review your feedback.</p>
          <button
            type="button"
            onClick={() => { setOpen(false); setDone(false); setSuggestion(""); setAuthor(""); setEmail(""); }}
            className="mt-2 text-[11px] text-accent hover:underline"
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-heading">Suggest an edit</span>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-muted hover:text-foreground">✕</button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">Your name (optional)</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Anonymous"
                className="w-full h-6 pointer-coarse:h-9 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-muted mb-0.5">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="for follow-up"
                className="w-full h-6 pointer-coarse:h-9 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted mb-0.5">What should be changed? *</label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              required
              rows={3}
              placeholder="Describe the correction or improvement you'd like to see…"
              className="w-full px-2 py-1.5 text-[12px] border border-border rounded bg-surface focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !suggestion.trim()}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit suggestion"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
