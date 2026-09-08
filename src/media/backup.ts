/**
 * Library backups: strict parsing of a Vistara version 1 file, and a merge that
 * matches titles by (media_type, tmdb_id) so nothing already saved is replaced.
 */
import { markEpisodes, patchTitle, readLibrary, saveTitle, type EpisodeRef } from "./library";
import type { EpisodeProgress, Library, WatchlistItem } from "./types";
import { InputError, POSTER_PATH, episode, integer, moodTags, newItem, record, text, watchStatus } from "./validation";

function date(value: unknown, label: string) {
  const result = text(value, label, 100);
  if (!Number.isFinite(Date.parse(result))) throw new InputError(`${label} must be a valid date.`);
  return result;
}

function imagePath(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || !POSTER_PATH.test(value)) throw new InputError("Invalid image path in backup.");
  return value;
}

function string(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || value.length > max) throw new InputError(`${label} must be text of at most ${max} characters.`);
  return value;
}

function metadata(value: unknown, item: WatchlistItem): NonNullable<WatchlistItem["metadata"]> {
  const source = record(value);
  if (source.id !== item.tmdb_id || source.media_type !== item.media_type) throw new InputError("Backup metadata must belong to its title.");
  if (typeof source.vote_average !== "number" || !Number.isFinite(source.vote_average) || source.vote_average < 0 || source.vote_average > 10) {
    throw new InputError("Backup ratings must be between 0 and 10.");
  }
  const result: NonNullable<WatchlistItem["metadata"]> = {
    id: item.tmdb_id,
    media_type: item.media_type,
    title: text(source.title, "Metadata title"),
    overview: string(source.overview, "Overview", 20_000),
    poster_path: imagePath(source.poster_path),
    vote_average: source.vote_average,
  };
  for (const key of ["release_date", "first_air_date"] as const) {
    if (source[key] !== undefined) result[key] = source[key] === "" ? "" : date(source[key], "Release date");
  }
  if (source.backdrop_path !== undefined) result.backdrop_path = imagePath(source.backdrop_path);
  if (source.runtime !== undefined) result.runtime = source.runtime === null ? null : integer(source.runtime, "Runtime", 0, 100_000);
  if (source.episode_scope !== undefined) result.episode_scope = text(source.episode_scope, "Episode scope", 500);
  if (source.genres !== undefined) {
    if (!Array.isArray(source.genres) || source.genres.length > 100) throw new InputError("Backup genres must be an array of at most 100 entries.");
    result.genres = source.genres.map((value) => {
      const genre = record(value);
      return { id: integer(genre.id, "Genre ID"), name: text(genre.name, "Genre", 100) };
    });
  }
  return result;
}

export function parseBackup(value: unknown): Library {
  const source = record(value);
  if (source.version !== 1) throw new InputError("Choose a Vistara version 1 library backup.");
  if (!Array.isArray(source.items) || source.items.length > 10_000) throw new InputError("A backup must contain an items array with at most 10,000 titles.");
  if (!Array.isArray(source.episodes) || source.episodes.length > 100_000) throw new InputError("A backup must contain an episodes array with at most 100,000 marks.");
  const ids = new Map<string, WatchlistItem>();
  const identities = new Set<string>();
  const items = source.items.map((value) => {
    const row = record(value);
    const item: WatchlistItem = {
      ...newItem(row),
      id: text(row.id, "Title ID", 200),
      poster_path: imagePath(row.poster_path),
      status: watchStatus(row.status),
      moods: moodTags(row.moods),
      added_at: date(row.added_at, "Added date"),
      watched_at: row.watched_at === null ? null : date(row.watched_at, "Watched date"),
    };
    const identity = `${item.media_type}:${item.tmdb_id}`;
    if (ids.has(item.id) || identities.has(identity)) throw new InputError("A backup contains duplicate title IDs or TMDB identities.");
    if (row.metadata !== undefined) item.metadata = metadata(row.metadata, item);
    ids.set(item.id, item);
    identities.add(identity);
    return item;
  });
  const episodeIds = new Set<string>();
  const episodeKeys = new Set<string>();
  const episodes = source.episodes.map((value): EpisodeProgress => {
    const row = record(value);
    const mark = {
      ...episode(row),
      id: text(row.id, "Episode mark ID", 200),
      watchlist_item_id: text(row.watchlist_item_id, "Episode title ID", 200),
      watched_at: date(row.watched_at, "Episode watched date"),
    };
    if (ids.get(mark.watchlist_item_id)?.media_type !== "tv") throw new InputError("Each episode mark must reference a TV title in the backup.");
    const key = `${mark.watchlist_item_id}:${mark.season_number}:${mark.episode_number}`;
    if (episodeIds.has(mark.id) || episodeKeys.has(key)) throw new InputError("A backup contains duplicate episode marks.");
    episodeIds.add(mark.id);
    episodeKeys.add(key);
    return mark;
  });
  if (source.adopted !== undefined) {
    if (!Array.isArray(source.adopted) || source.adopted.length > 10_000) throw new InputError("Backup sample ownership must be an array of at most 10,000 IDs.");
    source.adopted.forEach((value) => text(value, "Sample title ID", 200));
  }
  return { version: 1, items, episodes };
}

