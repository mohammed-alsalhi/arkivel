"use client";

import { useEffect, useState, useCallback } from "react";

type RatingData = {
  avg: number | null;
  count: number;
  own: number | null;
};

export default function ArticleRatingWidget({ articleId }: { articleId: string }) {
  const [data, setData] = useState<RatingData | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${articleId}/rating`);
    if (res.ok) setData(await res.json());
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  async function rate(star: number) {
    if (submitting) return;
    setSubmitting(true);
    await fetch(`/api/articles/${articleId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: star }),
    });
    await load();
    setSubmitting(false);
  }

  const displayStar = hoveredStar ?? data?.own ?? 0;

  return (
    <div className="flex items-center gap-3 mt-3 py-2 border-t border-border text-[12px] text-muted">
      <span>Rate this article:</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => rate(s)}
            onMouseEnter={() => setHoveredStar(s)}
            onMouseLeave={() => setHoveredStar(null)}
            disabled={submitting}
            title={`${s} star${s !== 1 ? "s" : ""}`}
            className="transition-colors disabled:opacity-50 p-1 pointer-coarse:p-2.5"
            style={{ lineHeight: 1 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={s <= displayStar ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={s <= displayStar ? "text-warning" : "text-muted"}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </span>
      {data && (
        <span className="text-muted">
          {data.avg !== null ? (
            <>
              {data.avg.toFixed(1)}{" "}
              <span className="opacity-60">({data.count} rating{data.count !== 1 ? "s" : ""})</span>
            </>
          ) : (
            <span className="opacity-60">No ratings yet</span>
          )}
        </span>
      )}
      {data?.own && (
        <span className="opacity-60">· Your rating: {data.own}/5</span>
      )}
    </div>
  );
}
