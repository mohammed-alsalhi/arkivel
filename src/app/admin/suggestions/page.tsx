"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, EmptyState, Page, PageHeader } from "@/components/ui";

type Suggestion = {
  id: string;
  articleId: string;
  author: string;
  email: string | null;
  suggestion: string;
  status: "pending" | "accepted" | "rejected" | "commented" | "assigned" | "converted";
  adminNote: string | null;
  assigneeId: string | null;
  reviewerComment: string | null;
  convertedTaskUrl: string | null;
  spamScore: number;
  moderationState: string;
  createdAt: string;
  article: { title: string; slug: string };
};

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<Suggestion["status"] | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [assigneeInputs, setAssigneeInputs] = useState<Record<string, string>>({});
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/suggestions?status=${statusFilter}`)
      .then((r) => r.json())
      .then((data) => { setSuggestions(Array.isArray(data) ? data : []); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function reviewSuggestion(
    id: string,
    action: "accept" | "reject" | "comment" | "assign" | "convert-to-task",
    adminNote?: string
  ) {
    await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        adminNote: adminNote || undefined,
        assigneeId: assigneeInputs[id] || undefined,
        convertedTaskUrl: taskInputs[id] || undefined,
        reviewerComment: adminNote || undefined,
      }),
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  async function deleteSuggestion(id: string) {
    await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  const statusColors = {
    pending: "text-warning bg-warning-soft border-warning-border",
    accepted: "text-success bg-success-soft border-success-border",
    rejected: "text-danger bg-danger-soft border-danger-border",
    commented: "text-info bg-info-soft border-info-border",
    assigned: "text-special bg-special-soft border-special-border",
    converted: "text-foreground bg-surface border-border-light",
  };

  return (
    <Page>
      <PageHeader title="Edit Suggestions" />

      <div className="flex gap-2 mb-4">
        {(["pending", "commented", "assigned", "accepted", "rejected", "converted", "all"] as const).map((s) => (
          <Button
            key={s}
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? "primary" : "default"}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-muted italic">Loading…</p>
      ) : suggestions.length === 0 ? (
        <EmptyState title={`No ${statusFilter === "all" ? "" : statusFilter + " "}suggestions.`} />
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="border border-border rounded p-3 text-[13px]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <Link href={`/articles/${s.article.slug}`} className="wiki-link hover:underline font-medium">
                    {s.article.title}
                  </Link>
                  <span className="text-muted ml-2 text-[11px]">
                    {s.author}{s.email ? ` <${s.email}>` : ""} · {new Date(s.createdAt).toLocaleDateString()} · spam {s.spamScore} · {s.moderationState}
                  </span>
                </div>
                <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${statusColors[s.status]}`}>
                  {s.status}
                </span>
              </div>

              <p className="text-foreground whitespace-pre-wrap mb-2">{s.suggestion}</p>

              {s.adminNote && (
                <p className="text-[12px] text-muted italic mb-2">Note: {s.adminNote}</p>
              )}
              {s.reviewerComment && (
                <p className="text-[12px] text-muted italic mb-2">Reviewer comment: {s.reviewerComment}</p>
              )}
              {s.convertedTaskUrl && (
                <p className="text-[12px] text-muted italic mb-2">Task: {s.convertedTaskUrl}</p>
              )}

              {s.status === "pending" && (
                <div className="space-y-1.5">
                  <input
                    value={noteInputs[s.id] ?? ""}
                    onChange={(e) => setNoteInputs((p) => ({ ...p, [s.id]: e.target.value }))}
                    placeholder="Optional admin note…"
                    className="w-full h-6 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none pointer-coarse:h-9"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <input
                      value={assigneeInputs[s.id] ?? ""}
                      onChange={(e) => setAssigneeInputs((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="Assignee user id"
                      className="w-full h-6 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none pointer-coarse:h-9"
                    />
                    <input
                      value={taskInputs[s.id] ?? ""}
                      onChange={(e) => setTaskInputs((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="Task URL or id"
                      className="w-full h-6 px-2 text-[12px] border border-border rounded bg-surface focus:outline-none pointer-coarse:h-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => reviewSuggestion(s.id, "accept", noteInputs[s.id])}>
                      Accept
                    </Button>
                    <Button variant="danger" onClick={() => reviewSuggestion(s.id, "reject", noteInputs[s.id])}>
                      Reject
                    </Button>
                    <Button onClick={() => reviewSuggestion(s.id, "comment", noteInputs[s.id])}>
                      Comment
                    </Button>
                    <Button onClick={() => reviewSuggestion(s.id, "assign", noteInputs[s.id])}>
                      Assign
                    </Button>
                    <Button onClick={() => reviewSuggestion(s.id, "convert-to-task", noteInputs[s.id])}>
                      Convert
                    </Button>
                    <Button onClick={() => deleteSuggestion(s.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              {s.status !== "pending" && (
                <Button onClick={() => deleteSuggestion(s.id)}>
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
