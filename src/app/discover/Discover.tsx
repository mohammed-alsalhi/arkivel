"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, EmptyState, Input, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import type { MediaSearchHit } from "@/modules/media/types";

type Props = { canSave: boolean; live: boolean };

export default function Discover({ canSave, live }: Props) {
  const { addToast } = useToast();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchHit[]>([]);
  const [hasWatchlist, setHasWatchlist] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/media/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "unable to search right now. try again.");
        setResults(payload.results);
        setHasWatchlist(payload.hasWatchlist);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setResults([]);
        setError(cause instanceof Error ? cause.message : "unable to search right now. try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  async function save(hit: MediaSearchHit) {
    const key = `${hit.media}:${hit.id}`;
    setSaving(key);
    try {
      const response = await fetch("/api/media/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media: hit.media, id: hit.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "unable to save this title. try again.");
      setResults((current) => current.map((entry) => (entry === hit ? { ...entry, savedItemId: payload.item.id } : entry)));
      addToast(payload.created ? `saved ${hit.title} to the watchlist` : `${hit.title} is already in the watchlist`, "success");
    } catch (cause) {
      addToast(cause instanceof Error ? cause.message : "unable to save this title. try again.", "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "discover" }]} width="wide">
      <PageHeader
        title="discover"
        description={live ? "search films and series, then save them to the watchlist." : "search the starter catalogue, then save titles to the watchlist. a tmdb key unlocks everything else."}
      />

      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="discover-query" className="sr-only">search films and series</label>
        <Input
          id="discover-query"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="a title, a genre, or a mood…"
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="primary">search</Button>
      </form>

      {!hasWatchlist && (
        <p className="ui-muted" role="status">
          there is no watchlist collection yet. an admin can apply the watchlist kit from <Link href="/admin/kits" className="underline">kits</Link>.
        </p>
      )}

      {error ? (
        <EmptyState title={error} actions={<Button onClick={() => setQuery((current) => current + "")}>retry</Button>} />
      ) : loading ? (
        <p className="ui-muted" role="status">searching…</p>
      ) : results.length === 0 ? (
        <EmptyState
          title={query ? `nothing found for “${query}”` : "nothing to show"}
          description={live ? "try another title or spelling." : "the starter catalogue holds sixteen titles; add a tmdb key to search everything."}
          actions={query ? <Button onClick={() => { setDraft(""); setQuery(""); }}>clear search</Button> : undefined}
        />
      ) : (
        <ul className="media-grid" aria-label={query ? `results for ${query}` : "trending titles"}>
          {results.map((hit) => {
            const key = `${hit.media}:${hit.id}`;
            const saved = Boolean(hit.savedItemId);
            return (
              <li key={key} className="media-card">
                <div className="media-poster">
                  {hit.poster ? (
                    <img src={hit.poster} alt="" loading="lazy" width={342} height={513} />
                  ) : (
                    <span className="media-poster-fallback" aria-hidden="true">no artwork</span>
                  )}
                </div>
                <div className="media-card-body">
                  <div className="media-card-title" title={hit.title}>{hit.title}</div>
                  <div className="media-card-meta">
                    {hit.year ?? "—"} · {hit.media === "series" ? "series" : "film"}
                    {hit.score ? ` · ${hit.score.toFixed(1)}` : ""}
                  </div>
                  {canSave && hasWatchlist && (
                    saved ? (
                      <Link href={`/collections/watchlist/items/${hit.savedItemId}`} className="ui-button media-card-action">
                        in watchlist
                      </Link>
                    ) : (
                      <Button className="media-card-action" onClick={() => save(hit)} disabled={saving === key}>
                        {saving === key ? "saving…" : "save"}
                      </Button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
