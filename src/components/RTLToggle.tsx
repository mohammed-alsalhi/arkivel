"use client";

import { useState } from "react";
import PreferenceToggle from "./PreferenceToggle";

interface Props {
  defaultDir: string;
}

export default function RTLToggle({ defaultDir }: Props) {
  const [dir, setDir] = useState(defaultDir);

  function toggle() {
    const next = dir === "rtl" ? "ltr" : "rtl";
    setDir(next);
    // Apply to the article content wrapper only
    const wrapper = document.getElementById("article-content");
    if (wrapper) wrapper.dir = next;
  }

  return (
    <PreferenceToggle
      active={dir === "rtl"}
      onToggle={toggle}
      titleOn="Switch to LTR reading"
      titleOff="Switch to RTL reading"
      aria-label="Toggle text direction"
    >
      {dir === "rtl" ? "LTR" : "RTL"}
    </PreferenceToggle>
  );
}
