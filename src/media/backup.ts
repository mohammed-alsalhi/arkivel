/**
 * Library backups: strict parsing of a Vistara version 1 file, and a merge that
 * matches titles by (media_type, tmdb_id) so nothing already saved is replaced.
 */
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { readSchema, validateProperties, type PropertySchema } from "@/modules/collections/properties";
import { getTemplate } from "@/modules/collections/templates";
import { LibraryError, readLibrary, type EpisodeRef } from "./library";
import { BACKDROP_BASE, POSTER_BASE, episodeTitle, moodId, statusId, tmdbKeyOf, toMediaKind, toWatchlistItem, toEpisodeProgress } from "./convert";
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

/** One transaction keeps a failed restore from leaving half a library. No provider calls: the backup owns its metadata. */
export async function restoreBackup(backup: Library): Promise<RestoreStats> {
  const stats = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Collection" WHERE slug IN ('watchlist', 'episodes') ORDER BY id FOR UPDATE`;
    const collections = await tx.collection.findMany({ where: { slug: { in: ["watchlist", "episodes"] } } });
    const watchlist = collections.find((row) => row.slug === "watchlist");
    const episodes = collections.find((row) => row.slug === "episodes");
    if (!watchlist || !episodes) throw new LibraryError("apply the watchlist kit before restoring a library.", 409);
    const schemas = new Map<string, PropertySchema>();
    for (const collection of collections) {
      const schema = readSchema(collection.schema);
      // Upgrade the two import fields on older kits without changing existing properties.
      for (const field of getTemplate(collection.slug)!.schema.filter((field) => field.id === "watched_at" || field.id === "release_date")) {
        const existing = schema.find((property) => property.id === field.id);
        if (existing && existing.type !== field.type) throw new InputError(`Restore needs the ${field.id} property to be ${field.type}.`);
        if (!existing) schema.push(field);
      }
      schemas.set(collection.id, schema);
      await tx.collection.update({ where: { id: collection.id }, data: { schema } });
    }
    const relation = schemas.get(episodes.id)!.find((property) => property.id === "show");
    if (relation?.type !== "relation" || relation.collectionId !== watchlist.id) throw new InputError("Episode marks must relate to the watchlist collection.");
    await tx.$queryRaw`SELECT id FROM "CollectionItem" WHERE "collectionId" IN (${watchlist.id}, ${episodes.id}) ORDER BY id FOR UPDATE`;
    const rows = await tx.collectionItem.findMany({ where: { collectionId: { in: [watchlist.id, episodes.id] } } });
    const dtos = rows.map((row) => ({ ...row, article: null, properties: validateProperties(schemas.get(row.collectionId)!, row.properties).value, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
    const library: Library = {
      version: 1,
      items: dtos.filter((row) => row.collectionId === watchlist.id).map((row) => toWatchlistItem(row)).filter((row): row is WatchlistItem => row !== null),
      episodes: dtos.filter((row) => row.collectionId === episodes.id).map(toEpisodeProgress).filter((row): row is EpisodeProgress => row !== null),
    };
    const { stats, targets, marks } = planRestore(library, backup);
    function checked(collectionId: string, properties: Record<string, unknown>) {
      const schema = schemas.get(collectionId)!;
      const result = validateProperties(schema, properties);
      if (!result.ok || Object.keys(properties).some((key) => !schema.some((field) => field.id === key))) throw new InputError("Restore properties no longer match the watchlist kit. Nothing was imported.");
      return result.value;
    }
    const ids = new Map<string, string>();
    let sortOrder = rows.reduce((last, row) => Math.max(last, row.sortOrder), -1) + 1;
    for (const item of backup.items) {
      const existing = targets.get(item.id);
      if (existing) {
        if (existing.sample) {
          const row = dtos.find((row) => row.id === existing.id)!;
          await tx.collectionItem.update({ where: { id: existing.id }, data: { properties: checked(watchlist.id, { ...row.properties, sample: false }) } });
        }
        ids.set(item.id, existing.id);
        continue;
      }
      const metadata = item.metadata;
      const released = metadata?.release_date || metadata?.first_air_date;
      const properties = checked(watchlist.id, {
        media: toMediaKind(item.media_type), tmdb: tmdbKeyOf(item.media_type, item.tmdb_id),
        status: statusId(item.status), moods: item.moods.map(moodId), sample: false,
        watched_on: item.watched_at ? new Date(item.watched_at).toISOString().slice(0, 10) : null, watched_at: item.watched_at,
        poster: item.poster_path ? POSTER_BASE + item.poster_path : null,
        ...(metadata ? { overview: metadata.overview, score: metadata.vote_average, runtime: metadata.runtime ?? null,
          genres: (metadata.genres ?? []).map((genre) => genre.name).join(", "),
          backdrop: metadata.backdrop_path ? BACKDROP_BASE + metadata.backdrop_path : null,
          year: released ? new Date(released).getUTCFullYear() : null,
          release_date: released ? new Date(released).toISOString().slice(0, 10) : null } : {}),
      });
      const created = await tx.collectionItem.create({ data: { collectionId: watchlist.id, title: item.title, properties, createdAt: new Date(item.added_at), sortOrder: sortOrder++ } });
      ids.set(item.id, created.id);
    }
    // ponytail: one insert per mark; very large backups need batched inserts.
    for (const [backupId, refs] of marks) {
      const show = backup.items.find((item) => item.id === backupId)!;
      for (const ref of refs) {
        const watched = ref.watched_at!;
        await tx.collectionItem.create({ data: { collectionId: episodes.id, title: episodeTitle(show.title, ref.season_number, ref.episode_number), sortOrder: sortOrder++,
          properties: checked(episodes.id, { show: [ids.get(backupId)!], season: ref.season_number, episode: ref.episode_number, watched: true,
            watched_on: new Date(watched).toISOString().slice(0, 10), watched_at: watched }) } });
      }
    }
    return stats;
  }, { timeout: 60000 });
  await logAudit("collection.import", { type: "collection", label: "media library backup" }, stats);
  return stats;
}
