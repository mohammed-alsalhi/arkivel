/** Request validation for the media routes, ported from Vistara. Pure: no database, no framework. */
import { MOODS, type MediaType, type Mood, type WatchStatus } from "./types";

export class InputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const watchStatuses: WatchStatus[] = ["plan_to_watch", "watching", "watched", "dropped"];

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("A JSON object is required.");
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, max = 300): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new InputError(`${label} must be between 1 and ${max} characters.`);
  return value.trim();
}

export function integer(value: unknown, label: string, min = 1, max = 1_000_000_000): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new InputError(`${label} must be an integer between ${min} and ${max}.`);
  return value;
}

export function mediaType(value: unknown): MediaType {
  if (value !== "movie" && value !== "tv") throw new InputError("Media type must be movie or tv.");
  return value;
}

export function watchStatus(value: unknown): WatchStatus {
  if (!watchStatuses.includes(value as WatchStatus)) throw new InputError("Choose a valid watch status.");
  return value as WatchStatus;
}

export function moodTags(value: unknown): Mood[] {
  if (!Array.isArray(value) || value.length > MOODS.length || !value.every((mood) => MOODS.includes(mood as Mood))) throw new InputError("Choose valid mood tags.");
  return [...new Set(value)] as Mood[];
}

export const POSTER_PATH = /^\/[a-zA-Z0-9._/-]{1,200}$/;

export function newItem(value: unknown) {
  const item = record(value);
  if (item.poster_path != null && (typeof item.poster_path !== "string" || !POSTER_PATH.test(item.poster_path))) throw new InputError("Invalid poster path.");
  return {
    tmdb_id: integer(item.tmdb_id, "TMDB ID"),
    media_type: mediaType(item.media_type),
    title: text(item.title, "Title"),
    poster_path: item.poster_path == null ? null : (item.poster_path as string),
    status: item.status === undefined ? ("plan_to_watch" as const) : watchStatus(item.status),
    moods: item.moods === undefined ? [] : moodTags(item.moods),
  };
}

export type NewItem = ReturnType<typeof newItem>;

export function episode(value: unknown) {
  const item = record(value);
  return { season_number: integer(item.season_number, "Season", 0, 1000), episode_number: integer(item.episode_number, "Episode", 1, 10000) };
}

/** Titles from a plain array or a Google Takeout style export; trimmed, case-insensitively unique, 1–100 of them. */
export function importTitles(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : (() => {
        const data = record(value);
        return data.items ?? data.saved ?? data.Items ?? data.Saved;
      })();
  if (!Array.isArray(source)) throw new InputError("Use an array of titles, or a Google Takeout JSON file containing items.");
  const titles = source.map((entry) => {
    if (typeof entry === "string") return text(entry, "Title");
    const item = record(entry);
    return text(item.title ?? item.Title ?? item.name ?? item.note, "Title");
  });
  const unique = [...new Map(titles.map((title) => [title.toLowerCase(), title])).values()];
  if (!unique.length) throw new InputError("No titles found to import.");
  if (unique.length > 100) throw new InputError("Import up to 100 titles at a time. Split this file into smaller batches.");
  return unique;
}
