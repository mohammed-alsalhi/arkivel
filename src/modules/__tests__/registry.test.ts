import { describe, expect, it } from "vitest";
import { CORE_COMMANDS, CORE_NAV } from "../core";
import { composeCommands, composeNav } from "../navigation";
import {
  DEFAULT_ENABLED_MODULES,
  MODULES,
  moduleForPath,
  parseModuleIds,
  resolveEnabledModules,
} from "../registry";

describe("module registry", () => {
  it("registers every built module with a default of enabled", () => {
    expect(MODULES.map((module) => module.id)).toEqual(["collections", "graph", "assets", "import", "export", "api", "feeds", "share", "media"]);
    expect(DEFAULT_ENABLED_MODULES).toEqual(["collections", "graph", "assets", "import", "export", "api", "feeds", "share"]);
  });

  it("resolves from the environment when there is no override", () => {
    expect(resolveEnabledModules(undefined, null)).toEqual(DEFAULT_ENABLED_MODULES);
    expect(resolveEnabledModules("", null)).toEqual(DEFAULT_ENABLED_MODULES);
    expect(resolveEnabledModules("graph, api", null)).toEqual(["graph", "api"]);
    expect(parseModuleIds("API,Graph")).toEqual(["graph", "api"]);
  });

  it("lets a stored override replace the environment list", () => {
    expect(resolveEnabledModules("graph,api", { enabled: ["feeds", "graph"] })).toEqual(["graph", "feeds"]);
    expect(resolveEnabledModules("graph,api", { enabled: [] })).toEqual([]);
  });

  it("ignores unknown ids and non-list overrides", () => {
    expect(resolveEnabledModules("graph,marketplace,collections", null)).toEqual(["collections", "graph"]);
    expect(resolveEnabledModules("graph", { enabled: ["assets", "plugins", 42, null] })).toEqual(["assets"]);
    expect(resolveEnabledModules("graph", { enabled: "assets" })).toEqual(["graph"]);
    expect(resolveEnabledModules("graph", "not a config")).toEqual(["graph"]);
  });

  it("maps a path to the module that owns it", () => {
    expect(moduleForPath("/graph")?.id).toBe("graph");
    expect(moduleForPath("/api/graph?center=home")?.id).toBe("graph");
    expect(moduleForPath("/assets")?.id).toBe("assets");
    expect(moduleForPath("/api/upload")?.id).toBe("assets");
    expect(moduleForPath("/import/obsidian")?.id).toBe("import");
    expect(moduleForPath("/api/import/notion")?.id).toBe("import");
    expect(moduleForPath("/api/articles/import")?.id).toBe("import");
    expect(moduleForPath("/api/export/zip")?.id).toBe("export");
    expect(moduleForPath("/api/v1/openapi.json")?.id).toBe("api");
    expect(moduleForPath("/api-docs")?.id).toBe("api");
    expect(moduleForPath("/feed.xml")?.id).toBe("feeds");
    expect(moduleForPath("/feed/atom")?.id).toBe("feeds");
    expect(moduleForPath("/share/abc123")?.id).toBe("share");
    expect(moduleForPath("/api/articles/clx1/share-token")?.id).toBe("share");
    expect(moduleForPath("/api/articles/clx1")).toBeUndefined();
    expect(moduleForPath("/graphs")).toBeUndefined();
    expect(moduleForPath("/articles/graph")).toBeUndefined();
    expect(moduleForPath("/")).toBeUndefined();
  });

  it("composes navigation from the core list plus enabled modules, by section and access", () => {
    const everyone = { admin: false, loggedIn: false };
    const admin = { admin: true, loggedIn: true };

    expect(composeNav("library", DEFAULT_ENABLED_MODULES, everyone).map((entry) => entry.label)).toEqual([
      "all pages",
      "tags",
      "collections",
      "graph",
    ]);
    expect(composeNav("library", ["assets"], everyone).map((entry) => entry.label)).toEqual(["all pages", "tags"]);
    expect(composeNav("footer", [], everyone)).toEqual([]);
    expect(composeNav("footer", [], admin).map((entry) => entry.label)).toEqual(["settings"]);
    expect(CORE_NAV.every((entry) => entry.order > 0)).toBe(true);
  });

  it("composes palette commands with core entries first and module commands after", () => {
    const labels = composeCommands(DEFAULT_ENABLED_MODULES, { admin: true, loggedIn: true }).map(
      (command) => command.label,
    );
    expect(labels.slice(0, CORE_COMMANDS.length)).toEqual(CORE_COMMANDS.map((command) => command.label));
    expect(labels).toContain("graph");
    expect(labels).toContain("api reference");

    const visitor = composeCommands(["graph"], { admin: false, loggedIn: false }).map((command) => command.label);
    expect(visitor).toEqual(["all pages", "inbox", "tags", "search", "new page", "graph"]);
  });
});
