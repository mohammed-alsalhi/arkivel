import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { getSeason, getTitle, isMediaKind, tmdbKey } from "@/modules/media/tmdb";
import { handleMediaError, savedByTmdb, watchlistCollection } from "../../../_shared";

type Params = { params: Promise<{ media: string; id: string }> };

/** A title's details, its saved watchlist item if any, and `?season=n` episodes for a series. */
export async function GET(request: NextRequest, { params }: Params) {
  const disabled = await moduleDisabledResponse("media");
  if (disabled) return disabled;

  const { media, id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!isMediaKind(media) || !Number.isFinite(id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const seasonParam = request.nextUrl.searchParams.get("season");
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : null;

  try {
    const [title, collection] = await Promise.all([getTitle(media, id), watchlistCollection()]);
    const saved = collection ? (await savedByTmdb(collection)).get(tmdbKey(media, id)) ?? null : null;
    const episodes = media === "series" && season && Number.isFinite(season) ? await getSeason(id, season) : null;
    return NextResponse.json({ title, saved, season: episodes });
  } catch (error) {
    return handleMediaError(error);
  }
}

export const dynamic = "force-dynamic";
