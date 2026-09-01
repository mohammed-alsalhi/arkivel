"use client";

import PreferenceToggle from "./PreferenceToggle";
import { useInjectedStyle, usePersistedToggle } from "@/lib/usePersistedToggle";

const TEXT_ONLY_CSS =
  "#article-content img, #article-content figure, #article-content video, #article-content iframe { display: none !important; }";

export default function TextOnlyToggle() {
  const apply = useInjectedStyle("wiki-text-only-style", TEXT_ONLY_CSS);
  const [active, toggle] = usePersistedToggle("wiki_text_only", apply);

  return (
    <PreferenceToggle
      active={active}
      onToggle={toggle}
      titleOn="Show images"
      titleOff="Text-only mode (hide images)"
      className="w-6 px-0"
    >
      T
    </PreferenceToggle>
  );
}
