"use client";

import { useCopyToClipboard } from "@/lib/useCopyToClipboard";

export default function CopyPlainTextButton({ html }: { html: string }) {
  const { copied, copy } = useCopyToClipboard(1500);

  function handleCopy() {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    copy(temp.innerText || temp.textContent || "");
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy article as plain text"
      className="ui-button"
    >
      {copied ? (
        "Copied!"
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Plain text
        </>
      )}
    </button>
  );
}
