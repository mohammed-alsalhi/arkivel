export type SearchResultLike = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  highlightedExcerpt?: string | null;
  updatedAt?: string | Date | null;
  category?: unknown;
  tags?: unknown;
  score?: number;
};

function isSearchResult(value: unknown): value is SearchResultLike {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<SearchResultLike>;
  return (
    typeof maybe.id === "string" &&
    typeof maybe.title === "string" &&
    typeof maybe.slug === "string"
  );
}

export function getSearchResults<T extends SearchResultLike>(
  payload: unknown,
): T[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  return Array.isArray(results) ? results.filter(isSearchResult) as T[] : [];
}
