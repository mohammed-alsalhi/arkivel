"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ReviewStatusBadge from "@/components/ReviewStatusBadge";
import SpecialBlocksRenderer from "@/components/SpecialBlocksRenderer";
import { reviewStatusLabel } from "@/lib/reviews";
import { LinkButton, Page, PageHeader, Section } from "@/components/ui";

type ReviewUser = {
  id: string;
  username: string;
  displayName: string | null;
};

type ReviewComment = {
  id: string;
  content: string;
  selector: string | null;
  resolved: boolean;
  createdAt: string;
  user: ReviewUser;
};

type ReviewDetail = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
    content: string;
  };
  author: ReviewUser;
  reviewer: ReviewUser | null;
  comments: ReviewComment[];
};

type CurrentUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
} | null;

function displayName(user: { username: string; displayName: string | null }) {
  return user.displayName || user.username;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewRes, authRes] = await Promise.all([
        fetch(`/api/reviews/${params.id}`),
        fetch("/api/auth/check"),
      ]);

      if (!reviewRes.ok) {
        const data = await reviewRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to load review");
      }

      const reviewData = await reviewRes.json();
      const authData = authRes.ok ? await authRes.json() : null;
      setReview(reviewData);
      setCurrentUser(authData?.user ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;

    setActionLoading("comment");
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to post comment");
      }

      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setActionLoading(null);
    }
  }

  async function updateReview(status: string) {
    if (
      (status === "changes_requested" || status === "rejected") &&
      !decisionNote.trim()
    ) {
      setError("Add a note before requesting changes or rejecting.");
      return;
    }

    setActionLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          comment: decisionNote.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update review");
      }

      setDecisionNote("");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setActionLoading(null);
    }
  }

  async function assignToMe() {
    if (!currentUser) return;
    setActionLoading("assign");
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: currentUser.id,
          status: "in_review",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to assign review");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign review");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <p className="py-8 text-[13px] text-muted italic">Loading review...</p>;
  }

  if (error && !review) {
    return <p className="py-8 text-[13px] text-danger">{error}</p>;
  }

  if (!review) {
    return <p className="py-8 text-[13px] text-muted italic">Review not found.</p>;
  }

  const isReviewer = currentUser?.id === review.reviewer?.id;
  const isAuthor = currentUser?.id === review.author.id;
  const isAdmin = currentUser?.role === "admin";
  const canAssign =
    currentUser &&
    !review.reviewer &&
    review.status === "pending" &&
    (currentUser.role === "admin" || currentUser.role === "editor");
  const canDecide =
    review.status === "in_review" && (isReviewer || isAdmin);
  const canResubmit =
    review.status === "changes_requested" && (isAuthor || isAdmin);

  return (
    <Page>
      <div>
      <nav className="article-tabbar" aria-label="Review sections">
        <Link href="/reviews" className="article-tab">
          Reviews
        </Link>
        <span className="article-tab article-tab-active">Request</span>
        <Link href={`/articles/${review.article.slug}`} className="article-tab">
          Article
        </Link>
        <Link href={`/articles/${review.article.slug}/edit`} className="article-tab">
          Edit
        </Link>
      </nav>

      <div className="border border-border bg-surface px-5 py-4">
        <PageHeader
          className="border-b border-border pb-3"
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              {review.article.title}
              <ReviewStatusBadge status={review.status} />
            </span>
          }
          description={
            <>
              Requested by{" "}
              <strong className="text-foreground">
                {displayName(review.author)}
              </strong>
              {review.reviewer && (
                <>
                  {" "}
                  for{" "}
                  <strong className="text-foreground">
                    {displayName(review.reviewer)}
                  </strong>
                </>
              )}
              {" "}on {formatDate(review.createdAt)}
            </>
          }
          actions={
            <LinkButton href={`/articles/${review.article.slug}`}>
              View article
            </LinkButton>
          }
        />

        {review.message && (
          <div className="mt-4 border border-border bg-background px-3 py-2 text-[13px]">
            <div className="mb-1 text-[11px] font-bold uppercase text-muted">
              Request note
            </div>
            <p className="whitespace-pre-wrap text-foreground">{review.message}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] mt-4">
          <Section
            className="min-w-0"
            title="Draft preview"
            actions={
              <span className="text-[11px] text-muted">
                Current article content
              </span>
            }
          >
            <div className="max-h-[620px] overflow-y-auto border border-border bg-background px-4 py-3">
              <SpecialBlocksRenderer html={review.article.content} />
            </div>
          </Section>

          <aside className="space-y-4">
            <Section title="Decision">
              {canAssign && (
                <button
                  type="button"
                  onClick={assignToMe}
                  disabled={actionLoading === "assign"}
                  className="ui-button ui-button-primary w-full justify-center"
                >
                  {actionLoading === "assign" ? "Assigning..." : "Assign to me"}
                </button>
              )}

              {canResubmit && (
                <button
                  type="button"
                  onClick={() => updateReview("in_review")}
                  disabled={actionLoading === "in_review"}
                  className="ui-button ui-button-primary w-full justify-center"
                >
                  {actionLoading === "in_review" ? "Resubmitting..." : "Resubmit for review"}
                </button>
              )}

              {canDecide ? (
                <div className="space-y-2">
                  <textarea
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    rows={4}
                    placeholder="Optional approval note, or required change request details..."
                    className="w-full resize-y border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => updateReview("approved")}
                      disabled={!!actionLoading}
                      className="ui-button ui-button-primary justify-center"
                    >
                      {actionLoading === "approved" ? "Approving..." : "Approve and publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateReview("changes_requested")}
                      disabled={!!actionLoading}
                      className="ui-button justify-center"
                    >
                      {actionLoading === "changes_requested"
                        ? "Saving..."
                        : "Request changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateReview("rejected")}
                      disabled={!!actionLoading}
                      className="ui-button justify-center"
                    >
                      {actionLoading === "rejected" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-muted">
                  This request is {reviewStatusLabel(review.status).toLowerCase()}.
                </p>
              )}

              {error && (
                <p className="mt-2 text-[12px] text-danger">{error}</p>
              )}
            </Section>

            <Section title="Comments">
              <div className="space-y-2">
                {review.comments.length === 0 ? (
                  <p className="text-[12px] text-muted italic">
                    No comments yet.
                  </p>
                ) : (
                  review.comments.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border bg-background px-3 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted">
                        <strong className="text-foreground">
                          {displayName(item.user)}
                        </strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] text-foreground">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={postComment} className="mt-3 space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Add a review comment..."
                  className="w-full resize-y border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!comment.trim() || actionLoading === "comment"}
                  className="ui-button ui-button-primary"
                >
                  {actionLoading === "comment" ? "Posting..." : "Post comment"}
                </button>
              </form>
            </Section>
          </aside>
        </div>
      </div>
      </div>
    </Page>
  );
}
