import { describe, expect, it } from "vitest";
import type { ItemDTO } from "@/modules/collections/model";
import { imagePath, parseTmdbKey, tmdbKeyOf, toEpisodeProgress, toWatchlistItem } from "../convert";

const row = (id: string, title: string, properties: ItemDTO["properties"]): ItemDTO => ({
  id,
  collectionId: "c1",
  articleId: null,
  article: null,
  title,
  properties,
  sortOrder: 0,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
});

describe("parseTmdbKey / tmdbKeyOf", () => {
  it("round-trips both media kinds", () => {
    expect(parseTmdbKey(tmdbKeyOf("tv", 95396))).toEqual({ media_type: "tv", tmdb_id: 95396 });
    expect(parseTmdbKey(tmdbKeyOf("movie", 693134))).toEqual({ media_type: "movie", tmdb_id: 693134 });
  });
  it("rejects hand-added rows", () => {
    expect(parseTmdbKey(undefined)).toBeNull();
    expect(parseTmdbKey("book:12")).toBeNull();
    expect(parseTmdbKey("movie:")).toBeNull();
  });
});

describe("imagePath", () => {
  it("strips the TMDB image base and keeps bare paths", () => {
    expect(imagePath("https://image.tmdb.org/t/p/w342/abc.jpg")).toBe("/abc.jpg");
    expect(imagePath("/abc.jpg")).toBe("/abc.jpg");
    expect(imagePath("https://example.com/abc.jpg")).toBeNull();
    expect(imagePath(null)).toBeNull();
  });
});

describe("toWatchlistItem", () => {
  it("maps a series row with marks, moods, and bundled metadata", () => {
    const marks = [
      { id: "e1", watchlist_item_id: "w1", season_number: 1, episode_number: 1, watched_at: "2026-09-02T00:00:00.000Z" },
      { id: "e2", watchlist_item_id: "other", season_number: 1, episode_number: 2, watched_at: "2026-09-02T00:00:00.000Z" },
    ];
    const item = toWatchlistItem(
      row("w1", "Severance", { tmdb: "series:95396", status: "watching", moods: ["thoughtful", "dark", "bogus"], poster: "https://image.tmdb.org/t/p/w342/p.jpg", sample: true }),
      marks,
    );
    expect(item).toMatchObject({
      id: "w1",
      tmdb_id: 95396,
      media_type: "tv",
      status: "watching",
      moods: ["Thought-provoking", "Dark"],
      poster_path: "/p.jpg",
      added_at: "2026-09-01T10:00:00.000Z",
      watched_at: null,
      episodes_watched: 1,
      total_episodes: 9,
      sample: true,
    });
    expect(item?.metadata).toMatchObject({ id: 95396, media_type: "tv", first_air_date: "2022-01-01", vote_average: 8.4, genres: [{ id: 1, name: "Drama" }, { id: 2, name: "Mystery" }] });
  });
  it("defaults status, stamps watched_at from a date, and returns null without a tmdb key", () => {
    const item = toWatchlistItem(row("w2", "Dune: Part Two", { tmdb: "movie:693134", status: "watched", watched_on: "2026-08-30" }));
    expect(item).toMatchObject({ status: "watched", watched_at: "2026-08-30T00:00:00.000Z", moods: [], episodes_watched: 0, sample: false });
    expect(toWatchlistItem(row("w3", "Untitled", { status: "queued" }))).toBeNull();
  });
});

describe("toEpisodeProgress", () => {
  it("maps a watched episode row and drops unbound or unwatched ones", () => {
    expect(toEpisodeProgress(row("e1", "Severance s01e01", { show: ["w1"], season: 1, episode: 1, watched: true, watched_on: "2026-09-02" }))).toEqual({
      id: "e1",
      watchlist_item_id: "w1",
      season_number: 1,
      episode_number: 1,
      watched_at: "2026-09-02T00:00:00.000Z",
    });
    expect(toEpisodeProgress(row("e2", "x", { show: ["w1"], season: 1, episode: 1, watched: true }))?.watched_at).toBe("2026-09-02T10:00:00.000Z");
    expect(toEpisodeProgress(row("e3", "x", { show: ["w1"], season: 1, episode: 1, watched: false }))).toBeNull();
    expect(toEpisodeProgress(row("e4", "x", { season: 1, episode: 1, watched: true }))).toBeNull();
  });
});
