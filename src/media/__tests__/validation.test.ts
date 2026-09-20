import { describe, expect, it } from "vitest";
import { InputError, episode, importTitles, moodTags, newItem } from "../validation";

describe("newItem", () => {
  it("applies defaults and trims", () => {
    expect(newItem({ tmdb_id: 693134, media_type: "movie", title: "  Dune: Part Two " })).toEqual({
      tmdb_id: 693134,
      media_type: "movie",
      title: "Dune: Part Two",
      poster_path: null,
      status: "plan_to_watch",
      moods: [],
    });
  });
  it("keeps a valid poster path, status, and deduplicated moods", () => {
    expect(newItem({ tmdb_id: 1, media_type: "tv", title: "x", poster_path: "/a.jpg", status: "watched", moods: ["Dark", "Dark", "Funny"] })).toMatchObject({
      poster_path: "/a.jpg",
      status: "watched",
      moods: ["Dark", "Funny"],
    });
  });
  it("rejects bad input with 400s", () => {
    for (const bad of [
      null,
      [],
      { tmdb_id: 0, media_type: "movie", title: "x" },
      { tmdb_id: 1.5, media_type: "movie", title: "x" },
      { tmdb_id: 1, media_type: "book", title: "x" },
      { tmdb_id: 1, media_type: "movie", title: "" },
      { tmdb_id: 1, media_type: "movie", title: "x", poster_path: "https://evil/x.jpg" },
      { tmdb_id: 1, media_type: "movie", title: "x", status: "done" },
      { tmdb_id: 1, media_type: "movie", title: "x", moods: ["Sad"] },
    ]) {
      expect(() => newItem(bad)).toThrow(InputError);
    }
    try {
      newItem(null);
    } catch (error) {
      expect((error as InputError).status).toBe(400);
    }
  });
});

describe("episode / moodTags", () => {
  it("bounds season and episode numbers", () => {
    expect(episode({ season_number: 0, episode_number: 1 })).toEqual({ season_number: 0, episode_number: 1 });
    expect(() => episode({ season_number: -1, episode_number: 1 })).toThrow(InputError);
    expect(() => episode({ season_number: 1, episode_number: 0 })).toThrow(InputError);
  });
  it("rejects more tags than moods exist", () => {
    expect(() => moodTags(new Array(11).fill("Dark"))).toThrow(InputError);
  });
});

describe("importTitles", () => {
  it("accepts a plain array of strings and objects, deduplicating case-insensitively", () => {
    expect(importTitles(["Dune: Part Two", { title: "Severance" }, "dune: part two", { name: "The Bear" }, { note: "Fleabag" }])).toEqual([
      "dune: part two",
      "Severance",
      "The Bear",
      "Fleabag",
    ]);
  });
  it("accepts Google Takeout shapes", () => {
    expect(importTitles({ items: [{ Title: "Interstellar" }] })).toEqual(["Interstellar"]);
    expect(importTitles({ saved: ["Whiplash"] })).toEqual(["Whiplash"]);
    expect(importTitles({ Items: ["Aftersun"] })).toEqual(["Aftersun"]);
    expect(importTitles({ Saved: [{ name: "Succession" }] })).toEqual(["Succession"]);
  });
  it("rejects empty, oversized, and malformed collections", () => {
    expect(() => importTitles([])).toThrow("No titles found to import.");
    expect(() => importTitles({ other: [] })).toThrow(InputError);
    expect(() => importTitles(["ok", 42])).toThrow(InputError);
    expect(() => importTitles([{ title: "" }])).toThrow(InputError);
    expect(() => importTitles(Array.from({ length: 101 }, (_, index) => `Title ${index}`))).toThrow("Import up to 100 titles at a time. Split this file into smaller batches.");
  });
});
