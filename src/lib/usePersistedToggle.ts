"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared state logic for the reading-preference toggles (dyslexia, high
 * contrast, night mode, text-only, focus mode, reading mode, ...).
 *
 * Persists a boolean under `key` in localStorage ("1" = on) and calls
 * `apply(active)` whenever the value changes so the caller can mutate
 * `document.documentElement` (attribute/class) or inject a stylesheet.
 *
 * Hydration-safe: state always starts `false` and localStorage is only read
 * in an effect after mount (per CLAUDE.md, never in a useState initializer).
 */
export function usePersistedToggle(
  key: string,
  apply: (active: boolean) => void
): readonly [boolean, () => void] {
  const [active, setActive] = useState(false);
  const applyRef = useRef(apply);

  useEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(key) === "1";
    } catch {
      // ignore (private mode / blocked storage)
    }
    if (stored) {
      // Sanctioned hydration pattern (CLAUDE.md): localStorage may only be
      // read after mount, so the stored value has to be applied via setState
      // in this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(true);
      applyRef.current(true);
    }
  }, [key]);

  const toggle = useCallback(() => {
    const next = !active;
    setActive(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // ignore
    }
    applyRef.current(next);
  }, [active, key]);

  return [active, toggle] as const;
}

/**
 * Returns an `apply(active)` callback that injects a `<style id={id}>` tag
 * with `css` into <head> when active, and removes it when inactive.
 * Compose with usePersistedToggle for style-injecting toggles.
 */
export function useInjectedStyle(id: string, css: string) {
  return useCallback(
    (active: boolean) => {
      if (active) {
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
      } else {
        document.getElementById(id)?.remove();
      }
    },
    [id, css]
  );
}
