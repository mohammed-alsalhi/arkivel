/** Optional OMDB ratings (IMDb, Rotten Tomatoes, Metacritic) when `OMDB_API_KEY` is set. Pure of the database. */
import type { MediaKind } from "./types";

export type AggregatedRatings = { imdb?: string; rotten_tomatoes?: string; metacritic?: string };

export const hasRatings = () => Boolean(process.env.OMDB_API_KEY);

export async function fetchRatings(title: string, year: number | null, imdbId?: string): Promise<AggregatedRatings> {
  if (!process.env.OMDB_API_KEY) return {};
  const params = new URLSearchParams({ apikey: process.env.OMDB_API_KEY, ...(imdbId ? { i: imdbId } : { t: title, ...(year ? { y: String(year) } : {}) }) });
  try {
    const response = await fetch(`https://www.omdbapi.com/?${params}`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return {};
    const data = await response.json();
    if (data.Response === "False") return {};
    const ratings: AggregatedRatings = {};
    if (data.imdbRating && data.imdbRating !== "N/A") ratings.imdb = `${data.imdbRating}/10`;
    if (data.Metascore && data.Metascore !== "N/A") ratings.metacritic = `${data.Metascore}/100`;
    for (const rating of data.Ratings ?? []) if (rating.Source === "Rotten Tomatoes") ratings.rotten_tomatoes = rating.Value;
    return ratings;
  } catch {
    return {};
  }
}

/** The IMDb id TMDB knows for a title; only worth a call when OMDB is configured. */
export async function fetchImdbId(media: MediaKind, id: number): Promise<string | undefined> {
  if (!process.env.TMDB_API_KEY || !process.env.OMDB_API_KEY) return undefined;
  try {
    const response = await fetch(`https://api.themoviedb.org/3/${media === "series" ? "tv" : "movie"}/${id}/external_ids`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    return typeof data.imdb_id === "string" ? data.imdb_id : undefined;
  } catch {
    return undefined;
  }
}
