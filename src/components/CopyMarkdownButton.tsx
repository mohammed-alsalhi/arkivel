"use client";

import { useCopyToClipboard } from "@/lib/useCopyToClipboard";

interface Props {
  markdown: string | null | undefined;
  title: string;
}

export default function CopyMarkdownButton({ markdown, title }: Props) {
  const { copied, copy } = useCopyToClipboard();

  if (!markdown) return null;

  return (
    <button
      onClick={() => copy(`# ${title}\n\n${markdown}`)}
      title="Copy article as Markdown"
      className="ui-button"
    >
      {copied ? "Copied!" : "Copy MD"}
    </button>
  );
}
