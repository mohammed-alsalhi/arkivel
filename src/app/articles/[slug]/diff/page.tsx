"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArticleWorkflowShell } from "@/components/ArticleWorkflowShell";
import { Button, LoadingState } from "@/components/ui";

type ArticleInfo = {
  id: string;
  title: string;
  slug: string;
  content: string;
};

export default function DiffPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");

  const [fromData, setFromData] = useState<{ title: string; content: string } | null>(null);
  const [toData, setToData] = useState<{ title: string; content: string } | null>(null);
  const [article, setArticle] = useState<ArticleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffMode, setDiffMode] = useState<"line" | "inline">("line");

  useEffect(() => {
    async function load() {
      const articlesRes = await fetch(`/api/articles?slug=${slug}`);
      if (!articlesRes.ok) return;
      const data = await articlesRes.json();
      const found = data.articles?.find((a: ArticleInfo) => a.slug === slug);
      if (!found) return;

      const detailRes = await fetch(`/api/articles/${found.id}`);
      if (!detailRes.ok) return;
      const articleData = await detailRes.json();
      setArticle(articleData);

      if (fromId && fromId !== "current") {
        const res = await fetch(`/api/articles/${found.id}/revisions/${fromId}`);
        if (res.ok) setFromData(await res.json());
      } else {
        setFromData({ title: articleData.title, content: articleData.content });
      }

      if (toId && toId !== "current") {
        const res = await fetch(`/api/articles/${found.id}/revisions/${toId}`);
        if (res.ok) setToData(await res.json());
      } else {
        setToData({ title: articleData.title, content: articleData.content });
      }

      setLoading(false);
    }
    load();
  }, [slug, fromId, toId]);

  if (loading) {
    return <LoadingState label="loading diff…" />;
  }

  if (!fromData || !toData || !article) {
    return <LoadingState label="could not load revisions." />;
  }

  const fromLines = stripHtml(fromData.content).split("\n");
  const toLines = stripHtml(toData.content).split("\n");
  const diffLines = computeDiff(fromLines, toLines);
  const inlineParts = computeInlineDiff(
    stripHtml(fromData.content),
    stripHtml(toData.content)
  );

  return (
    <ArticleWorkflowShell
      active="diff"
      actions={
        <>
          <Button aria-pressed={diffMode === "line"} onClick={() => setDiffMode("line")}>
            line
          </Button>
          <Button aria-pressed={diffMode === "inline"} onClick={() => setDiffMode("inline")}>
            inline
          </Button>
        </>
      }
      slug={slug}
      title={<>difference between revisions of &ldquo;{article.title}&rdquo;</>}
    >
        {diffMode === "line" ? (
          <div className="border border-border text-[13px] font-mono whitespace-pre-wrap break-words">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "added"
                    ? "diff-added px-3 py-0.5"
                    : line.type === "removed"
                    ? "diff-removed px-3 py-0.5"
                    : "px-3 py-0.5"
                }
              >
                <span className="inline-block w-5 text-muted select-none">
                  {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                </span>
                {line.text}
              </div>
            ))}
            {diffLines.length === 0 && (
              <div className="px-3 py-2 text-muted italic">no differences found.</div>
            )}
          </div>
        ) : (
          <div className="border border-border text-[13px] p-3 leading-relaxed whitespace-pre-wrap">
            {inlineParts.map((part, i) => (
              <span
                key={i}
                className={
                  part.type === "added"
                    ? "diff-inline-added"
                    : part.type === "removed"
                    ? "diff-inline-removed"
                    : ""
                }
              >
                {part.text}
              </span>
            ))}
            {inlineParts.length === 0 && (
              <span className="text-muted italic">no differences found.</span>
            )}
          </div>
        )}
    </ArticleWorkflowShell>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/?(p|div|br|h[1-6]|li|ul|ol|blockquote|hr)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type DiffLine = { type: "same" | "added" | "removed"; text: string };

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: "same", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }

  return result.filter((line) => line.text.trim() !== "" || line.type !== "same");
}

type InlinePart = { type: "same" | "added" | "removed"; text: string };

function computeInlineDiff(oldText: string, newText: string): InlinePart[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const m = oldWords.length;
  const n = newWords.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const parts: InlinePart[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      parts.unshift({ type: "same", text: oldWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      parts.unshift({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      parts.unshift({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive same-type parts
  const merged: InlinePart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      last.text += part.text;
    } else {
      merged.push({ ...part });
    }
  }

  return merged;
}
