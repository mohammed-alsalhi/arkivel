import { NextResponse } from "next/server";
import { listItems, resolveCollection } from "@/modules/collections/queries";
import type { CollectionDTO, ItemDTO } from "@/modules/collections/model";
import { MediaError } from "@/modules/media/tmdb";

export const WATCHLIST_SLUG = "watchlist";
export const EPISODES_SLUG = "episodes";

export async function watchlistCollection(): Promise<CollectionDTO | null> {
  return resolveCollection(WATCHLIST_SLUG);
}

/**
 * Every watchlist item, keyed by its `tmdb` property.
 * ponytail: pages through the whole library on each call; index by property if libraries pass a few thousand titles.
 */
export async function savedByTmdb(collection: CollectionDTO): Promise<Map<string, ItemDTO>> {
  const saved = new Map<string, ItemDTO>();
  for (let page = 1; page <= 50; page += 1) {
    const result = await listItems(collection, { page });
    for (const item of result.items) {
      const key = item.properties.tmdb;
      if (typeof key === "string" && key) saved.set(key, item);
    }
    if (!result.hasMore) break;
  }
  return saved;
}

export function handleMediaError(error: unknown): NextResponse {
  if (error instanceof MediaError) return NextResponse.json({ error: error.message }, { status: error.status });
  throw error;
}

export const noWatchlist = () =>
  NextResponse.json({ error: "no watchlist collection yet. apply the watchlist kit from /admin/kits." }, { status: 409 });
