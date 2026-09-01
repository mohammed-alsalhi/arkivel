"use client";

import { useState, useEffect, useCallback } from "react";

type Props = {
  articleId: string;
  hasPassword: boolean;
  children: React.ReactNode;
};

export default function ArticlePasswordWrapper({ articleId, hasPassword, children }: Props) {
  // Start unlocked if there's no password; otherwise check sessionStorage
  const [unlocked, setUnlocked] = useState(!hasPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hasPassword) {
      if (sessionStorage.getItem(`article_unlocked_${articleId}`) === "1") {
        setUnlocked(true);
      }
    }
    setHydrated(true);
  }, [articleId, hasPassword]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`/api/articles/${articleId}/check-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(`article_unlocked_${articleId}`, "1");
        setUnlocked(true);
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Could not verify password. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [articleId, password]);

  // Not password-protected or already unlocked → show content
  if (!hasPassword || unlocked) return <>{children}</>;

  // Prevent hydration flash before sessionStorage is checked
  if (!hydrated) return null;

  return (
    <div className="border border-border bg-surface px-5 py-10 flex flex-col items-center gap-5 text-center">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div>
        <div className="text-[16px] font-semibold text-heading mb-1" style={{ fontFamily: "var(--font-serif)" }}>
          Password protected
        </div>
        <div className="text-[13px] text-muted">Enter the password to read this article.</div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2 w-full max-w-xs">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password…"
          className="w-full border border-border bg-background px-3 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none"
          autoFocus
        />
        {error && <p className="text-[12px] text-wiki-link-broken">{error}</p>}
        <button
          type="submit"
          disabled={checking || !password}
          className="bg-accent px-5 py-1.5 text-[13px] font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {checking ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
