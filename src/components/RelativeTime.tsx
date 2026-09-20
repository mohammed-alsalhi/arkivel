"use client";

import { useEffect, useState } from "react";
import { formatDate, formatRelativeDate } from "@/lib/utils";

type RelativeTimeProps = {
  date: Date | string;
  prefix?: string;
  className?: string;
};

/**
 * Renders the absolute date on the server (hydration-safe) and swaps to a
 * relative "3 days ago" on the client, refreshing every minute.
 */
export default function RelativeTime({ date, prefix, className }: RelativeTimeProps) {
  const [relative, setRelative] = useState<string | null>(null);
  const value = typeof date === "string" ? new Date(date) : date;

  useEffect(() => {
    const update = () => setRelative(formatRelativeDate(value));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the instant changes
  }, [value.getTime()]);

  return (
    <time className={className} dateTime={value.toISOString()} title={formatDate(value)}>
      {prefix}
      {relative ?? formatDate(value)}
    </time>
  );
}