export type RestoreStats = { added: number; existing: number; episodesAdded: number; episodesExisting: number };

const identity = (item: { media_type: string; tmdb_id: number }) => `${item.media_type}:${item.tmdb_id}`;
const markKey = (itemId: string, mark: EpisodeRef) => `${itemId}:${mark.season_number}:${mark.episode_number}`;

/** Pure: what a merge would do. `targets` maps backup title ids to saved ids (null for titles to create); `marks` groups new marks by backup title id. */
export function planRestore(library: Library, backup: Library) {
  const saved = new Map(library.items.map((item) => [identity(item), item]));
  const stats: RestoreStats = { added: 0, existing: 0, episodesAdded: 0, episodesExisting: 0 };
  const targets = new Map<string, WatchlistItem | null>();
  for (const item of backup.items) {
    const existing = saved.get(identity(item)) ?? null;
    targets.set(item.id, existing);
    if (existing) stats.existing += 1;
    else stats.added += 1;
  }
  const known = new Set(library.episodes.map((mark) => markKey(mark.watchlist_item_id, mark)));
  const marks = new Map<string, EpisodeRef[]>();
  for (const mark of backup.episodes) {
    const existing = targets.get(mark.watchlist_item_id);
    if (existing && known.has(markKey(existing.id, mark))) {
      stats.episodesExisting += 1;
      continue;
    }
    marks.set(mark.watchlist_item_id, [...(marks.get(mark.watchlist_item_id) ?? []), { season_number: mark.season_number, episode_number: mark.episode_number, watched_at: mark.watched_at }]);
    stats.episodesAdded += 1;
  }
  return { stats, targets, marks };
}

export async function previewRestore(backup: Library): Promise<RestoreStats> {
  return planRestore(await readLibrary(), backup).stats;
}

/** Merges the backup in: existing titles keep their fields (samples are adopted), new titles and missing marks are created. */
export async function restoreBackup(backup: Library): Promise<RestoreStats> {
  const { stats, targets, marks } = planRestore(await readLibrary(), backup);
  const ids = new Map<string, string>();
  // ponytail: one write per title and per show; a 10,000-title restore wants a bulk insert in the collections engine.
  for (const item of backup.items) {
    const existing = targets.get(item.id);
    if (existing) {
      if (existing.sample) await patchTitle(existing.id, {});
      ids.set(item.id, existing.id);
      continue;
    }
    const { item: created } = await saveTitle({ tmdb_id: item.tmdb_id, media_type: item.media_type, title: item.title, status: item.status, moods: item.moods, watched_at: item.watched_at });
    ids.set(item.id, created.id);
  }
  for (const [backupId, refs] of marks) {
    const target = ids.get(backupId);
    if (target) await markEpisodes(target, refs, { validate: false, promote: false });
  }
  return stats;
}
