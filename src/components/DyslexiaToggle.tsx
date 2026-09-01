"use client";

import PreferenceToggle from "./PreferenceToggle";
import { usePersistedToggle } from "@/lib/usePersistedToggle";

function apply(active: boolean) {
  if (active) document.documentElement.setAttribute("data-dyslexia", "1");
  else document.documentElement.removeAttribute("data-dyslexia");
}

export default function DyslexiaToggle() {
  const [enabled, toggle] = usePersistedToggle("dyslexia-mode", apply);

  return (
    <PreferenceToggle
      active={enabled}
      onToggle={toggle}
      titleOn="Disable dyslexia-friendly mode"
      titleOff="Enable dyslexia-friendly mode"
    >
      Aa
    </PreferenceToggle>
  );
}
