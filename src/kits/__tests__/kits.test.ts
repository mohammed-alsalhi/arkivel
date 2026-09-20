import { describe, expect, it } from "vitest";
import { getKit, isKitId, KIT_IDS, KITS, kitCollectionSlug, kitStatus } from "@/kits";
import { validateProperties } from "@/modules/collections/properties";
import { getTemplate } from "@/modules/collections/templates";
import { MODULE_IDS } from "@/modules/registry";

describe("kit definitions", () => {
  it("ships the documented kits", () => {
    expect(KIT_IDS).toEqual(["wiki", "notes-and-tasks", "team-knowledge-base", "course-workspace", "watchlist"]);
    expect(isKitId("wiki")).toBe(true);
    expect(isKitId("crm")).toBe(false);
    expect(getKit("notes-and-tasks")?.name).toBe("notes and tasks");
    expect(getKit("nope")).toBeUndefined();
  });

  it("only references registered modules", () => {
    for (const kit of KITS) {
      for (const id of kit.modules) expect(MODULE_IDS).toContain(id);
      expect(new Set(kit.modules).size).toBe(kit.modules.length);
    }
    expect(getKit("wiki")!.modules).toEqual(["graph", "api", "feeds", "share"]);
    expect(getKit("wiki")!.collections).toEqual([]);
    expect(getKit("team-knowledge-base")!.modules).toEqual([...MODULE_IDS]);
  });

  it("seeds sample items that validate against their template schema", () => {
    for (const kit of KITS) {
      for (const collection of kit.collections) {
        const template = getTemplate(collection.template);
        expect(template, `${kit.id}/${collection.name}`).toBeDefined();
        for (const item of collection.items ?? []) {
          const result = validateProperties(template!.schema, item.properties ?? {});
          expect(result.errors, `${kit.id}/${collection.name}/${item.title}`).toEqual({});
          expect(item.title.trim()).not.toBe("");
        }
        for (const view of collection.views ?? []) {
          if (view.kind === "board" && view.groupBy) {
            const property = template!.schema.find((entry) => entry.id === view.groupBy);
            expect(property?.type).toBe("select");
          }
        }
      }
    }
  });

  it("gives notes-and-tasks a tasks board across every status and a reading list", () => {
    const kit = getKit("notes-and-tasks")!;
    const tasks = kit.collections.find((collection) => collection.name === "tasks")!;
    expect(tasks.template).toBe("tasks");
    expect(tasks.views).toEqual([{ kind: "table" }, { kind: "board", groupBy: "status" }]);
    expect(tasks.items).toHaveLength(4);
    expect(new Set(tasks.items!.map((item) => item.properties?.status))).toEqual(new Set(["todo", "in_progress", "done"]));

    const reading = kit.collections.find((collection) => collection.name === "reading list")!;
    expect(reading.template).toBe("reading_list");
    expect(reading.items).toHaveLength(2);
    expect(kitCollectionSlug(reading)).toBe("reading-list");

    const team = getKit("team-knowledge-base")!;
    expect(team.collections.map((collection) => collection.name)).toEqual(["tasks"]);
    expect(team.collections[0].items).toEqual([]);
  });
});

describe("kitStatus", () => {
  const kit = getKit("notes-and-tasks")!;

  it("is applied when every module is enabled and every collection exists", () => {
    const status = kitStatus(kit, { enabled: ["collections", "graph", "api"], existingSlugs: ["tasks", "reading-list"] });
    expect(status.status).toBe("applied");
    expect(status.modulesEnabled).toEqual(["collections", "graph"]);
    expect(status.collections).toEqual([
      { name: "tasks", slug: "tasks", template: "tasks", exists: true, sampleItems: 4 },
      { name: "reading list", slug: "reading-list", template: "reading_list", exists: true, sampleItems: 2 },
    ]);
  });

  it("is partial when some of it is in place", () => {
    expect(kitStatus(kit, { enabled: ["collections", "graph"], existingSlugs: new Set() }).status).toBe("partial");
    expect(kitStatus(kit, { enabled: ["api"], existingSlugs: ["tasks"] }).status).toBe("partial");
    expect(kitStatus(kit, { enabled: ["collections"], existingSlugs: ["tasks", "reading-list"] }).status).toBe("partial");
  });

  it("is not applied when nothing of it is in place", () => {
    const status = kitStatus(kit, { enabled: ["api", "feeds"], existingSlugs: [] });
    expect(status.status).toBe("not applied");
    expect(status.modulesEnabled).toEqual([]);
    expect(status.collections.every((collection) => !collection.exists)).toBe(true);
  });

  it("judges a collection-less kit on its modules alone", () => {
    const wiki = getKit("wiki")!;
    expect(kitStatus(wiki, { enabled: [...MODULE_IDS], existingSlugs: [] }).status).toBe("applied");
    expect(kitStatus(wiki, { enabled: ["graph"], existingSlugs: [] }).status).toBe("partial");
    expect(kitStatus(wiki, { enabled: ["collections"], existingSlugs: [] }).status).toBe("not applied");
  });
});
