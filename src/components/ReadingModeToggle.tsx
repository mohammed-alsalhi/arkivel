"use client";

import { useEffect } from "react";
import PreferenceToggle from "./PreferenceToggle";
import { usePersistedToggle } from "@/lib/usePersistedToggle";

function apply(active: boolean) {
  if (active) document.documentElement.setAttribute("data-reading-mode", "1");
  else document.documentElement.removeAttribute("data-reading-mode");
}

export default function ReadingModeToggle() {
  const [active, toggle] = usePersistedToggle("readingMode", apply);

  // Keyboard shortcut: R (when not in input/editor)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (e.key === "r" && !isInput && !e.ctrlKey && !e.metaKey) {
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <PreferenceToggle
      active={active}
      onToggle={toggle}
      titleOn="Exit reading mode (R)"
      titleOff="Enter reading mode (R)"
    >
      {active ? "Exit reading mode" : "Reading mode"}
    </PreferenceToggle>
  );
}
