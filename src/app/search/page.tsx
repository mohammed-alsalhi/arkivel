"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, EmptyState, Input, Page, PageHeader, Section } from "@/components/ui";
import { getSearchResults } from "@/lib/search-response";
import { TRAIL_ROOTS } from "@/lib/trail";
import { plural } from "@/lib/utils";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  highlightedExcerpt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => setResults(getSearchResults<SearchResult>(payload)))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = draft.trim();
    router.push(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : "/search");
  }

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "search" }]} width="narrow">
      <PageHeader title="search" />

      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="search-page-query" className="sr-only">search arkivel</label>
        <Input
          id="search-page-query"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="search arkivel…"
          autoFocus
        />
        <Button type="submit" variant="primary">search</Button>
      </form>

      {query.length < 2 ? (
        <EmptyState title="enter at least two characters." />
      ) : loading ? (
        <p className="ui-muted" aria-live="polite">searching…</p>
      ) : results.length === 0 ? (
        <EmptyState title={`no pages found for “${query}”.`} />
      ) : (
        <Section title={plural(results.length, "result", "results")}>
          <ol className="wiki-compact-list" aria-label={`search results for ${query}`}>
            {results.map((result) => (
              <li key={result.id} className="wiki-compact-list-item">
                <Link href={`/articles/${result.slug}`} className="wiki-compact-list-title">
                  {result.title}
                </Link>
                {result.highlightedExcerpt && <p>{result.highlightedExcerpt}</p>}
                <div className="flex flex-wrap gap-2 text-[11px] text-muted">
                  {result.category && (
                    <Link href={`/categories/${result.category.slug}`}>{result.category.name}</Link>
                  )}
                  {result.tags.map(({ tag }) => (
                    <Link key={tag.id} href={`/tags/${tag.slug}`}>#{tag.name}</Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </Page>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="ui-muted">loading…</p>}>
      <SearchContent />
    </Suspense>
  );
}
