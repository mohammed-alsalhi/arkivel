"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SearchHistory, { recordSearch } from "@/components/SearchHistory";
import {
  getSearchResults,
  getSearchSuggestions,
  getSemanticSearchResults,
} from "@/lib/search-response";
import { LoadingState, Page, PageHeader, Section, SectionPanel } from "@/components/ui";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  highlightedExcerpt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  parentId: string | null;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [qaAnswer, setQaAnswer] = useState<{ answer: string; sources: { id: string; title: string; slug: string }[] } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [federatedResults, setFederatedResults] = useState<{ peerName: string; peerUrl: string; id: string; title: string; slug: string; excerpt: string | null; url: string }[]>([]);
  const [federatedLoading, setFederatedLoading] = useState(false);

  // Filter state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [wordCountMin, setWordCountMin] = useState("");
  const [wordCountMax, setWordCountMax] = useState("");

  // Fetch categories and tags on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});

    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTags(data);
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    if (!q || q.length < 2) {
      setResults([]);
      setSemanticResults([]);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({ q });
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (wordCountMin) params.set("wordCountMin", wordCountMin);
    if (wordCountMax) params.set("wordCountMax", wordCountMax);
    if (semanticMode) params.set("semantic", "1");

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      const nextResults = getSearchResults<SearchResult>(data);
      const nextSemanticResults = getSemanticSearchResults<SearchResult>(data);
      const suggestions = getSearchSuggestions(data);
      const totalResults = nextResults.length + nextSemanticResults.length;

      setResults(nextResults);
      setSemanticResults(nextSemanticResults);

      if (totalResults > 0) {
        recordSearch(q);
        setDidYouMean(null);
      } else if (suggestions.length > 0) {
        setDidYouMean(suggestions[0]);
      } else {
        // Did-you-mean: find a title whose words overlap with query words
        const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        if (words.length > 0) {
          const titlesRes = await fetch("/api/articles/titles");
          if (titlesRes.ok) {
            const titles: { title: string; slug: string }[] = await titlesRes.json();
            let best: { title: string; slug: string } | null = null;
            let bestScore = 0;
            for (const t of titles) {
              const lower = t.title.toLowerCase();
              const score = words.filter((w) => lower.includes(w)).length;
              if (score > bestScore) { bestScore = score; best = t; }
            }
            setDidYouMean(bestScore > 0 ? best!.title : null);
          }
        } else {
          setDidYouMean(null);
        }
      }
    } catch {
      setResults([]);
      setSemanticResults([]);
    } finally {
      setLoading(false);
    }
  }, [q, selectedCategory, selectedTags, dateFrom, dateTo, wordCountMin, wordCountMax, semanticMode]);

  // Search when query or filters change
  useEffect(() => {
    doSearch();
  }, [doSearch]);

  // Federated search
  useEffect(() => {
    if (!q || q.length < 2) { setFederatedResults([]); return; }
    setFederatedLoading(true);
    fetch(`/api/federated-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFederatedResults(data); })
      .catch(() => {})
      .finally(() => setFederatedLoading(false));
  }, [q]);

  // Q&A: trigger when query looks like a question
  useEffect(() => {
    if (!q || q.length < 5) { setQaAnswer(null); return; }
    const isQuestion = /^(what|who|when|where|why|how|is|are|can|does|did|was|were)\b/i.test(q) || q.endsWith("?");
    if (!isQuestion) { setQaAnswer(null); return; }

    setQaLoading(true);
    setQaAnswer(null);
    fetch("/api/ai/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.answer) setQaAnswer(data); })
      .catch(() => {})
      .finally(() => setQaLoading(false));
  }, [q]);

  function toggleTag(slug: string) {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function clearFilters() {
    setSelectedCategory("");
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
    setWordCountMin("");
    setWordCountMax("");
  }

  const hasFilters = selectedCategory || selectedTags.length > 0 || dateFrom || dateTo || wordCountMin || wordCountMax;
  const resultCount = results.length + semanticResults.length;

  if (!q || q.length < 2) {
    return (
      <Page>
        <PageHeader
          kicker="Discovery"
          title="Search"
          description="Enter at least 2 characters to search titles, excerpts, article bodies, and semantic matches."
          actions={
            <>
              <Link href="/articles" className="ui-button">Article index</Link>
              <Link href="/tags" className="ui-button">Tags</Link>
            </>
          }
        />
        <SearchHistory currentQuery={q} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        kicker="Discovery"
        title="Search results"
        description={
          <>
            {loading
              ? "Searching..."
              : `${resultCount} result${resultCount !== 1 ? "s" : ""} for "${q}"`}
            {hasFilters && " (filtered)"}
          </>
        }
        actions={
          <>
            <button
              onClick={() => setSemanticMode((v) => !v)}
              title="Semantic search uses AI vector embeddings to find conceptually related articles, not just keyword matches"
              aria-pressed={semanticMode}
              className="ui-button"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {semanticMode ? "Semantic on" : "Semantic"}
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="ui-button"
              aria-pressed={showAdvanced}
            >
              {showAdvanced ? "Hide filters" : "Filters"}
            </button>
          </>
        }
      />

      {/* Q&A answer panel */}
      {(qaLoading || qaAnswer) && (
        <div className="mb-4 border border-info-border bg-info-soft px-4 py-3">
          <p className="text-[11px] font-bold text-info uppercase mb-1">Direct answer</p>
          {qaLoading ? (
            <p className="text-[13px] text-muted italic">Searching for an answer...</p>
          ) : qaAnswer ? (
            <>
              <p className="text-[13px] text-foreground">{qaAnswer.answer}</p>
              {qaAnswer.sources.length > 0 && (
                <p className="text-[11px] text-muted mt-2">
                  Sources:{" "}
                  {qaAnswer.sources.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <a href={`/articles/${s.slug}`} className="text-accent hover:underline">{s.title}</a>
                    </span>
                  ))}
                </p>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Filter sidebar */}
        {showAdvanced && (
          <aside className="w-full flex-shrink-0 lg:w-56">
            <SectionPanel title="Filters" bodyClassName="space-y-3">
                {/* Category filter */}
                <div>
                  <label className="block text-[11px] text-muted font-bold mb-0.5">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="ui-select"
                  >
                    <option value="">All categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag multi-select */}
                <div>
                  <label className="block text-[11px] text-muted font-bold mb-0.5">
                    Tags
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-border bg-surface p-1">
                    {tags.length === 0 && (
                      <p className="text-[11px] text-muted italic px-1">No tags</p>
                    )}
                    {tags.filter((t) => !t.parentId).map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-surface-hover cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.slug)}
                          onChange={() => toggleTag(tag.slug)}
                          className="rounded"
                        />
                        {tag.color && (
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-[11px] text-muted font-bold mb-0.5">
                    Date range
                  </label>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="ui-input"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="ui-input"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Word count range */}
                <div>
                  <label className="block text-[11px] text-muted font-bold mb-0.5">
                    Word count
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={wordCountMin}
                      onChange={(e) => setWordCountMin(e.target.value)}
                      placeholder="Min"
                      className="ui-input"
                    />
                    <span className="text-muted text-[11px] shrink-0">–</span>
                    <input
                      type="number"
                      min="0"
                      value={wordCountMax}
                      onChange={(e) => setWordCountMax(e.target.value)}
                      placeholder="Max"
                      className="ui-input"
                    />
                  </div>
                </div>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="ui-button ui-button-danger"
                  >
                    Clear filters
                  </button>
                )}
            </SectionPanel>
          </aside>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {results.length === 0 && semanticResults.length === 0 && !loading ? (
            <div className="wiki-notice">
              There were no results matching the query.{" "}
              {hasFilters && (
                <>
                  Try{" "}
                  <button onClick={clearFilters} className="text-accent hover:underline">
                    clearing filters
                  </button>
                  , or{" "}
                </>
              )}
              You can <Link href="/articles/new">create an article</Link> with this title.
              {didYouMean && (
                <p className="mt-1 text-[12px]">
                  Did you mean:{" "}
                  <Link href={`/search?q=${encodeURIComponent(didYouMean)}`} className="text-accent hover:underline font-medium">
                    {didYouMean}
                  </Link>
                  ?
                </p>
              )}
            </div>
          ) : (
            <ul className="text-[13px] space-y-2">
              {results.map((article) => (
                <li key={article.id} className="border-b border-border pb-2">
                  <div>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="font-bold text-[15px] text-wiki-link"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {article.title}
                    </Link>
                    {article.category && (
                      <span className="text-muted text-[12px] ml-2">
                        ({article.category.name})
                      </span>
                    )}
                  </div>
                  {article.highlightedExcerpt && (
                    <p
                      className="text-muted mt-0.5 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: article.highlightedExcerpt }}
                    />
                  )}
                  <p className="text-muted text-[11px] mt-0.5">
                    Last edited{" "}
                    {new Date(article.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {article.tags.length > 0 && (
                      <>
                        {" "}
                        &mdash; Tags: {article.tags.map(({ tag }) => tag.name).join(", ")}
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {semanticResults.length > 0 && (
            <Section className="mt-5" title="Semantic matches">
              <ul className="space-y-2 text-[13px]">
                {semanticResults.map((article) => (
                  <li key={article.id} className="border-b border-border pb-2">
                    <div>
                      <Link
                        href={`/articles/${article.slug}`}
                        className="font-bold text-[15px] text-wiki-link"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {article.title}
                      </Link>
                      {article.category && (
                        <span className="ml-2 text-[12px] text-muted">
                          ({article.category.name})
                        </span>
                      )}
                    </div>
                    {(article.highlightedExcerpt || article.excerpt) && (
                      <p
                        className="mt-0.5 text-muted leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: article.highlightedExcerpt || article.excerpt || "",
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {/* Federated results */}
      {(federatedLoading || federatedResults.length > 0) && (
        <Section className="mt-6" title="Results from other wikis">
          {federatedLoading ? (
            <p className="text-[13px] text-muted italic">Searching federated wikis…</p>
          ) : (
            <ul className="text-[13px] space-y-2">
              {federatedResults.map((r) => (
                <li key={`${r.peerUrl}/${r.id}`} className="border-b border-border pb-2">
                  <div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[15px]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {r.title}
                    </a>
                    <span className="text-muted text-[12px] ml-2">({r.peerName})</span>
                  </div>
                  {r.excerpt && (
                    <p className="text-muted mt-0.5 leading-relaxed">{r.excerpt}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </Page>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <LoadingState />
      }
    >
      <SearchContent />
    </Suspense>
  );
}
