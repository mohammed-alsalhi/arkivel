import { describe, expect, it } from "vitest";
import { parseBackup, planRestore } from "../backup";
import type { Library } from "../types";
import { InputError } from "../validation";

const backup = () => ({
  version: 1,
  items: [
    {
      id: "a",
      tmdb_id: 95396,
      media_type: "tv",
      title: "Severance",
      poster_path: "/p.jpg",
      status: "watching",
      moods: ["Dark"],
      added_at: "2026-09-01T10:00:00.000Z",
      watched_at: null,
      metadata: { id: 95396, media_type: "tv", title: "Severance", overview: "", poster_path: null, vote_average: 8.4, first_air_date: "2022-01-01", genres: [{ id: 1, name: "Drama" }], runtime: null, backdrop_path: "/b.jpg" },
      episodes_watched: 2,
      total_episodes: 9,
      sample: false,
    },
    { id: "b", tmdb_id: 693134, media_type: "movie", title: "Dune: Part Two", poster_path: null, status: "watched", moods: [], added_at: "2026-09-01T10:00:00.000Z", watched_at: "2026-09-03T10:00:00.000Z" },
  ],
  episodes: [
    { id: "e1", watchlist_item_id: "a", season_number: 1, episode_number: 1, watched_at: "2026-09-02T10:00:00.000Z" },
    { id: "e2", watchlist_item_id: "a", season_number: 1, episode_number: 2, watched_at: "2026-09-02T10:00:00.000Z" },
  ],
});

describe("parseBackup", () => {
  it("accepts a valid version 1 backup and drops unknown fields", () => {
    const parsed = parseBackup(backup());
    expect(parsed.items).toHaveLength(2);
    expect(parsed.episodes).toHaveLength(2);
    expect(parsed.items[0]).not.toHaveProperty("episodes_watched");
    expect(parsed.items[0].metadata).toMatchObject({ id: 95396, backdrop_path: "/b.jpg", genres: [{ id: 1, name: "Drama" }] });
    expect(parsed.items[1].watched_at).toBe("2026-09-03T10:00:00.000Z");
  });
  it("rejects the wrong version", () => {
    expect(() => parseBackup({ ...backup(), version: 2 })).toThrow("Choose a Vistara version 1 library backup.");
    expect(() => parseBackup({ items: [], episodes: [] })).toThrow(InputError);
  });
  it("rejects duplicate title ids, identities, and episode marks", () => {
    const dupId = backup();
    dupId.items[1].id = "a";
    expect(() => parseBackup(dupId)).toThrow("A backup contains duplicate title IDs or TMDB identities.");
    const dupIdentity = backup();
    dupIdentity.items[1] = { ...dupIdentity.items[1], tmdb_id: 95396, media_type: "tv" };
    expect(() => parseBackup(dupIdentity)).toThrow("A backup contains duplicate title IDs or TMDB identities.");
    const dupMark = backup();
    dupMark.episodes[1] = { ...dupMark.episodes[1], episode_number: 1 };
    expect(() => parseBackup(dupMark)).toThrow("A backup contains duplicate episode marks.");
  });
  it("rejects marks on movies, bad metadata, and remote image paths", () => {
    const movieMark = backup();
    movieMark.episodes[0].watchlist_item_id = "b";
    expect(() => parseBackup(movieMark)).toThrow("Each episode mark must reference a TV title in the backup.");
    const wrongMeta = backup();
    wrongMeta.items[0].metadata!.id = 1;
    expect(() => parseBackup(wrongMeta)).toThrow("Backup metadata must belong to its title.");
    const remote = backup();
    remote.items[0].poster_path = "https://evil/p.jpg";
    expect(() => parseBackup(remote)).toThrow("Invalid poster path.");
    const remoteMeta = backup();
    remoteMeta.items[0].metadata!.backdrop_path = "https://evil/b.jpg";
    expect(() => parseBackup(remoteMeta)).toThrow("Invalid image path in backup.");
  });
});

describe("planRestore", () => {
  it("counts existing titles and marks, and groups new marks by backup title", () => {
    const parsed = parseBackup(backup());
    const library: Library = {
      version: 1,
      items: [{ ...parsed.items[0], id: "saved-1", status: "watched" }],
      episodes: [{ id: "m1", watchlist_item_id: "saved-1", season_number: 1, episode_number: 1, watched_at: "2026-01-01T00:00:00.000Z" }],
    };
    const plan = planRestore(library, parsed);
    expect(plan.stats).toEqual({ added: 1, existing: 1, episodesAdded: 1, episodesExisting: 1 });
    expect(plan.targets.get("a")?.id).toBe("saved-1");
    expect(plan.targets.get("b")).toBeNull();
    expect(plan.marks.get("a")).toEqual([{ season_number: 1, episode_number: 2, watched_at: "2026-09-02T10:00:00.000Z" }]);
    expect(planRestore({ version: 1, items: [], episodes: [] }, parsed).stats).toEqual({ added: 2, existing: 0, episodesAdded: 2, episodesExisting: 0 });
  });
});
