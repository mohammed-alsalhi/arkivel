import { addHeadingIds } from "@/components/TableOfContents";

type FootnotePresentation = "reader" | "share";

type ArticleContentProps = {
  className?: string;
  dir?: "ltr" | "rtl";
  footnotePresentation?: FootnotePresentation;
  html: string;
};

function appendFootnoteSection(html: string, presentation: FootnotePresentation): string {
  const footnotes: string[] = [];
  const regex = /data-footnote="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) footnotes.push(match[1]);
  if (footnotes.length === 0) return html;

  if (presentation === "share") {
    const items = footnotes
      .map(
        (note, index) =>
          `<div style="padding-left:1.5rem"><sup style="position:absolute;left:0;font-weight:700">[${index + 1}]</sup> ${note}</div>`,
      )
      .join("");

    return `${html}<div><div style="font-weight:600;margin-bottom:0.5rem">notes</div>${items}</div>`;
  }

  const items = footnotes
    .map(
      (note, index) =>
        `<div class="footnote-item" style="padding-left:1.5rem"><sup style="position:absolute;left:0;font-weight:700;color:var(--color-accent)">[${index + 1}]</sup> ${note}</div>`,
    )
    .join("");

  return `${html}<div class="footnote-section"><div class="footnote-section-title">notes</div>${items}</div>`;
}

export function prepareArticleHtml(
  html: string,
  footnotePresentation: FootnotePresentation = "reader",
): string {
  return addHeadingIds(appendFootnoteSection(html, footnotePresentation));
}

export default function ArticleContent({
  className,
  dir,
  footnotePresentation = "reader",
  html,
}: ArticleContentProps) {
  return (
    <div
      id="article-content"
      className={["wiki-content", className].filter(Boolean).join(" ")}
      dir={dir}
      dangerouslySetInnerHTML={{ __html: prepareArticleHtml(html, footnotePresentation) }}
    />
  );
}
