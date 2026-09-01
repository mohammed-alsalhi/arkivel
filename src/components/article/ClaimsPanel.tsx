"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLAIM_REVIEW_STATUS_LABELS,
  extractClaims,
  type ClaimReviewStatus,
  type ExtractedClaim,
} from "@/lib/claims";

type ClaimReviewRecord = {
  id: string;
  claimHash: string;
  claimText: string;
  status: ClaimReviewStatus;
  note: string | null;
  reviewer: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  updatedAt: string;
};

type Props = {
  articleId: string;
  html: string;
};

const LEVEL_STYLE = {
  certain: "border-l-success bg-success-soft",
  probable: "border-l-warning bg-warning-soft",
  disputed: "border-l-danger bg-danger-soft",
};

const LEVEL_BADGE = {
  certain: "bg-success-soft text-success",
  probable: "bg-warning-soft text-warning",
  disputed: "bg-danger-soft text-danger",
};

const REVIEW_BADGE: Record<ClaimReviewStatus, string> = {
  unreviewed: "bg-surface border border-border text-muted",
  approved: "bg-success-soft text-success",
  needs_source: "bg-warning-soft text-warning",
  disputed: "bg-danger-soft text-danger",
  rejected: "bg-surface-hover text-foreground",
};

const REVIEW_ACTIONS: Array<{ status: ClaimReviewStatus; label: string }> = [
  { status: "approved", label: "Approve" },
  { status: "needs_source", label: "Needs source" },
  { status: "disputed", label: "Dispute" },
  { status: "rejected", label: "Reject" },
];

function reviewerName(review: ClaimReviewRecord): string {
  return review.reviewer?.displayName || review.reviewer?.username || "Unknown reviewer";
}

export default function ClaimsPanel({ articleId, html }: Props) {
  const [open, setOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewMap, setReviewMap] = useState<Record<string, ClaimReviewRecord>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingHash, setSavingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claims = useMemo(() => extractClaims(html), [html]);

  useEffect(() => {
    if (claims.length === 0) return;

    let cancelled = false;

    async function loadClaimReviews() {
      try {
        const [reviewsResponse, authResponse] = await Promise.all([
          fetch(`/api/articles/${articleId}/claim-reviews`),
          fetch("/api/auth/check"),
        ]);

        if (!cancelled && reviewsResponse.ok) {
          const reviews = (await reviewsResponse.json()) as ClaimReviewRecord[];
          const nextReviewMap: Record<string, ClaimReviewRecord> = {};
          const nextNoteDrafts: Record<string, string> = {};

          for (const review of reviews) {
            nextReviewMap[review.claimHash] = review;
            nextNoteDrafts[review.claimHash] = review.note ?? "";
          }

          setReviewMap(nextReviewMap);
          setNoteDrafts(nextNoteDrafts);
        }

        if (!cancelled && authResponse.ok) {
          const auth = await authResponse.json();
          const role = auth.user?.role;
          setCanReview(role === "admin" || role === "editor");
        }
      } catch {
        if (!cancelled) {
          setError("Claim review status is unavailable.");
        }
      }
    }

    loadClaimReviews();

    return () => {
      cancelled = true;
    };
  }, [articleId, claims.length]);

  if (claims.length === 0) return null;

  const certain = claims.filter((claim) => claim.level === "certain").length;
  const probable = claims.filter((claim) => claim.level === "probable").length;
  const disputed = claims.filter((claim) => claim.level === "disputed").length;
  const reviewed = claims.filter((claim) => {
    const status = reviewMap[claim.hash]?.status ?? "unreviewed";
    return status !== "unreviewed";
  }).length;

  async function updateClaim(claim: ExtractedClaim, status: ClaimReviewStatus) {
    setError(null);
    setSavingHash(`${claim.hash}:${status}`);

    try {
      const response = await fetch(`/api/articles/${articleId}/claim-reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimHash: claim.hash,
          claimText: claim.text,
          status,
          note: noteDrafts[claim.hash] ?? reviewMap[claim.hash]?.note ?? "",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save claim review");
      }

      const saved = (await response.json()) as ClaimReviewRecord;
      setReviewMap((current) => ({ ...current, [claim.hash]: saved }));
      setNoteDrafts((current) => ({ ...current, [claim.hash]: saved.note ?? "" }));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save claim review"
      );
    } finally {
      setSavingHash(null);
    }
  }

  return (
    <div className="my-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex flex-wrap items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors group"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="font-medium">
          {claims.length} claim{claims.length !== 1 ? "s" : ""} in this article
        </span>
        <span className="flex flex-wrap gap-1">
          {certain > 0 && <span className="text-[10px] font-bold text-success">{certain} certain</span>}
          {probable > 0 && <span className="text-[10px] font-bold text-warning">{probable} probable</span>}
          {disputed > 0 && <span className="text-[10px] font-bold text-danger">{disputed} disputed</span>}
          {reviewed > 0 && <span className="text-[10px] font-bold text-foreground">{reviewed} reviewed</span>}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 border border-border rounded p-3 bg-surface">
          {error && (
            <p className="text-[12px] text-danger">{error}</p>
          )}

          {claims.map((claim, index) => {
            const review = reviewMap[claim.hash];
            const status = review?.status ?? "unreviewed";
            const savedAt = review
              ? new Date(review.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;

            return (
              <div key={`${claim.hash}-${index}`} className={`border-l-4 pl-3 py-2 text-[13px] ${LEVEL_STYLE[claim.level]}`}>
                <div className="flex flex-wrap items-start gap-2">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${LEVEL_BADGE[claim.level]}`}>
                    {claim.level}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${REVIEW_BADGE[status]}`}>
                    {CLAIM_REVIEW_STATUS_LABELS[status]}
                  </span>
                  <span className="min-w-0 flex-1 text-foreground leading-snug">{claim.text}</span>
                </div>

                {review && (
                  <p className="mt-1 text-[11px] text-muted">
                    {reviewerName(review)}{savedAt ? ` on ${savedAt}` : ""}
                  </p>
                )}

                {review?.note && (
                  <p className="mt-1 text-[12px] text-foreground/80">{review.note}</p>
                )}

                {canReview && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={noteDrafts[claim.hash] ?? ""}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [claim.hash]: event.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-primary"
                      placeholder="Reviewer note"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {REVIEW_ACTIONS.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          onClick={() => updateClaim(claim, action.status)}
                          disabled={savingHash !== null}
                          className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
                            status === action.status
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary"
                          }`}
                        >
                          {savingHash === `${claim.hash}:${action.status}` ? "Saving..." : action.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateClaim(claim, status)}
                        disabled={savingHash !== null}
                        className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
