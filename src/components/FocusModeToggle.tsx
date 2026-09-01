"use client";

import PreferenceToggle from "./PreferenceToggle";
import { useInjectedStyle, usePersistedToggle } from "@/lib/usePersistedToggle";

const FOCUS_CSS = `
#article-content > * { transition: opacity 0.15s; }
#article-content:focus-within > *,
#article-content:hover > * { opacity: 0.3; }
#article-content > *:hover,
#article-content > *:focus-within { opacity: 1 !important; }
`;

export default function FocusModeToggle() {
  const apply = useInjectedStyle("wiki-focus-mode-style", FOCUS_CSS);
  const [active, toggle] = usePersistedToggle("wiki_focus_mode", apply);

  return (
    <PreferenceToggle
      active={active}
      onToggle={toggle}
      titleOn="Disable focus mode"
      titleOff="Enable focus mode (dim non-active paragraphs)"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
      Focus
    </PreferenceToggle>
  );
}
