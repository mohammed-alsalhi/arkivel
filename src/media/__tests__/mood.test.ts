import { describe, expect, it } from "vitest";
import { rankForMood } from "../mood";
import type { WatchlistItem } from "../types";

const item = (id: string, title: string, moods: WatchlistItem["moods"], vote: number, tmdb_id = 1, media_type: WatchlistItem["media_type"] = "movie"): WatchlistItem => ({
  id,
  tmdb_id,
  media_type,
  title,
  poster_path: null,
  status: "plan_to_watch",
  moods,
  added_at: "2026-09-01T00:00:00.000Z",
  watched_at: null,
  metadata: { id: tmdb_id, media_type, title, poster_path: null, overview: "", vote_average: vote },
});

describe("rankForMood", () => {
  it("puts tag matches first, breaks ties by score then title", () => {
    const ranked = rankForMood([item("a", "Zeta", ["Funny"], 9), item("b", "Alpha", ["Dark"], 7), item("c", "Beta", ["Dark"], 7), item("d", "Gamma", ["Dark", "Scary"], 5)], "something dark and creepy");
    expect(ranked.map((pick) => pick.item.id)).toEqual(["d", "b", "c", "a"]);
    expect(ranked[0].matched).toEqual(["Dark", "Scary"]);
    expect(ranked[3].matched).toEqual([]);
  });
  it("matches related words on whole-word boundaries", () => {
    expect(rankForMood([item("a", "A", ["Funny"], 5)], "make me laugh")[0].matched).toEqual(["Funny"]);
    expect(rankForMood([item("a", "A", ["Funny"], 5)], "laughter")[0].matched).toEqual([]);
  });
  it("adds the catalogue's moods for bundled titles", () => {
    const [pick] = rankForMood([item("a", "Dune: Part Two", [], 8.1, 693134)], "an action night");
    expect(pick.matched).toEqual(["Action-packed"]);
    expect(pick.score).toBe(108.1);
  });
});
