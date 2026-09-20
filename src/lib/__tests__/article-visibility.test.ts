import { describe, expect, it } from "vitest";
import { articleVisibilityFilter, canViewArticle, PUBLISHED_ARTICLE_FILTER } from "@/lib/article-visibility";

describe("article visibility", () => {
  it("keeps drafts private unless the viewer can manage them", () => {
    expect(articleVisibilityFilter(false)).toEqual(PUBLISHED_ARTICLE_FILTER);
    expect(articleVisibilityFilter(true)).toEqual({});
    expect(canViewArticle({ published: false, status: "draft" }, false)).toBe(false);
    expect(canViewArticle({ published: true, status: "published" }, false)).toBe(true);
    expect(canViewArticle({ published: false, status: "draft" }, true)).toBe(true);
  });
});
