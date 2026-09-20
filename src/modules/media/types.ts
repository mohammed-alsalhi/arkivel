/** Normalized film and series metadata, whichever source it came from. */

export type MediaKind = "movie" | "series";

/** Mood ids match the `watchlist` collection template's `moods` options. */
export type MoodId =
  | "funny"
  | "feel_good"
  | "relaxing"
  | "romantic"
  | "thrilling"
  | "dark"
  | "thoughtful"
  | "inspiring"
  | "action"
  | "scary";

export type MediaEpisode = { id: number; number: number; season: number; name: string; airDate: string | null };

export type MediaSeason = {
  id: number;
  number: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  episodes?: MediaEpisode[];
};

export type MediaTitle = {
  /** TMDB id. */
  id: number;
  media: MediaKind;
  title: string;
  year: number | null;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  /** TMDB community score, 0–10. */
  score: number | null;
  runtime: number | null;
  genres: string[];
  moods: MoodId[];
  seasons?: MediaSeason[];
};

/** A `MediaTitle` as the discover page lists it, plus whether the library already has it. */
export type MediaSearchHit = MediaTitle & { savedItemId: string | null };
