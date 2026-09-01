"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared clipboard logic for the Copy* buttons: writes text via the async
 * clipboard API with a hidden-textarea fallback, and exposes a `copied`
 * flag that resets after `resetAfterMs` (default 2000ms).
 */
export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for browsers without the async clipboard API
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetAfterMs);
    },
    [resetAfterMs]
  );

  return { copied, copy } as const;
}
