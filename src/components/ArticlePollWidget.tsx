"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirm } from "@/lib/useConfirm";

type Poll = {
  id: string;
  question: string;
  options: string[];
  counts: number[];
  totalVotes: number;
  closed: boolean;
};

export default function ArticlePollWidget({
  articleId,
  isAdmin,
}: {
  articleId: string;
  isAdmin: boolean;
}) {
  const { confirm, confirmDialog } = useConfirm();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [voted, setVoted] = useState<Record<string, number>>({}); // pollId -> optionIndex
  const [showNew, setShowNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${articleId}/polls`);
    if (res.ok) setPolls(await res.json());
  }, [articleId]);

  useEffect(() => {
    load();
    // Restore local vote memory
    try {
      const stored = JSON.parse(localStorage.getItem("wiki_poll_votes") || "{}");
      setVoted(stored);
    } catch {
      // ignore
    }
  }, [load]);

  async function vote(pollId: string, optionIndex: number) {
    const res = await fetch(`/api/articles/${articleId}/polls/${pollId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
    if (!res.ok) return;
    const next = { ...voted, [pollId]: optionIndex };
    setVoted(next);
    try {
      localStorage.setItem("wiki_poll_votes", JSON.stringify(next));
    } catch {
      // ignore
    }
    await load();
  }

  async function createPoll() {
    const opts = newOptions.map((o) => o.trim()).filter(Boolean);
    if (!newQuestion.trim() || opts.length < 2) return;
    setSaving(true);
    const res = await fetch(`/api/articles/${articleId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion.trim(), options: opts }),
    });
    setSaving(false);
    if (res.ok) {
      setNewQuestion("");
      setNewOptions(["", ""]);
      setShowNew(false);
      await load();
    }
  }

  async function toggleClose(poll: Poll) {
    await fetch(`/api/articles/${articleId}/polls/${poll.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: !poll.closed }),
    });
    await load();
  }

  async function deletePoll(pollId: string) {
    if (!(await confirm("Delete this poll?", { title: "Delete poll", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/articles/${articleId}/polls/${pollId}`, { method: "DELETE" });
    await load();
  }

  if (polls.length === 0 && !isAdmin) return null;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-heading uppercase">Polls</h3>
        {isAdmin && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground"
          >
            {showNew ? "Cancel" : "+ Add poll"}
          </button>
        )}
      </div>

      {showNew && isAdmin && (
        <div className="border border-border rounded p-3 space-y-2 bg-surface text-[12px]">
          <input
            className="w-full border border-border rounded px-2 py-1 bg-background text-foreground text-[12px]"
            placeholder="Poll question…"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          {newOptions.map((opt, i) => (
            <div key={i} className="flex gap-1">
              <input
                className="flex-1 border border-border rounded px-2 py-1 bg-background text-foreground text-[12px]"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...newOptions];
                  next[i] = e.target.value;
                  setNewOptions(next);
                }}
              />
              {newOptions.length > 2 && (
                <button
                  onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))}
                  className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-danger"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setNewOptions([...newOptions, ""])}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground"
            >
              + Option
            </button>
            <button
              onClick={createPoll}
              disabled={saving}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded bg-accent text-accent-foreground disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {polls.map((poll) => {
        const myVote = voted[poll.id] ?? null;
        const hasVoted = myVote !== null;
        const showResults = hasVoted || poll.closed;
        const maxCount = Math.max(...poll.counts, 1);

        return (
          <div key={poll.id} className="border border-border rounded p-3 bg-surface space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground">{poll.question}</p>
              <div className="flex items-center gap-1 shrink-0">
                {poll.closed && (
                  <span className="text-[10px] text-muted border border-border rounded px-1">Closed</span>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => toggleClose(poll)}
                      className="h-6 pointer-coarse:h-9 px-2 text-[10px] border border-border rounded text-muted hover:text-foreground"
                    >
                      {poll.closed ? "Reopen" : "Close"}
                    </button>
                    <button
                      onClick={() => deletePoll(poll.id)}
                      className="h-6 pointer-coarse:h-9 px-2 text-[10px] border border-border rounded text-muted hover:text-danger"
                    >
                      Del
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {poll.options.map((opt, i) => {
                const count = poll.counts[i] ?? 0;
                const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                const isMyVote = myVote === i;

                return (
                  <div key={i}>
                    {!showResults && !poll.closed ? (
                      <button
                        onClick={() => vote(poll.id, i)}
                        className={`w-full text-left px-2 py-1 rounded border text-[12px] transition-colors ${
                          isMyVote
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-foreground hover:border-accent hover:bg-accent/5"
                        }`}
                      >
                        {opt}
                      </button>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className={`text-foreground ${isMyVote ? "font-semibold text-accent" : ""}`}>
                            {opt} {isMyVote && "✓"}
                          </span>
                          <span className="text-muted">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded bg-border overflow-hidden">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              background: isMyVote ? "var(--color-accent)" : "var(--color-muted)",
                              opacity: isMyVote ? 1 : 0.5,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-muted">
              {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
              {!showResults && !poll.closed && " · vote to see results"}
            </p>
          </div>
        );
      })}
      {confirmDialog}
    </div>
  );
}
