"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReviewStatusBadge from "@/components/ReviewStatusBadge";
import { Page, PageHeader, TabButton, Tabs } from "@/components/ui";
import { useToast } from "@/components/Toast";

type ReviewUser = {
  id: string;
  username: string;
  displayName: string | null;
};

type ReviewArticle = {
  id: string;
  title: string;
  slug: string;
};

type ReviewRequest = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  article: ReviewArticle;
  author: ReviewUser;
  reviewer: ReviewUser | null;
  _count: { comments: number };
};

type TabKey = "pending" | "assigned" | "mine";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type CurrentUser = {
  id: string;
  username: string;
  role: string;
} | null;

export default function ReviewsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);

  // Fetch current user info for "Assigned to Me" and "My Requests" filtering
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.id) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchReviews = useCallback(
    async (tab: TabKey) => {
      setLoading(true);
      setError(null);
      try {
        if ((tab === "assigned" || tab === "mine") && !currentUser) {
          setReviews([]);
          return;
        }

        const params = new URLSearchParams();

        if (tab === "pending") {
          params.set("status", "pending");
        } else if (tab === "assigned" && currentUser) {
          params.set("reviewerId", currentUser.id);
        } else if (tab === "mine" && currentUser) {
          params.set("authorId", currentUser.id);
        }

        const res = await fetch(`/api/reviews?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to load reviews");
        }
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load reviews"
        );
        setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    fetchReviews(activeTab);
  }, [activeTab, fetchReviews]);

  async function handleAssignToMe(reviewId: string) {
    if (!currentUser) return;
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: currentUser.id,
          status: "in_review",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign review");
      }
      await fetchReviews(activeTab);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to assign review", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "All Pending" },
    { key: "assigned", label: "Assigned to Me" },
    { key: "mine", label: "My Requests" },
  ];

  const canAssign =
    currentUser?.role === "admin" || currentUser?.role === "editor";

  return (
    <Page>
      <PageHeader title="Review Dashboard" />

      <Tabs label="Review views" className="mb-4">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </Tabs>

      {/* Content */}
      {loading ? (
        <p className="text-[13px] text-muted italic">Loading...</p>
      ) : error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-[13px] text-muted italic">No reviews to show.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => {
            const isActioning = actionLoading === review.id;

            return (
              <div
                key={review.id}
                className="border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Article title */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/reviews/${review.id}`}
                        className="text-[14px] font-semibold text-accent hover:underline"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {review.article.title}
                      </Link>
                      <ReviewStatusBadge status={review.status} />
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-[12px] text-muted flex-wrap">
                      <span>
                        Requested by{" "}
                        <span className="text-foreground font-medium">
                          {review.author.displayName || review.author.username}
                        </span>
                      </span>
                      {review.reviewer && (
                        <span>
                          Reviewer:{" "}
                          <span className="text-foreground font-medium">
                            {review.reviewer.displayName ||
                              review.reviewer.username}
                          </span>
                        </span>
                      )}
                      <span>{formatDate(review.createdAt)}</span>
                      {review._count.comments > 0 && (
                        <span>
                          {review._count.comments} comment
                          {review._count.comments !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Message preview */}
                    {review.message && (
                      <p className="mt-1.5 text-[12px] text-foreground opacity-80 line-clamp-2">
                        {review.message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    <Link
                      href={`/reviews/${review.id}`}
                      className="px-2 py-0.5 text-[11px] border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
                    >
                      Open Review
                    </Link>

                    <Link
                      href={`/articles/${review.article.slug}`}
                      className="px-2 py-0.5 text-[11px] border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
                    >
                      Article
                    </Link>

                    {/* Assign to me: available for editors/admins on pending reviews not yet assigned */}
                    {canAssign &&
                      review.status === "pending" &&
                      !review.reviewer && (
                        <button
                          disabled={isActioning}
                          onClick={() => handleAssignToMe(review.id)}
                          className="px-2 py-0.5 text-[11px] border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                        >
                          {isActioning ? "..." : "Assign to me"}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
