import { afterEach, describe, expect, it } from "vitest";
import { getSeason, getTitle, searchTitles, tmdbKey, watchlistProperties } from "../tmdb";
import { CATALOG } from "../catalog";

const originalKey = process.env.TMDB_API_KEY;
afterEach(() => {
  process.env.TMDB_API_KEY = originalKey;
});

describe("media metadata without a tmdb key", () => {
  it("searches the bundled catalogue by title, genre, and mood", async () => {
    delete process.env.TMDB_API_KEY;
    expect((await searchTitles("")).length).toBe(CATALOG.length);
    expect((await searchTitles("sever")).map((title) => title.title)).toEqual(["Severance"]);
    expect((await searchTitles("comedy funny")).length).toBeGreaterThan(1);
    expect(await searchTitles("zzzz")).toEqual([]);
  });

  it("resolves a title and a bundled season, and rejects unknown ones", async () => {
    delete process.env.TMDB_API_KEY;
    expect((await getTitle("series", 95396)).title).toBe("Severance");
    expect((await getSeason(95396, 1)).episodes).toHaveLength(9);
    await expect(getTitle("movie", 1)).rejects.toMatchObject({ status: 404 });
    await expect(getSeason(126308, 1)).rejects.toMatchObject({ status: 404 });
  });

  it("maps a title onto the watchlist template", async () => {
    delete process.env.TMDB_API_KEY;
    const title = await getTitle("movie", 693134);
    expect(watchlistProperties(title)).toMatchObject({
      media: "movie",
      year: 2024,
      moods: ["action", "thoughtful", "thrilling"],
      tmdb: tmdbKey("movie", 693134),
      url: "https://www.themoviedb.org/movie/693134",
    });
    expect(watchlistProperties(title).poster).toMatch(/^https:\/\/image\.tmdb\.org\//);
  });
});
