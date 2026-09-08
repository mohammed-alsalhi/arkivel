/**
 * Film and series metadata: TMDB when `TMDB_API_KEY` is set, the bundled
 * catalogue otherwise. Everything here is pure of the database and of other
 * modules; the route handlers in `src/app/api/media` compose it with the
 * collections engine.
 */
import { CATALOG } from "./catalog";
import type { MediaKind, MediaSeason, MediaTitle, MoodId } from "./types";

const TMDB = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p";

export class MediaError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const hasLiveTmdb = () => Boolean(process.env.TMDB_API_KEY);

const image = (path: string | null | undefined, size: "w342" | "w780") => (path ? `${IMAGES}/${size}${path}` : null);
const yearOf = (date: string | null | undefined) => {
  const year = Number.parseInt((date ?? "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
};

// ponytail: a genre-to-mood guess for live results; the catalogue carries hand-picked moods.
const GENRE_MOODS: Record<number, MoodId> = {
  35: "funny", 27: "scary", 53: "thrilling", 28: "action", 10749: "romantic", 99: "thoughtful",
  10751: "feel_good", 16: "feel_good", 9648: "dark", 80: "dark", 18: "thoughtful", 878: "thoughtful",
};
const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 53: "Thriller", 10752: "War", 37: "Western", 10759: "Action & Adventure", 10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

type TmdbListing = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  seasons?: { id: number; season_number: number; name: string; episode_count: number; air_date: string | null }[];
};

function normalize(entry: TmdbListing, media: MediaKind): MediaTitle {
  const genreIds = entry.genre_ids ?? entry.genres?.map((genre) => genre.id) ?? [];
  const moods = [...new Set(genreIds.map((id) => GENRE_MOODS[id]).filter(Boolean))].slice(0, 3);
  return {
    id: entry.id,
    media,
    title: entry.title ?? entry.name ?? "untitled",
    year: yearOf(entry.release_date ?? entry.first_air_date),
    overview: entry.overview ?? "",
    poster: image(entry.poster_path, "w342"),
    backdrop: image(entry.backdrop_path, "w780"),
    score: typeof entry.vote_average === "number" && entry.vote_average > 0 ? Math.round(entry.vote_average * 10) / 10 : null,
    runtime: entry.runtime ?? null,
    genres: entry.genres?.map((genre) => genre.name) ?? genreIds.map((id) => GENRE_NAMES[id]).filter(Boolean),
    moods,
    seasons: entry.seasons
      ?.filter((season) => season.season_number > 0)
      .map((season) => ({ id: season.id, number: season.season_number, name: season.name.toLowerCase(), episodeCount: season.episode_count, airDate: season.air_date })),
  };
}

async function tmdb<T>(resource: string, revalidate: number): Promise<T> {
  const response = await fetch(`${TMDB}${resource}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}`, accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) throw new MediaError("this title could not be found.", 404);
  if (!response.ok) throw new MediaError("the film database is not answering. try again in a moment.", 502);
  return response.json() as Promise<T>;
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function searchCatalog(query: string): MediaTitle[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...CATALOG];
  return CATALOG.filter((entry) => {
    const haystack = fold(`${entry.title} ${entry.genres.join(" ")} ${entry.moods.join(" ")}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Titles matching `query`; trending titles when it is blank. */
export async function searchTitles(query: string): Promise<MediaTitle[]> {
  if (!hasLiveTmdb()) return searchCatalog(query);
  const resource = query.trim()
    ? `/search/multi?query=${encodeURIComponent(query.trim())}&include_adult=false&language=en-US&page=1`
    : "/trending/all/week?language=en-US";
  const data = await tmdb<{ results: TmdbListing[] }>(resource, query.trim() ? 60 : 3600);
  return data.results
    .filter((entry) => entry.media_type === "movie" || entry.media_type === "tv")
    .map((entry) => normalize(entry, entry.media_type === "tv" ? "series" : "movie"));
}

export async function getTitle(media: MediaKind, id: number): Promise<MediaTitle> {
  if (!hasLiveTmdb()) {
    const entry = CATALOG.find((candidate) => candidate.id === id && candidate.media === media);
    if (!entry) throw new MediaError("this title is not in the starter catalogue. add a tmdb key to search everything.", 404);
    return entry;
  }
  const entry = await tmdb<TmdbListing>(`/${media === "series" ? "tv" : "movie"}/${id}?language=en-US`, 3600);
  return normalize(entry, media);
}

export async function getSeason(id: number, season: number): Promise<MediaSeason> {
  if (!hasLiveTmdb()) {
    const found = CATALOG.find((entry) => entry.id === id && entry.media === "series")?.seasons?.find((entry) => entry.number === season);
    if (!found?.episodes) throw new MediaError("this season is not in the starter catalogue.", 404);
    return found;
  }
  const data = await tmdb<{ id: number; season_number: number; name: string; air_date: string | null; episodes: { id: number; episode_number: number; name: string; air_date: string | null }[] }>(
    `/tv/${id}/season/${season}?language=en-US`,
    3600,
  );
  return {
    id: data.id,
    number: data.season_number,
    name: data.name.toLowerCase(),
    episodeCount: data.episodes.length,
    airDate: data.air_date,
    episodes: data.episodes.map((episode) => ({ id: episode.id, number: episode.episode_number, season: data.season_number, name: episode.name, airDate: episode.air_date })),
  };
}

export function isMediaKind(value: unknown): value is MediaKind {
  return value === "movie" || value === "series";
}

/** The `watchlist` template's properties for a title; the caller adds status. */
export function watchlistProperties(title: MediaTitle): Record<string, unknown> {
  return {
    media: title.media,
    moods: title.moods,
    year: title.year,
    poster: title.poster,
    url: `https://www.themoviedb.org/${title.media === "series" ? "tv" : "movie"}/${title.id}`,
    tmdb: `${title.media}:${title.id}`,
    overview: title.overview,
  };
}

/** The `tmdb` property value a saved item carries for a title. */
export const tmdbKey = (media: MediaKind, id: number) => `${media}:${id}`;
