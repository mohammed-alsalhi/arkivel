/**
 * Pure mapping between the media contract (`./types`) and rows of the
 * `watchlist` and `episodes` collections. Property ids are the template's.
 */
import type { ItemDTO } from "@/modules/collections/model";
import { CATALOG } from "@/modules/media/catalog";
import type { MediaKind, MediaTitle, MoodId } from "@/modules/media/types";
import type { EpisodeProgress, MediaType, Mood, TmdbSearchResult, WatchStatus, WatchlistItem } from "./types";

export const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
export const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

const MOOD_LABELS: Record<MoodId, Mood> = {
  feel_good: "Feel-good",
  thrilling: "Thrilling",
  romantic: "Romantic",
  dark: "Dark",
  funny: "Funny",
  thoughtful: "Thought-provoking",
  action: "Action-packed",
  relaxing: "Relaxing",
  scary: "Scary",
  inspiring: "Inspiring",
};
const MOOD_IDS = Object.fromEntries(Object.entries(MOOD_LABELS).map(([id, label]) => [label, id])) as Record<Mood, MoodId>;

const STATUS_IDS: Record<WatchStatus, string> = { plan_to_watch: "queued", watching: "watching", watched: "watched", dropped: "dropped" };
const STATUS_LABELS: Record<string, WatchStatus> = { queued: "plan_to_watch", watching: "watching", watched: "watched", dropped: "dropped" };

export const toMediaKind = (type: MediaType): MediaKind => (type === "tv" ? "series" : "movie");
export const toMediaType = (kind: MediaKind): MediaType => (kind === "series" ? "tv" : "movie");
export const moodId = (mood: Mood): MoodId => MOOD_IDS[mood];
export const moodLabel = (id: unknown): Mood | null => (typeof id === "string" && id in MOOD_LABELS ? MOOD_LABELS[id as MoodId] : null);
export const statusId = (status: WatchStatus) => STATUS_IDS[status];
export const tmdbKeyOf = (type: MediaType, id: number) => `${toMediaKind(type)}:${id}`;

/** `"movie:693134"` → `{ media_type, tmdb_id }`, or null for hand-added rows. */
export function parseTmdbKey(value: unknown): { media_type: MediaType; tmdb_id: number } | null {
  if (typeof value !== "string") return null;
  const [kind, id] = value.split(":");
  const tmdbId = Number.parseInt(id ?? "", 10);
  if ((kind !== "movie" && kind !== "series") || !Number.isFinite(tmdbId)) return null;
  return { media_type: toMediaType(kind), tmdb_id: tmdbId };
}

/** A stored full poster/backdrop URL back to the TMDB path the pages expect. */
export function imagePath(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const match = value.match(/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(\/.+)$/);
  return match ? match[1] : value.startsWith("/") ? value : null;
}

function watchedAt(properties: ItemDTO["properties"]): string | null {
  const day = properties.watched_on;
  if (typeof day !== "string" || !Number.isFinite(Date.parse(day))) return null;
  const exact = properties.watched_at;
  // A manual collection edit to the day invalidates an older imported timestamp.
  return typeof exact === "string" && Number.isFinite(Date.parse(exact)) && new Date(exact).toISOString().slice(0, 10) === day
    ? new Date(exact).toISOString() : new Date(`${day}T00:00:00Z`).toISOString();
}
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** The row's TMDB-shaped metadata, from stored properties with the bundled catalogue filling gaps. */
function metadataOf(item: ItemDTO, identity: { media_type: MediaType; tmdb_id: number }): NonNullable<WatchlistItem["metadata"]> {
  const p = item.properties;
  const bundled = CATALOG.find((entry) => entry.id === identity.tmdb_id && toMediaType(entry.media) === identity.media_type);
  const year = num(p.year) ?? bundled?.year ?? null;
  const genres = str(p.genres)
    ? str(p.genres).split(",").map((name, index) => ({ id: index + 1, name: name.trim() })).filter((genre) => genre.name)
    : (bundled?.genres ?? []).map((name, index) => ({ id: index + 1, name }));
  const base: TmdbSearchResult = {
    id: identity.tmdb_id,
    media_type: identity.media_type,
    title: item.title,
    poster_path: imagePath(p.poster) ?? imagePath(bundled?.poster),
    overview: str(p.overview) || bundled?.overview || "",
    vote_average: num(p.score) ?? bundled?.score ?? 0,
  };
  if (p.release_date || year) base[identity.media_type === "tv" ? "first_air_date" : "release_date"] = str(p.release_date) || `${year}-01-01`;
  return {
    ...base,
    backdrop_path: imagePath(p.backdrop) ?? imagePath(bundled?.backdrop),
    genres,
    runtime: num(p.runtime) ?? bundled?.runtime ?? null,
    ...(bundled?.seasons && !process.env.TMDB_API_KEY
      ? { episode_scope: "The starter collection includes season 1. This is not the complete series." }
      : {}),
  };
}

