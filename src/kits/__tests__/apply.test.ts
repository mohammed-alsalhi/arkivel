import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    systemSetting: { upsert: vi.fn() },
    collection: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    collectionItem: { findFirst: vi.fn(), create: vi.fn() },
    category: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

vi.mock("@/modules/enabled", () => ({ MODULES_SETTING_KEY: "modules" }));

import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { applyKit, KitError } from "@/kits/apply";

const now = new Date("2026-01-01T00:00:00.000Z");

type CreateArgs = { data: Record<string, unknown> & { views: { create: Record<string, unknown>[] } } };

/** Records created collections so later lookups by slug find them, like a real database would. */
function useInMemoryCollections() {
  const store = new Map<string, { id: string; slug: string }>();
  let counter = 0;
  vi.mocked(prisma.collection.findUnique).mockImplementation((async (args: { where: { slug?: string; id?: string } }) => {
    if (args.where.slug) return store.get(args.where.slug) ?? null;
    return [...store.values()].find((row) => row.id === args.where.id) ?? null;
  }) as never);
  vi.mocked(prisma.collection.findFirst).mockImplementation((async (args: { where: { slug: string } }) =>
    store.get(args.where.slug) ? { id: store.get(args.where.slug)!.id } : null) as never);
  vi.mocked(prisma.collection.create).mockImplementation((async (args: CreateArgs) => {
    const id = `col-${++counter}`;
    const slug = args.data.slug as string;
    store.set(slug, { id, slug });
    return {
      id,
      slug,
      name: args.data.name,
      icon: null,
      description: args.data.description ?? null,
      categoryId: args.data.categoryId ?? null,
      category: null,
      schema: args.data.schema,
      views: args.data.views.create.map((view, index) => ({ id: `${id}-v${index}`, ...view })),
      createdAt: now,
      updatedAt: now,
    };
  }) as never);
  return store;
}

describe("applyKit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInMemoryCollections();
    vi.mocked(prisma.collectionItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.collectionItem.create).mockImplementation((async (args: { data: Record<string, unknown> }) => ({
      id: `item-${Math.random()}`,
      collectionId: args.data.collectionId,
      articleId: null,
      article: null,
      title: args.data.title,
      properties: args.data.properties,
      sortOrder: args.data.sortOrder,
      createdAt: now,
      updatedAt: now,
    })) as never);
  });

  it("rejects an unknown kit before touching anything", async () => {
    await expect(applyKit("crm")).rejects.toBeInstanceOf(KitError);
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("stores the kit's modules as the override and creates its collections with sample items", async () => {
    const report = await applyKit("notes-and-tasks");

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { id: "modules" },
      update: { enabled: true, config: { enabled: ["collections", "graph"] } },
      create: { id: "modules", enabled: true, config: { enabled: ["collections", "graph"] } },
    });
    expect(report).toEqual({
      kit: "notes-and-tasks",
      skin: "folio",
      modulesEnabled: ["collections", "graph"],
      collectionsCreated: ["tasks", "reading-list"],
      collectionsSkipped: [],
      itemsCreated: 6,
    });
    expect(prisma.collection.create).toHaveBeenCalledTimes(2);
    expect(prisma.collectionItem.create).toHaveBeenCalledTimes(6);

    const tasks = vi.mocked(prisma.collection.create).mock.calls[0][0] as unknown as CreateArgs;
    expect(tasks.data.slug).toBe("tasks");
    expect(tasks.data.views.create.map((view) => [view.slug, view.kind, view.isDefault])).toEqual([
      ["table", "table", true],
      ["board", "board", false],
    ]);
    expect((tasks.data.views.create[1].config as { groupBy?: string }).groupBy).toBe("status");

    const firstItem = vi.mocked(prisma.collectionItem.create).mock.calls[0][0] as unknown as { data: Record<string, unknown> };
    expect(firstItem.data.collectionId).toBe("col-1");
    expect(firstItem.data.properties).toMatchObject({ status: "todo", priority: "high" });

    expect(logAudit).toHaveBeenCalledWith(
      "kit.apply",
      { type: "kit", id: "notes-and-tasks", label: "notes and tasks" },
      expect.objectContaining({ collectionsCreated: ["tasks", "reading-list"], itemsCreated: 6, seedSampleItems: true }),
    );
  });

  it("is idempotent: a second apply skips existing collections and seeds nothing", async () => {
    await applyKit("notes-and-tasks");
    vi.mocked(prisma.collection.create).mockClear();
    vi.mocked(prisma.collectionItem.create).mockClear();

    const report = await applyKit("notes-and-tasks");

    expect(report.collectionsCreated).toEqual([]);
    expect(report.collectionsSkipped).toEqual(["tasks", "reading-list"]);
    expect(report.itemsCreated).toBe(0);
    expect(prisma.collection.create).not.toHaveBeenCalled();
    expect(prisma.collectionItem.create).not.toHaveBeenCalled();
    // The module override is re-asserted every time.
    expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
  });

  it("only seeds items into collections it created, and only when asked", async () => {
    const store = useInMemoryCollections();
    store.set("tasks", { id: "existing-tasks", slug: "tasks" });

    const report = await applyKit("notes-and-tasks", { seedSampleItems: false });

    expect(report.collectionsSkipped).toEqual(["tasks"]);
    expect(report.collectionsCreated).toEqual(["reading-list"]);
    expect(report.itemsCreated).toBe(0);
    expect(prisma.collectionItem.create).not.toHaveBeenCalled();
  });

  it("applies a collection-less kit by modules alone", async () => {
    const report = await applyKit("wiki");
    expect(report).toEqual({
      kit: "wiki",
      skin: "wiki",
      modulesEnabled: ["graph", "api", "feeds", "share"],
      collectionsCreated: [],
      collectionsSkipped: [],
      itemsCreated: 0,
    });
    expect(prisma.collection.create).not.toHaveBeenCalled();
  });

  it("creates the team kit's tasks collection empty even with sample items on", async () => {
    const report = await applyKit("team-knowledge-base", { seedSampleItems: true });
    expect(report.collectionsCreated).toEqual(["tasks"]);
    expect(report.itemsCreated).toBe(0);
    expect(report.modulesEnabled).toContain("collections");
  });

  it("binds coursework to the actual courses id and creates all four views idempotently", async () => {
    const report = await applyKit("course-workspace");
    expect(report.collectionsCreated).toEqual(["courses", "coursework"]);
    expect(report.itemsCreated).toBe(0);
    const coursework = vi.mocked(prisma.collection.create).mock.calls[1][0] as unknown as CreateArgs;
    expect(coursework.data.schema).toContainEqual({ id: "course", name: "course", type: "relation", collectionId: "col-1" });
    expect(coursework.data.views.create.map((view) => view.kind)).toEqual(["table", "board", "list", "calendar"]);
    expect((await applyKit("course-workspace")).collectionsSkipped).toEqual(["courses", "coursework"]);
  });
});
