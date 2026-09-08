/**
 * The media library over the collections engine. Composes the collections
 * queries with the media module's metadata, the way `src/kits/apply.ts`
 * composes kits; modules never import each other. Server only.
 */
import type { CollectionDTO, ItemDTO } from "@/modules/collections/model";
import { createItem, deleteItem, getItem, listItems, resolveCollection, updateItem } from "@/modules/collections/queries";
import { getSeason, getTitle, hasLiveTmdb } from "@/modules/media/tmdb";
import { episodeTitle, moodId, propertiesFor, statusId, tmdbKeyOf, toEpisodeProgress, toMediaKind, toWatchlistItem } from "./convert";
import type { EpisodeProgress, Library, MediaType, Mood, WatchStatus, WatchlistItem } from "./types";

export class LibraryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const WATCHLIST_SLUG = "watchlist";
export const EPISODES_SLUG = "episodes";

async function collections(): Promise<{ watchlist: CollectionDTO; episodes: CollectionDTO }> {
  const [watchlist, episodes] = await Promise.all([resolveCollection(WATCHLIST_SLUG), resolveCollection(EPISODES_SLUG)]);
  if (!watchlist || !episodes) throw new LibraryError("the library is not set up yet. an admin can apply the watchlist kit.", 409);
  return { watchlist, episodes };
}

// ponytail: reads every row; a library past a few thousand titles wants a property index.
async function allRows(collection: CollectionDTO): Promise<ItemDTO[]> {
  const rows: ItemDTO[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await listItems(collection, { page });
    rows.push(...result.items);
    if (!result.hasMore) break;
  }
  return rows;
}

const today = () => new Date().toISOString().slice(0, 10);

/** The whole library: every TMDB-keyed title with its watched-episode counts, and every watched episode mark. */
export async function readLibrary(): Promise<Library> {
  const { watchlist, episodes } = await collections();
  const [titleRows, episodeRows] = await Promise.all([allRows(watchlist), allRows(episodes)]);
  const marks = episodeRows.map(toEpisodeProgress).filter((mark): mark is EpisodeProgress => Boolean(mark));
  const items = titleRows.map((row) => toWatchlistItem(row, marks)).filter((item): item is WatchlistItem => Boolean(item));
  items.sort((a, b) => b.added_at.localeCompare(a.added_at));
  return { version: 1, items, episodes: marks.sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number) };
}

async function findRow(watchlist: CollectionDTO, id: string): Promise<ItemDTO> {
  const row = await getItem(watchlist, id);
  if (!row || typeof row.properties.tmdb !== "string") throw new LibraryError("this title is no longer in your library.", 404);
  return row;
}

async function episodeMarksFor(episodesCollection: CollectionDTO, showId: string): Promise<EpisodeProgress[]> {
  return (await allRows(episodesCollection)).map(toEpisodeProgress).filter((mark): mark is EpisodeProgress => mark?.watchlist_item_id === showId);
}

async function enriched(row: ItemDTO, episodesCollection: CollectionDTO): Promise<WatchlistItem> {
  const item = toWatchlistItem(row, await episodeMarksFor(episodesCollection, row.id));
  if (!item) throw new LibraryError("this title is no longer in your library.", 404);
  return item;
}

export type NewTitle = { tmdb_id: number; media_type: MediaType; title: string; status?: WatchStatus; moods?: Mood[]; watched_at?: string | null };

/** Saves a title; an existing `(media_type, tmdb_id)` is returned unchanged (and adopted when it was a sample). */
export async function saveTitle(input: NewTitle): Promise<{ item: WatchlistItem; created: boolean }> {
  const { watchlist, episodes } = await collections();
  const key = tmdbKeyOf(input.media_type, input.tmdb_id);
  const existing = (await allRows(watchlist)).find((row) => row.properties.tmdb === key);
  if (existing) {
    const row = existing.properties.sample === true ? await updateItem(watchlist, existing.id, { properties: { sample: false } }) : existing;
    return { item: await enriched(row ?? existing, episodes), created: false };
  }
  const title = await getTitle(toMediaKind(input.media_type), input.tmdb_id).catch(() => null);
  const status = input.status ?? "plan_to_watch";
  const row = await createItem(watchlist, {
    title: title?.title ?? input.title,
    properties: {
      ...(title ? propertiesFor(title) : { media: toMediaKind(input.media_type), tmdb: key }),
      status: statusId(status),
      moods: (input.moods ?? []).map(moodId),
      watched_on: status === "watched" ? (input.watched_at?.slice(0, 10) ?? today()) : null,
      sample: false,
    },
  });
  return { item: await enriched(row, episodes), created: true };
}

