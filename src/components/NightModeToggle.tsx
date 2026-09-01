"use client";

import PreferenceToggle from "./PreferenceToggle";
import { usePersistedToggle } from "@/lib/usePersistedToggle";

function apply(active: boolean) {
  document.documentElement.classList.toggle("night-reading", active);
}

export default function NightModeToggle() {
  const [active, toggle] = usePersistedToggle("wiki_night_mode", apply);

  return (
    <PreferenceToggle
      active={active}
      onToggle={toggle}
      titleOn="Exit night mode"
      titleOff="Night reading mode (warm)"
      className="w-6 px-0"
    >
      {active ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"/></svg>
      )}
    </PreferenceToggle>
  );
}
