"use client";

import { useState, useEffect } from "react";

type Announcement = { id: string; message: string; type: string };

const TYPE_STYLES: Record<string, string> = {
  info:    "bg-info-soft border-info-border text-info",
  warning: "bg-warning-soft border-warning-border text-warning",
  success: "bg-success-soft border-success-border text-success",
  error:   "bg-danger-soft border-danger-border text-danger",
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = JSON.parse(
      sessionStorage.getItem("dismissed_announcements") ?? "[]"
    ) as string[];
    setDismissed(new Set(stored));

    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem(
        "dismissed_announcements",
        JSON.stringify([...next])
      );
      return next;
    });
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 border-b px-4 py-2 text-[13px] ${TYPE_STYLES[a.type] ?? TYPE_STYLES.info}`}
        >
          <span className="flex-1">{a.message}</span>
          <button
            onClick={() => dismiss(a.id)}
            aria-label="Dismiss"
            className="ml-2 opacity-60 hover:opacity-100 text-[16px] leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
