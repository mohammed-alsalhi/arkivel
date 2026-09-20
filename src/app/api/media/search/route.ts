import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { searchTitles, tmdbKey } from "@/modules/media/tmdb";
import type { MediaSearchHit } from "@/modules/media/types";
import { handleMediaError, savedByTmdb, watchlistCollection } from "../_shared";

/** `?q=` — matching titles (trending when blank), each flagged with the watchlist item that already has it. */
export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("media");
  if (disabled) return disabled;

  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  try {
    const [titles, collection] = await Promise.all([searchTitles(q), watchlistCollection()]);
    const saved = collection ? await savedByTmdb(collection) : new Map();
    const results: MediaSearchHit[] = titles.map((title) => ({
      ...title,
      savedItemId: saved.get(tmdbKey(title.media, title.id))?.id ?? null,
    }));
    return NextResponse.json({ results, hasWatchlist: Boolean(collection) });
  } catch (error) {
    return handleMediaError(error);
  }
}

export const dynamic = "force-dynamic";
