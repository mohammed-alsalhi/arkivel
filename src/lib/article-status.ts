export const ARTICLE_STATUSES = ["published", "draft", "review"] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export function isArticleStatus(value: unknown): value is ArticleStatus {
  return typeof value === "string" && ARTICLE_STATUSES.includes(value as ArticleStatus);
}