/** Status and/or moods; `watched` stamps a missing watched date, other statuses clear it. Editing adopts a sample. */
export async function patchTitle(id: string, patch: { status?: WatchStatus; moods?: Mood[] }): Promise<WatchlistItem> {
  const { watchlist, episodes } = await collections();
  const row = await findRow(watchlist, id);
  const properties: Record<string, unknown> = { sample: false };
  if (patch.status) {
    properties.status = statusId(patch.status);
    properties.watched_on = patch.status === "watched" ? (row.properties.watched_on ?? today()) : null;
  }
  if (patch.moods) properties.moods = patch.moods.map(moodId);
  const updated = await updateItem(watchlist, id, { properties });
  return enriched(updated ?? row, episodes);
}

/** Removes a title and every episode mark bound to it. */
export async function removeTitle(id: string): Promise<void> {
  const { watchlist, episodes } = await collections();
  await findRow(watchlist, id);
  for (const mark of await episodeMarksFor(episodes, id)) await deleteItem(episodes, mark.id);
  await deleteItem(watchlist, id);
}

export async function listEpisodes(id: string): Promise<EpisodeProgress[]> {
  const { watchlist, episodes } = await collections();
  await findRow(watchlist, id);
  return (await episodeMarksFor(episodes, id)).sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number);
}

export type EpisodeRef = { season_number: number; episode_number: number; watched_at?: string };

/**
 * Marks episodes watched (validated against the season's episode list); a queued show becomes "watching".
 * Backup restore passes `{ validate: false, promote: false }`: marks land even when the catalogue lacks the
 * season, and the title keeps the status the backup gave it.
 */
export async function markEpisodes(id: string, refs: EpisodeRef[], { validate = true, promote = true } = {}): Promise<EpisodeProgress[]> {
  const { watchlist, episodes } = await collections();
  const row = await findRow(watchlist, id);
  const item = toWatchlistItem(row);
  if (!item || item.media_type !== "tv") throw new LibraryError("episode tracking is available for series.", 400);
  const seasons = new Map<number, Set<number>>();
  for (const season of validate ? new Set(refs.map((ref) => ref.season_number)) : []) {
    const details = await getSeason(item.tmdb_id, season);
    seasons.set(season, new Set((details.episodes ?? []).map((episode) => episode.number)));
    for (const ref of refs) {
      if (ref.season_number === season && !seasons.get(season)?.has(ref.episode_number)) {
        throw new LibraryError("one of these episodes does not exist in this season.", 400);
      }
    }
  }
  const existing = await episodeMarksFor(episodes, id);
  const unique = [...new Map(refs.map((ref) => [`${ref.season_number}:${ref.episode_number}`, ref])).values()];
  const saved: EpisodeProgress[] = [];
  for (const ref of unique) {
    const found = existing.find((mark) => mark.season_number === ref.season_number && mark.episode_number === ref.episode_number);
    if (found) {
      saved.push(found);
      continue;
    }
    const created = await createItem(episodes, {
      title: episodeTitle(item.title, ref.season_number, ref.episode_number),
      properties: { show: [id], season: ref.season_number, episode: ref.episode_number, watched: true, watched_on: ref.watched_at?.slice(0, 10) ?? today() },
    });
    const mark = toEpisodeProgress(created);
    if (mark) saved.push(mark);
  }
  const properties: Record<string, unknown> = { sample: false };
  if (promote && item.status === "plan_to_watch") properties.status = statusId("watching");
  await updateItem(watchlist, id, { properties });
  return saved;
}

export async function unmarkEpisode(id: string, ref: EpisodeRef): Promise<void> {
  const { watchlist, episodes } = await collections();
  await findRow(watchlist, id);
  const marks = await episodeMarksFor(episodes, id);
  for (const mark of marks) {
    if (mark.season_number === ref.season_number && mark.episode_number === ref.episode_number) await deleteItem(episodes, mark.id);
  }
  await updateItem(watchlist, id, { properties: { sample: false } });
}

/** Deletes the starter titles nobody has touched, with their episode marks. */
export async function removeSamples(): Promise<number> {
  const { watchlist, episodes } = await collections();
  const samples = (await allRows(watchlist)).filter((row) => row.properties.sample === true);
  const marks = await allRows(episodes);
  for (const row of samples) {
    for (const mark of marks) {
      if (Array.isArray(mark.properties.show) && mark.properties.show.includes(row.id)) await deleteItem(episodes, mark.id);
    }
    await deleteItem(watchlist, row.id);
  }
  return samples.length;
}

export async function libraryHealth(canEdit: boolean) {
  let sample = false;
  try {
    const { watchlist } = await collections();
    sample = (await allRows(watchlist)).some((row) => row.properties.sample === true);
  } catch {
    // No library yet: the health report still describes the configuration.
  }
  return {
    mode: "hosted" as const,
    catalog: hasLiveTmdb() ? ("live" as const) : ("sample" as const),
    recommendation: process.env.ANTHROPIC_API_KEY ? ("ai" as const) : ("local" as const),
    sample_library: sample,
    can_edit: canEdit,
  };
}
