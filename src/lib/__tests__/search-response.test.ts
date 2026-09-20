import { describe, expect, it } from "vitest";
import { getSearchResults } from "../search-response";

const article = {
  id: "a1",
  title: "Known Article",
  slug: "known-article",
  excerpt: "A result",
};

describe("search response helpers", () => {
  it("accepts the current /api/search object response shape", () => {
    expect(getSearchResults({ results: [article] })).toEqual([article]);
  });

  it("ignores malformed payloads", () => {
    expect(getSearchResults({ results: [{ title: "Missing identifiers" }] })).toEqual([]);
    expect(getSearchResults([article])).toEqual([]);
  });
});
