"use client";

import { useRef, useState } from "react";
import { useOutsideClick } from "@/lib/useOutsideClick";

const LOCALES = [
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "he", label: "Hebrew" },
  { code: "ja", label: "Japanese" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
];

interface Props {
  articleId: string;
}

export default function TranslateButton({ articleId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);

  async function translate(locale: string) {
    setOpen(false);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLocale: locale }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="ui-button disabled:opacity-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {loading ? "Translating…" : (
          <span className="flex items-center gap-1">
            Translate
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div className="ui-dropdown min-w-[140px]">
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => translate(code)}
              className="ui-dropdown-item"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {result?.id && (
        <span className="ml-2 text-[11px] text-success">Translation created as draft</span>
      )}
      {result?.error && (
        <span className="ml-2 text-[11px] text-danger">{result.error}</span>
      )}
    </div>
  );
}
