"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reviewStatusLabel } from "@/lib/reviews";
import { useScrollLock } from "@/lib/useScrollLock";

type Reviewer = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
};

type ActiveReview = {
  id: string;
  status: string;
  reviewer: {
    username: string;
    displayName: string | null;
  } | null;
} | null;

type CurrentUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
} | null;

type Props = {
  articleId: string;
  articleTitle: string;
  activeReview: ActiveReview;
};

function displayName(user: { username: string; displayName: string | null }) {
  return user.displayName || user.username;
}

export default function ReviewRequestButton({
  articleId,
  articleTitle,
  activeReview,
}: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [open, setOpen] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const [reviewerId, setReviewerId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/check")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setCurrentUser(data?.user ?? null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    fetch("/api/reviewers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setReviewers(Array.isArray(data) ? data : []))
      .catch(() => setReviewers([]));
  }, [open]);

  const canRequest =
    currentUser?.role === "admin" || currentUser?.role === "editor";

  if (!canRequest) return null;

  async function submitReviewRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId,
        reviewerId: reviewerId || null,
        message: message.trim() || null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.id) {
      router.push(`/reviews/${data.id}`);
      return;
    }

    if (res.status === 409 && data?.review?.id) {
      router.push(`/reviews/${data.review.id}`);
      return;
    }

    setSubmitting(false);
    setError(data?.error || "Failed to request review");
  }

  if (activeReview) {
    return (
      <Link
        href={`/reviews/${activeReview.id}`}
        className="ui-button"
        title={`Review is ${reviewStatusLabel(activeReview.status)}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Review
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-button"
        title="Request a draft review"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
        Request review
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={submitReviewRequest}
            role="dialog"
            aria-modal="true"
            aria-label="Request review"
            className="w-full max-w-lg border border-border bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
              <div>
                <h2 className="text-[16px] font-semibold text-heading">
                  Request review
                </h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  {articleTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ui-icon-button"
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 py-3">
              <div>
                <label className="block text-[12px] font-bold text-heading mb-1">
                  Reviewer
                </label>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Unassigned review queue</option>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>
                      {displayName(reviewer)} ({reviewer.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-heading mb-1">
                  Note for reviewer
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="What should they focus on?"
                  className="w-full resize-y border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-[12px] text-danger">{error}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <div className="min-w-0 text-[11px] text-muted">
                Drafts move into review while the request is active.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ui-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ui-button ui-button-primary"
                >
                  {submitting ? "Requesting..." : "Request review"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
