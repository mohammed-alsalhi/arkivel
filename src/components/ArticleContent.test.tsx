import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ArticleContent, { prepareArticleHtml } from "./ArticleContent";

const html = '<h2>Core notes</h2><span class="footnote-ref" data-footnote="durable note"></span>';

describe("ArticleContent", () => {
  it("preserves the reader footnote markup and rendered content boundary", () => {
    const output = renderToStaticMarkup(
      <ArticleContent className="article-reader-content" dir="rtl" html={html} />,
    );

    expect(output).toContain('id="article-content"');
    expect(output).toContain('class="wiki-content article-reader-content"');
    expect(output).toContain('dir="rtl"');
    expect(output).toContain('<h2 id="core-notes">Core notes</h2>');
    expect(output).toContain(
      '<div class="footnote-section"><div class="footnote-section-title">notes</div><div class="footnote-item" style="padding-left:1.5rem"><sup style="position:absolute;left:0;font-weight:700;color:var(--color-accent)">[1]</sup> durable note</div></div>',
    );
  });

  it("preserves the share preview footnote markup", () => {
    expect(prepareArticleHtml(html, "share")).toContain(
      '<div><div style="font-weight:600;margin-bottom:0.5rem">notes</div><div style="padding-left:1.5rem"><sup style="position:absolute;left:0;font-weight:700">[1]</sup> durable note</div></div>',
    );
  });

  it("only adds heading ids when content has no footnotes", () => {
    expect(prepareArticleHtml("<h3>Plain section</h3><p>body</p>"))
      .toBe('<h3 id="plain-section">Plain section</h3><p>body</p>');
  });
});
