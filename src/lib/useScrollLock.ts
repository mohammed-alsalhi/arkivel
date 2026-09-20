"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";
let previousPaddingRight = "";
let lockedShell: HTMLElement | null = null;
let previousShellOverflow = "";
let previousShellPaddingRight = "";

/** Hiding a scrollbar reflows the content; reserve its width so nothing jumps. */
function lock(element: HTMLElement): { overflow: string; paddingRight: string } {
  const previous = { overflow: element.style.overflow, paddingRight: element.style.paddingRight };
  const scrollbarWidth = element.offsetWidth - element.clientWidth;
  if (scrollbarWidth > 0) {
    const current = Number.parseFloat(getComputedStyle(element).paddingRight) || 0;
    element.style.paddingRight = `${current + scrollbarWidth}px`;
  }
  element.style.overflow = "hidden";
  return previous;
}

/**
 * Locks page scrolling while `locked` is true. Reference-counted so nested
 * overlays (drawer + modal) don't unlock the page when the inner one closes.
 *
 * In product mode the body is the scroll container, so locking body overflow
 * is enough. In wiki mode the body is already `overflow: hidden` and the real
 * scroll container is `.wiki-content-shell`, so that element gets locked too.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      const bodyLock = lock(document.body);
      previousOverflow = bodyLock.overflow;
      previousPaddingRight = bodyLock.paddingRight;
      const shell = document.querySelector<HTMLElement>(".wiki-content-shell");
      if (shell) {
        lockedShell = shell;
        const shellLock = lock(shell);
        previousShellOverflow = shellLock.overflow;
        previousShellPaddingRight = shellLock.paddingRight;
      }
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
        if (lockedShell) {
          lockedShell.style.overflow = previousShellOverflow;
          lockedShell.style.paddingRight = previousShellPaddingRight;
          lockedShell = null;
        }
      }
    };
  }, [locked]);
}
