"use client";

import { useState } from "react";
import { useAdmin } from "@/components/AdminContext";

export default function ArticleAdoptionBanner({
  articleId,
  adoptedBy,
}: {
  articleId: string;
  adoptedBy: string | null;
}) {
  const isAdmin = useAdmin();
  const [adopted, setAdopted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (adopted) return null;

  async function adopt() {
    setLoading(true);
    await fetch(`/api/articles/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAbandoned: false }),
    });
    setAdopted(true);
    setLoading(false);
  }

  return (
    <div className="wiki-notice border-l-3 border-l-warning flex items-start gap-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <div className="flex-1">
        <strong>This article has been marked as abandoned</strong> — the original author is no longer maintaining it.
        {adoptedBy
          ? ` Adopted by ${adoptedBy}.`
          : " Would you like to adopt and maintain it?"}
        {!adoptedBy && isAdmin && (
          <button
            onClick={adopt}
            disabled={loading}
            className="ml-3 h-5 px-2 text-[11px] border border-warning-border rounded text-warning hover:bg-warning-soft transition-colors"
          >
            {loading ? "Adopting…" : "Adopt this article"}
          </button>
        )}
      </div>
    </div>
  );
}
