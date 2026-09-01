"use client";

import { useEffect, useState } from "react";

type LockHolder = { username: string; displayName: string | null };

type Props = {
  articleId: string;
  isAdmin: boolean;
};

export default function ArticleLockGuard({ articleId, isAdmin }: Props) {
  const [lockedBy, setLockedBy] = useState<LockHolder | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function acquireLock() {
      const res = await fetch(`/api/articles/${articleId}/lock`, { method: "POST" });
      if (res.status === 409) {
        const data = await res.json();
        setLockedBy(data.holder);
      }
    }

    acquireLock();

    // Refresh lock every 5 minutes
    const interval = setInterval(() => {
      fetch(`/api/articles/${articleId}/lock`, { method: "POST" }).catch(() => {});
    }, 5 * 60 * 1000);

    // Release lock when leaving
    function onUnload() {
      navigator.sendBeacon(`/api/articles/${articleId}/lock`, JSON.stringify({ _method: "DELETE" }));
    }
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
      fetch(`/api/articles/${articleId}/lock`, { method: "DELETE" }).catch(() => {});
    };
  }, [articleId]);

  async function forceUnlock() {
    await fetch(`/api/articles/${articleId}/lock`, { method: "DELETE" });
    setLockedBy(null);
    setDismissed(false);
  }

  if (!lockedBy || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-warning-soft border border-warning-border text-warning text-[12px] rounded mb-3">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span className="flex-1">
        <strong>{lockedBy.displayName || lockedBy.username}</strong> is currently editing this article. Your changes may conflict.
      </span>
      <button onClick={() => setDismissed(true)} className="underline text-[11px]">Dismiss</button>
      {isAdmin && (
        <button onClick={forceUnlock} className="underline text-[11px]">Force unlock</button>
      )}
    </div>
  );
}
