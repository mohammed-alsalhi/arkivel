"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useOutsideClick } from "@/lib/useOutsideClick";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  article: {
    id: string;
    title: string;
    slug: string;
  } | null;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is logged in via session
    let cancelled = false;
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setHasUser(true);
          fetchNotifications();
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch {
      // Silently fail
    }
  }

  useOutsideClick(dropdownRef, () => setOpen(false));

  // Periodically refresh notifications
  useEffect(() => {
    if (!hasUser) return;
    const interval = setInterval(fetchNotifications, 60000); // Every 60s
    return () => clearInterval(interval);
  }, [hasUser]);

  if (!hasUser) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });

    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="ui-icon-button relative"
        title="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Bell icon (SVG) */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 1.5c-2.5 0-4 1.5-4 4v2.5L2.5 10v1h11v-1L12 8V5.5c0-2.5-1.5-4-4-4z" />
          <path d="M6.5 12a1.5 1.5 0 003 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-wiki-link-broken text-background text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="ui-dropdown wiki-notification-dropdown">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border-light">
            <span className="text-[12px] font-bold text-heading">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="ui-button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted text-[12px] italic">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                className={`px-3 py-2 border-b border-border-light text-[12px] hover:bg-surface-hover ${
                  !n.read ? "bg-accent-soft" : ""
                  }`}
                >
                  {n.article ? (
                    <Link
                      href={`/articles/${n.article.slug}`}
                      className="text-foreground hover:text-accent"
                      onClick={() => setOpen(false)}
                    >
                      {n.message}
                    </Link>
                  ) : (
                    <span className="text-foreground">{n.message}</span>
                  )}
                  <div className="text-[10px] text-muted mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border-light text-center">
              <Link
                href="/watchlist"
                className="text-[11px] text-accent hover:underline"
                onClick={() => setOpen(false)}
              >
                View watchlist
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
