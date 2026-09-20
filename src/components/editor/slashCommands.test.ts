import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS, filterSlashCommands, getSlashQuery } from "./slashCommands";

describe("getSlashQuery", () => {
  it("opens on a slash at the start of a block", () => {
    expect(getSlashQuery("/")).toEqual({ query: "", slashOffset: 0 });
    expect(getSlashQuery("/hea")).toEqual({ query: "hea", slashOffset: 0 });
  });

  it("opens on a slash after whitespace and reports where it sits", () => {
    expect(getSlashQuery("some text /ta")).toEqual({ query: "ta", slashOffset: 10 });
  });

  it("ignores slashes inside words, paths, and queries with spaces", () => {
    expect(getSlashQuery("a/b")).toBeNull();
    expect(getSlashQuery("see /usr/local")).toBeNull();
    expect(getSlashQuery("/two words")).toBeNull();
    expect(getSlashQuery("plain text")).toBeNull();
  });
});

describe("filterSlashCommands", () => {
  it("returns every command for an empty query", () => {
    expect(filterSlashCommands("")).toHaveLength(SLASH_COMMANDS.length);
    expect(filterSlashCommands("   ")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("ranks label and keyword prefixes before substring matches", () => {
    const ids = filterSlashCommands("h").map((command) => command.id);
    expect(ids.slice(0, 3)).toEqual(["heading1", "heading2", "heading3"]);
    expect(ids).toContain("divider"); // "hr" keyword
  });

  it("matches keywords like h2, ul, and [[", () => {
    expect(filterSlashCommands("h2").map((command) => command.id)).toEqual(["heading2"]);
    expect(filterSlashCommands("ul")[0].id).toBe("bulletList");
    expect(filterSlashCommands("[[")[0].id).toBe("wikiLink");
  });

  it("returns nothing for an unknown query", () => {
    expect(filterSlashCommands("zzz")).toEqual([]);
  });
});
