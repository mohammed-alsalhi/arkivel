"use client";

import { useEffect, useRef, useState } from "react";
import { useOutsideClick } from "@/lib/useOutsideClick";

type Width = "narrow" | "reading" | "default" | "wide";
const KEY = "wiki_article_width";

const WIDTHS: { value: Width; label: string; style: string }[] = [
  { value: "narrow", label: "Narrow (65ch)", style: "max-width:65ch;margin:0 auto;" },
  { value: "reading", label: "Reading (80ch)", style: "max-width:80ch;margin:0 auto;" },
  { value: "default", label: "Full width", style: "" },
];

export default function ArticleWidthPreference() {
  const [current, setCurrent] = useState<Width>("default");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Width | null;
      if (saved) setCurrent(saved);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const style = WIDTHS.find((w) => w.value === current)?.style ?? "";
    let el = document.getElementById("wiki-width-pref-style") as HTMLStyleElement | null;
    if (!style) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = "wiki-width-pref-style";
      document.head.appendChild(el);
    }
    el.textContent = `#article-content { ${style} }`;
  }, [current]);

  function choose(w: Width) {
    setCurrent(w);
    setOpen(false);
    try { localStorage.setItem(KEY, w); } catch { /* noop */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Article width"
        className="ui-button w-6 px-0"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
      {open && (
        <div className="ui-dropdown min-w-[100px]">
          {WIDTHS.map((w) => (
            <button
              key={w.value}
              onClick={() => choose(w.value)}
              className={`ui-dropdown-item ${current === w.value ? "text-accent font-bold" : ""}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
