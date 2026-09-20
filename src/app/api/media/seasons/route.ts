import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { requireCollectionEditor } from "@/modules/collections/access";
import { createItem, getItem, listItems, resolveCollection, updateItem } from "@/modules/collections/queries";
import { getSeason } from "@/modules/media/tmdb";
import { handleRouteError, readJson } from "../../collections/_shared";
import { EPISODES_SLUG, handleMediaError, noWatchlist, watchlistCollection } from "../_shared";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Body: `{ itemId, season }` — marks every episode of that season watched for a
 * saved series: one row per episode in the episodes collection (created when
 * missing, updated when present), bound to the watchlist item.
 */
export async function POST(request: NextRequest) {
  const disabled = await moduleDisabledResponse("media");
  if (disabled) return disabled;
  const denied = await requireCollectionEditor();
  if (denied) return denied;

  const body = await readJson(request);
  const season = Number.parseInt(String(body.season), 10);
  if (typeof body.itemId !== "string" || !Number.isFinite(season) || season < 1) {
    return NextResponse.json({ error: "itemId and a season number are required", fields: { season: "required" } }, { status: 400 });
  }

  const [watchlist, episodes] = await Promise.all([watchlistCollection(), resolveCollection(EPISODES_SLUG)]);
  if (!watchlist || !episodes) return noWatchlist();
  const show = await getItem(watchlist, body.itemId);
  const key = typeof show?.properties.tmdb === "string" ? show.properties.tmdb : null;
  if (!show || !key?.startsWith("series:")) return NextResponse.json({ error: "that item is not a saved series" }, { status: 404 });
  const tmdbId = Number.parseInt(key.slice("series:".length), 10);

  try {
    const details = await getSeason(tmdbId, season);
    // Existing marks for this show, by "s{season}e{episode}" so re-marking is idempotent.
    const existing = new Map<string, string>();
    for (let page = 1; page <= 20; page += 1) {
      const result = await listItems(episodes, { page, q: show.title });
      for (const item of result.items) {
        if (Array.isArray(item.properties.show) && item.properties.show.includes(show.id)) existing.set(`s${item.properties.season}e${item.properties.episode}`, item.id);
      }
      if (!result.hasMore) break;
    }
    let created = 0;
    let updated = 0;
    for (const episode of details.episodes ?? []) {
      const properties = { show: [show.id], season: episode.season, episode: episode.number, watched: true, watched_on: today() };
      const title = `${show.title} s${String(episode.season).padStart(2, "0")}e${String(episode.number).padStart(2, "0")} ${episode.name}`;
      const id = existing.get(`s${episode.season}e${episode.number}`);
      if (id) {
        await updateItem(episodes, id, { properties });
        updated += 1;
      } else {
        await createItem(episodes, { title, properties });
        created += 1;
      }
    }
    if (show.properties.status !== "watched") {
      await updateItem(watchlist, show.id, { properties: { ...show.properties, status: "watching" } });
    }
    return NextResponse.json({ season: details.number, created, updated });
  } catch (error) {
    try {
      return handleMediaError(error);
    } catch {
      return handleRouteError(error);
    }
  }
}

export const dynamic = "force-dynamic";
