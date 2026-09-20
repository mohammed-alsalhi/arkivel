export const PUBLISHED_ARTICLE_FILTER = {
  published: true,
  status: "published",
} as const;

export function articleVisibilityFilter(canViewDrafts: boolean) {
  return canViewDrafts ? {} : PUBLISHED_ARTICLE_FILTER;
}

export function canViewArticle(
  article: { published: boolean; status: string },
  canViewDrafts: boolean,
) {
  return canViewDrafts || (article.published && article.status === "published");
}
