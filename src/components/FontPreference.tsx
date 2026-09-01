"use client";

import { useEffect, useState } from "react";

const KEY = "wiki_font_pref";
const fonts: { label: string; value: string; css: string }[] = [
  { label: "Serif", value: "serif", css: "var(--font-serif)" },
  { label: "Sans", value: "sans", css: "'Segoe UI', Arial, sans-serif" },
  { label: "Mono", value: "mono", css: "'Courier New', Courier, monospace" },
];
const STYLE_ID = "wiki-font-pref-style";

function applyFont(css: string) {
  document.getElementById(STYLE_ID)?.remove();
  if (!css) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `#article-content, #article-content .wiki-content { font-family: ${css} !important; }`;
  document.head.appendChild(s);
}

export default function FontPreference() {
  const [value, setValue] = useState("serif");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      const next = !stored || stored === "default" ? "serif" : stored;
      setValue(next);
      const font = fonts.find((f) => f.value === next);
      if (font) applyFont(font.css);
    } catch {
      // ignore
    }
  }, []);

  function onChange(v: string) {
    setValue(v);
    const font = fonts.find((f) => f.value === v);
    applyFont(font?.css || "");
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Article font preference"
      className="ui-select h-6 pointer-coarse:h-9 w-auto min-w-24 px-1 text-[11px]"
    >
      {fonts.map((f) => (
        <option key={f.value} value={f.value}>{f.label}</option>
      ))}
    </select>
  );
}
