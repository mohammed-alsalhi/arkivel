/**
 * The media site contract shared by pages and API routes. `src/media/convert.ts`
 * maps these onto collection items; nothing here touches the database.
 */

export type MediaType = "movie" | "tv";
export type WatchStatus = "plan_to_watch" | "watching" | "watched" | "dropped";

export const MOODS = [
  "Feel-good",
  "Thrilling",
  "Romantic",
  "Dark",
  "Funny",
  "Thought-provoking",
  "Action-packed",
  "Relaxing",
  "Scary",
  "Inspiring",
] as const;
export type Mood = (typeof MOODS)[number];

export interface WatchlistItem {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  status: WatchStatus;
  moods: Mood[];
  added_at: string;
  watched_at: string | null;
  metadata?: TmdbSearchResult & {
    backdrop_path?: string | null;
    genres?: { id: number; name: string }[];
    runtime?: number | null;
    episode_scope?: string;
  };
  episodes_watched?: number;
  total_episodes?: number;
  reason?: string;
  /** True while the row is an untouched starter title from the kit. */
  sample?: boolean;
}

export interface EpisodeProgress {
  id: string;
  watchlist_item_id: string;
  season_number: number;
  episode_number: number;
  watched_at: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  runtime: number | null;
}

export interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TmdbSeason[];
  status: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

export interface TmdbSearchResult {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}

export interface AggregatedRatings {
  imdb?: string;
  rotten_tomatoes?: string;
  metacritic?: string;
}

export interface LibraryHealth {
  mode: "hosted";
  catalog: "sample" | "live";
  recommendation: "local" | "ai";
  sample_library: boolean;
  /** Whether the current visitor may change the library. */
  can_edit: boolean;
}

export type Library = { version: 1; items: WatchlistItem[]; episodes: EpisodeProgress[] };
