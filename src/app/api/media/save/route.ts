import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { requireCollectionEditor } from "@/modules/collections/access";
import { createItem } from "@/modules/collections/queries";
import { getTitle, isMediaKind, tmdbKey, watchlistProperties } from "@/modules/media/tmdb";
import { handleRouteError, readJson } from "../../collections/_shared";
import { handleMediaError, noWatchlist, savedByTmdb, watchlistCollection } from "../_shared";

/** Body: `{ media: "movie" | "series", id, status? }` — saves a title into the watchlist; returns the existing item when it is already there. */
export async function POST(request: NextRequest) {
  const disabled = await moduleDisabledResponse("media");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const body = await readJson(request);
  const id = Number.parseInt(String(body.id), 10);
  if (!isMediaKind(body.media) || !Number.isFinite(id)) {
    return NextResponse.json({ error: "media must be movie or series and id a number", fields: { id: "required" } }, { status: 400 });
  }
  const status = body.status === "watching" || body.status === "watched" ? body.status : "queued";

  const collection = await watchlistCollection();
  if (!collection) return noWatchlist();

  try {
    const existing = (await savedByTmdb(collection)).get(tmdbKey(body.media, id));
    if (existing) return NextResponse.json({ item: existing, created: false });
    const title = await getTitle(body.media, id);
    const item = await createItem(collection, { title: title.title, properties: { ...watchlistProperties(title), status } });
    return NextResponse.json({ item, created: true }, { status: 201 });
  } catch (error) {
    try {
      return handleMediaError(error);
    } catch {
      return handleRouteError(error);
    }
  }
}

export const dynamic = "force-dynamic";
