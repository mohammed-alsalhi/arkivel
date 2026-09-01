"use client";

import { useCopyToClipboard } from "@/lib/useCopyToClipboard";

type Props = {
  text: string;
  label?: string;
  className?: string;
};

export default function CopyButton({ text, label = "Copy", className = "" }: Props) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={() => copy(text)}
      className={`ui-button ${className}`}
      title={copied ? "Copied!" : label}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
