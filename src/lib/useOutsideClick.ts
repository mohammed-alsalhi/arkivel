"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `onOutsideClick` when a mousedown lands outside the element in `ref`.
 * Used by dropdown/popover components to close on outside click.
 * Pass `enabled: false` to skip attaching the listener (e.g. while closed).
 */
export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
  enabled = true
) {
  const callbackRef = useRef(onOutsideClick);

  useEffect(() => {
    callbackRef.current = onOutsideClick;
  });

  useEffect(() => {
    if (!enabled) return;
    function handleMouseDown(e: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) callbackRef.current();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, enabled]);
}
