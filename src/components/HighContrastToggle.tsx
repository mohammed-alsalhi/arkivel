"use client";

import PreferenceToggle from "./PreferenceToggle";
import { usePersistedToggle } from "@/lib/usePersistedToggle";

function apply(active: boolean) {
  document.documentElement.classList.toggle("high-contrast", active);
}

export default function HighContrastToggle() {
  const [active, toggle] = usePersistedToggle("wiki_high_contrast", apply);

  return (
    <PreferenceToggle
      active={active}
      onToggle={toggle}
      titleOn="Exit high-contrast mode"
      titleOff="High-contrast accessibility mode"
      className="w-6 px-0 font-bold"
    >
      A
    </PreferenceToggle>
  );
}