/** A watchlist row as the media contract exposes it; null for rows that are not TMDB titles. */
export function toWatchlistItem(item: ItemDTO, episodes: EpisodeProgress[] = []): WatchlistItem | null {
  const identity = parseTmdbKey(item.properties.tmdb);
  if (!identity) return null;
  const moods = Array.isArray(item.properties.moods) ? item.properties.moods.map(moodLabel).filter((mood): mood is Mood => Boolean(mood)) : [];
  const watched = episodes.filter((episode) => episode.watchlist_item_id === item.id);
  const bundled = CATALOG.find((entry) => entry.id === identity.tmdb_id && toMediaType(entry.media) === identity.media_type);
  const withinSample = watched.every((episode) =>
    bundled?.seasons?.some((season) => season.number === episode.season_number && season.episodes?.some((known) => known.number === episode.episode_number)),
  );
  const totalBundled = bundled?.seasons?.reduce((sum, season) => sum + season.episodeCount, 0);
  const metadata = metadataOf(item, identity);
  return {
    id: item.id,
    ...identity,
    title: item.title,
    poster_path: metadata.poster_path,
    status: STATUS_LABELS[String(item.properties.status)] ?? "plan_to_watch",
    moods,
    added_at: item.createdAt,
    watched_at: watchedAt(item.properties),
    metadata,
    episodes_watched: watched.length,
    total_episodes: !process.env.TMDB_API_KEY && withinSample && totalBundled ? totalBundled : undefined,
    sample: item.properties.sample === true,
  };
}

/** An episodes row as the contract exposes it; null when unbound or unwatched. */
export function toEpisodeProgress(item: ItemDTO): EpisodeProgress | null {
  const show = Array.isArray(item.properties.show) ? item.properties.show[0] : null;
  const season = num(item.properties.season);
  const episode = num(item.properties.episode);
  if (typeof show !== "string" || season === null || episode === null || item.properties.watched !== true) return null;
  return {
    id: item.id,
    watchlist_item_id: show,
    season_number: season,
    episode_number: episode,
    watched_at: watchedAt(item.properties) ?? item.updatedAt,
  };
}

/** Collection properties for a title from the metadata layer; the caller sets status and moods. */
export function propertiesFor(title: MediaTitle): Record<string, unknown> {
  return {
    media: title.media,
    year: title.year,
    poster: title.poster,
    backdrop: title.backdrop,
    score: title.score,
    runtime: title.runtime,
    genres: title.genres.join(", "),
    url: `https://www.themoviedb.org/${title.media === "series" ? "tv" : "movie"}/${title.id}`,
    tmdb: `${title.media}:${title.id}`,
    overview: title.overview,
  };
}

/** Episode-row title: `Severance s01e03 In Perpetuity`. */
export const episodeTitle = (show: string, season: number, episode: number, name?: string) =>
  `${show} s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}${name ? ` ${name}` : ""}`;
