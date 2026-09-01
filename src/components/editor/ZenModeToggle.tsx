"use client";

import { useEffect, useState } from "react";

const ZEN_CSS_ID = "wiki-zen-mode-style";

const ZEN_CSS = `
body.editor-zen aside,
body.editor-zen header,
body.editor-zen nav,
body.editor-zen [data-sidebar],
body.editor-zen .wiki-sidebar {
  display: none !important;
}
body.editor-zen main,
body.editor-zen [data-main-content] {
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 1rem !important;
}
body.editor-zen .tiptap {
  min-height: calc(100vh - 120px);
  font-size: 1.05rem;
  line-height: 1.8;
}
body.editor-zen .wiki-tabs {
  display: none !important;
}
`;

export default function ZenModeToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && active) toggle(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  function toggle(force?: boolean) {
    const next = force !== undefined ? force : !active;
    setActive(next);

    if (next) {
      document.body.classList.add("editor-zen");
      if (!document.getElementById(ZEN_CSS_ID)) {
        const style = document.createElement("style");
        style.id = ZEN_CSS_ID;
        style.textContent = ZEN_CSS;
        document.head.appendChild(style);
      }
    } else {
      document.body.classList.remove("editor-zen");
      document.getElementById(ZEN_CSS_ID)?.remove();
    }
  }

  return (
    <button
      type="button"
      onClick={() => toggle()}
      title={active ? "Exit zen mode (Esc)" : "Zen mode — hide chrome, widen editor"}
      className={`h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded transition-colors ${
        active ? "bg-accent text-accent-foreground border-accent" : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
    >
      {active ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      )}
    </button>
  );
}
