/** Vistara's TMDB-shaped search and detail payloads built from the media module's `MediaTitle`. */
import { fetchImdbId, fetchRatings } from "@/modules/media/ratings";
import { getSeason, getTitle, hasLiveTmdb } from "@/modules/media/tmdb";
import type { MediaSeason, MediaTitle } from "@/modules/media/types";
import { imagePath, toMediaKind, toMediaType } from "./convert";
import { readLibrary } from "./library";
import type { AggregatedRatings, MediaType, TmdbMovie, TmdbSearchResult, TmdbSeason, TmdbShow } from "./types";

export const SEASON_ONE_SCOPE = "The starter collection includes season 1. This is not the complete series.";
export const NO_EPISODES_SCOPE = "Episode details are not included in the starter collection.";

const genresOf = (title: MediaTitle) => title.genres.map((name, index) => ({ id: index + 1, name }));
const dateOf = (title: MediaTitle) => (title.year ? `${title.year}-01-01` : "");

export function toSearchResult(title: MediaTitle): TmdbSearchResult {
  const media_type = toMediaType(title.media);
  return {
    id: title.id,
    media_type,
    title: title.title,
    poster_path: imagePath(title.poster),
    ...(title.year ? { [media_type === "tv" ? "first_air_date" : "release_date"]: dateOf(title) } : {}),
    vote_average: title.score ?? 0,
    overview: title.overview,
  };
}

export function toTmdbMovie(title: MediaTitle): TmdbMovie {
  return {
    id: title.id,
    title: title.title,
    overview: title.overview,
    poster_path: imagePath(title.poster),
    backdrop_path: imagePath(title.backdrop),
    release_date: dateOf(title),
    vote_average: title.score ?? 0,
    vote_count: 0,
    genres: genresOf(title),
    runtime: title.runtime,
  };
}

export function toTmdbSeason(season: MediaSeason): TmdbSeason {
  return {
    id: season.id,
    season_number: season.number,
    name: season.name,
    episode_count: season.episodeCount,
    poster_path: null,
    air_date: season.airDate,
    ...(season.episodes
      ? {
          episodes: season.episodes.map((episode) => ({
            id: episode.id,
            episode_number: episode.number,
            season_number: episode.season,
            name: episode.name,
            overview: "",
            still_path: null,
            air_date: episode.airDate,
            runtime: null,
          })),
        }
      : {}),
  };
}

export function toTmdbShow(title: MediaTitle, seasons: TmdbSeason[] = (title.seasons ?? []).map(toTmdbSeason)): TmdbShow {
  return {
    id: title.id,
    name: title.title,
    overview: title.overview,
    poster_path: imagePath(title.poster),
    backdrop_path: imagePath(title.backdrop),
    first_air_date: dateOf(title),
    vote_average: title.score ?? 0,
    vote_count: 0,
    genres: genresOf(title),
    number_of_seasons: seasons.length,
    number_of_episodes: seasons.reduce((sum, season) => sum + season.episode_count, 0),
    seasons,
    status: hasLiveTmdb() ? "Returning Series" : "Sample catalogue",
  };
}

export type TitleDetail = {
  tmdb: TmdbMovie | TmdbShow;
  ratings: AggregatedRatings;
  seasons?: TmdbSeason[];
  source: "catalog" | "tmdb" | "library";
  notice?: string;
  episode_scope?: string;
};

/** `GET /api/media/tmdb/[id]`: the title, its ratings, and (for series, on request) every season's episodes. */
export async function titleDetail(type: MediaType, id: number, withSeasons: boolean): Promise<TitleDetail> {
  const media = toMediaKind(type);
  let title: MediaTitle;
  try { title = await getTitle(media, id); }
  catch (error) {
    const saved = (await readLibrary()).items.find((item) => item.tmdb_id === id && item.media_type === type);
    if (!saved) throw error;
    const metadata = saved.metadata;
    const released = metadata?.release_date || metadata?.first_air_date || "";
    const stored: MediaTitle = { id, media, title: saved.title, year: released ? Number(released.slice(0, 4)) : null,
      overview: metadata?.overview ?? "", poster: saved.poster_path, backdrop: metadata?.backdrop_path ?? null,
      score: metadata?.vote_average ?? null, runtime: metadata?.runtime ?? null, genres: (metadata?.genres ?? []).map((genre) => genre.name), moods: [] };
    const tmdb = type === "movie" ? { ...toTmdbMovie(stored), release_date: released } : { ...toTmdbShow(stored), first_air_date: released };
    return { tmdb, ratings: {}, source: "library",
      notice: "Showing saved library details. Live metadata is unavailable.",
      ...(type === "tv" ? { seasons: [], episode_scope: "Saved episode progress is retained. Connect TMDB to load the full episode list." } : {}) };
  }
  const imdbId = await fetchImdbId(media, id);
  const ratings = await fetchRatings(title.title, title.year, imdbId);
  const live = hasLiveTmdb();
  const tmdb = type === "movie" ? toTmdbMovie(title) : toTmdbShow(title);
  let seasons: TmdbSeason[] | undefined;
  if (type === "tv" && withSeasons) {
    seasons = [];
    const summaries = title.seasons ?? [];
    for (let index = 0; index < summaries.length; index += 5) {
      const loaded = await Promise.all(
        summaries.slice(index, index + 5).map((season) => getSeason(id, season.number).catch((error) => (live ? Promise.reject(error) : null))),
      );
      seasons.push(...loaded.filter((season): season is MediaSeason => season !== null).map(toTmdbSeason));
    }
  }
  const episode_scope = live || type !== "tv" ? undefined : title.seasons?.length ? SEASON_ONE_SCOPE : NO_EPISODES_SCOPE;
  return { tmdb, ratings, seasons, source: live ? "tmdb" : "catalog", episode_scope };
}
