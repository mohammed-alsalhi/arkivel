"use client";

import { useState } from "react";

const CW_LABELS: Record<string, string> = {
  spoilers: "Spoilers",
  violence: "Violence",
  mature: "Mature content",
  "sensitive-topics": "Sensitive topics",
  "strong-language": "Strong language",
  medical: "Medical / graphic",
};

export default function ContentWarningBanner({ warnings }: { warnings: string[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (!warnings || warnings.length === 0 || dismissed) return null;

  const labels = warnings.map((w) => CW_LABELS[w] || w);

  return (
    <div className="mb-4 border border-warning-border rounded bg-warning-soft px-4 py-3 text-[13px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-semibold text-warning">
            Content warning:
          </span>{" "}
          <span className="text-warning">{labels.join(", ")}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-warning hover:opacity-80 text-[11px] border border-warning-border rounded px-1.5 py-0.5 pointer-coarse:py-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
