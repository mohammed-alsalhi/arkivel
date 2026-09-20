export type DocumentationPage = { slug: string; title: string; excerpt: string | null; version: string; section: string; key: string; order: number };
export type DocumentationIndex = { versions: string[]; pages: DocumentationPage[] };

export function documentationIndex(pages: DocumentationPage[]): DocumentationIndex {
  // Version labels are natural-sorted (v10 after v2), with newest first.
  const versions = [...new Set(pages.map(page => page.version))].sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  return { versions, pages: [...pages].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug)) };
}

export function documentationTarget(index: DocumentationIndex, version: string, current?: DocumentationPage) {
  const equivalent = current?.key ? index.pages.find(page => page.version === version && page.key === current.key) : undefined;
  return equivalent ? `/articles/${encodeURIComponent(equivalent.slug)}` : `/handbook/${encodeURIComponent(version)}`;
}
