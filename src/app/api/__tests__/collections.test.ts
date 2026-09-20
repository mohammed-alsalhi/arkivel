import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collectionItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collectionView: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    category: { findUnique: vi.fn() },
    article: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/modules/enabled", () => ({
  moduleDisabledResponse: vi.fn(async () => null),
  requireModule: vi.fn(async () => undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { POST as createCollection } from "@/app/api/collections/route";
import { POST as createItem, GET as listItems } from "@/app/api/collections/[id]/items/route";
import { PATCH as patchItem } from "@/app/api/collections/[id]/items/[itemId]/route";

function request(body: unknown, url = "http://localhost/api/collections"): NextRequest {
  return { json: async () => body, nextUrl: new URL(url) } as unknown as NextRequest;
}

const params = <T extends Record<string, string>>(values: T) => ({ params: Promise.resolve(values) });

const now = new Date("2026-01-01T00:00:00.000Z");

const storedCollection = {
  id: "col-1",
  slug: "tasks",
  name: "tasks",
  icon: null,
  description: null,
  categoryId: null,
  category: null,
  schema: [
    { id: "title", name: "task", type: "title" },
    { id: "status", name: "status", type: "select", options: [{ id: "todo", label: "todo", tone: "default" }] },
    { id: "estimate", name: "estimate", type: "number" },
    { id: "done", name: "done", type: "checkbox" },
  ],
  views: [{ id: "view-1", slug: "table", name: "table", kind: "table", config: {}, isDefault: true, sortOrder: 0 }],
  createdAt: now,
  updatedAt: now,
};

describe("collections API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (run: (tx: unknown) => Promise<unknown>) => run(prisma)) as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getSession).mockResolvedValue({ id: "u1", username: "owner", email: "o@example.com", displayName: null, role: "admin" });
    vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.collection.findUnique).mockImplementation((async (args: { where: { id?: string; slug?: string } }) =>
      args.where.id === "col-1" || args.where.slug === "tasks" ? storedCollection : null) as never);
  });

  describe("POST /api/collections", () => {
    it("rejects anonymous callers", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(getSession).mockResolvedValue(null);
      const res = await createCollection(request({ name: "tasks" }));
      expect(res.status).toBe(401);
      expect(prisma.collection.create).not.toHaveBeenCalled();
    });

    it("rejects signed-in viewers", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(getSession).mockResolvedValue({ id: "u2", username: "v", email: "v@example.com", displayName: null, role: "viewer" });
      const res = await createCollection(request({ name: "tasks" }));
      expect(res.status).toBe(403);
    });

    it("returns field errors when the name is missing", async () => {
      const res = await createCollection(request({ template: "tasks" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "name is required", fields: { name: "required" } });
    });

    it("rejects an unknown template", async () => {
      const res = await createCollection(request({ name: "x", template: "crm" }));
      expect(res.status).toBe(400);
      expect((await res.json()).fields.template).toBe("unknown template");
    });

    it("rejects a custom schema without a title", async () => {
      const res = await createCollection(request({ name: "x", schema: [{ id: "a", name: "a", type: "text" }] }));
      expect(res.status).toBe(400);
      expect((await res.json()).fields.schema).toMatch(/exactly one title/);
    });

    it("creates from the tasks template with a de-duplicated slug and audits it", async () => {
      vi.mocked(prisma.collection.findFirst).mockImplementation((async (args: { where: { slug: string } }) =>
        args.where.slug === "tasks" ? { id: "existing" } : null) as never);
      vi.mocked(prisma.collection.create).mockImplementation((async (args: { data: Record<string, unknown> }) => ({
        ...storedCollection,
        id: "col-2",
        slug: args.data.slug,
        schema: args.data.schema,
        views: (args.data.views as { create: unknown[] }).create.map((view, index) => ({ id: `v${index}`, ...(view as object) })),
      })) as never);

      const res = await createCollection(request({ name: "Tasks", template: "tasks", categoryId: null }));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.slug).toBe("tasks-2");
      expect(body.schema.map((property: { id: string }) => property.id)).toEqual(["title", "status", "due", "priority", "assignee", "notes"]);
      expect(body.views[0]).toMatchObject({ slug: "table", kind: "table", isDefault: true });
      expect(body.views[0].config.sorts).toEqual([{ property: "due", direction: "asc" }]);
      expect(logAudit).toHaveBeenCalledWith("collection.create", expect.objectContaining({ type: "collection", id: "col-2" }), expect.anything());
    });

    it("rejects an unknown space", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
      const res = await createCollection(request({ name: "x", categoryId: "cat-404" }));
      expect(res.status).toBe(400);
      expect((await res.json()).fields.categoryId).toBe("unknown space");
    });
  });

  describe("items", () => {
    it("rejects relation ids outside the target collection", async () => {
      vi.mocked(prisma.collection.findUnique).mockResolvedValue({ ...storedCollection, schema: [
        ...storedCollection.schema, { id: "course", name: "course", type: "relation", collectionId: "courses" },
      ] } as never);
      vi.mocked(prisma.collectionItem.findMany).mockResolvedValue([]);
      const res = await createItem(request({ title: "task", properties: { course: ["wrong-collection-item"] } }), params({ id: "col-1" }));
      expect(res.status).toBe(400);
      expect((await res.json()).fields.course).toMatch(/target collection/);
      expect(prisma.collectionItem.create).not.toHaveBeenCalled();
    });

    it("rejects a malformed properties patch instead of silently ignoring it", async () => {
      vi.mocked(prisma.collectionItem.findFirst).mockResolvedValue({ id: "i1", collectionId: "col-1", properties: {} } as never);
      const res = await patchItem(request({ properties: ["bad"] }), params({ id: "col-1", itemId: "i1" }));
      expect(res.status).toBe(400);
      expect(prisma.collectionItem.update).not.toHaveBeenCalled();
    });

    it("validates relations using the patch transaction instead of acquiring a second connection", async () => {
      vi.mocked(prisma.collection.findUnique).mockResolvedValue({ ...storedCollection, schema: [
        ...storedCollection.schema, { id: "course", name: "course", type: "relation", collectionId: "courses" },
      ] } as never);
      const row = { id: "i1", collectionId: "col-1", title: "task", articleId: null, properties: { course: ["course-1"], estimate: 1 }, sortOrder: 0, createdAt: now, updatedAt: now };
      const tx = { $queryRaw: vi.fn(async () => []), collectionItem: {
        findFirst: vi.fn(async () => row),
        findMany: vi.fn(async () => [{ id: "course-1" }]),
        update: vi.fn(async ({ data }: { data: object }) => ({ ...row, ...data })),
      } };
      vi.mocked(prisma.$transaction).mockImplementation((async (run: (client: unknown) => Promise<unknown>) => run(tx)) as never);
      const res = await patchItem(request({ properties: { estimate: 5 } }), params({ id: "col-1", itemId: "i1" }));
      expect(res.status).toBe(200);
      expect((await res.json()).properties).toMatchObject({ course: ["course-1"], estimate: 5 });
      expect(tx.collectionItem.findMany).toHaveBeenCalled();
      expect(prisma.collectionItem.findMany).not.toHaveBeenCalled();
    });
    it("validates properties against the schema and reports every bad field", async () => {
      const res = await createItem(
        request({ title: "write", properties: { status: "nope", estimate: "3", done: "yes" } }),
        params({ id: "col-1" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid properties");
      expect(body.fields).toEqual({ status: "unknown option", estimate: "must be a number", done: "must be true or false" });
      expect(prisma.collectionItem.create).not.toHaveBeenCalled();
    });

    it("requires a title", async () => {
      const res = await createItem(request({ properties: {} }), params({ id: "col-1" }));
      expect(res.status).toBe(400);
      expect((await res.json()).fields.title).toBe("required");
    });

    it("creates an item with cleaned properties, dropping unknown keys", async () => {
      vi.mocked(prisma.collectionItem.findFirst).mockResolvedValue({ sortOrder: 4 } as never);
      vi.mocked(prisma.collectionItem.create).mockImplementation((async (args: { data: Record<string, unknown> }) => ({
        id: "item-1",
        collectionId: "col-1",
        articleId: null,
        article: null,
        title: args.data.title,
        properties: args.data.properties,
        sortOrder: args.data.sortOrder,
        createdAt: now,
        updatedAt: now,
      })) as never);

      const res = await createItem(
        request({ title: "  write spec ", properties: { status: "todo", estimate: 3, ghost: true, title: "x" } }),
        params({ id: "tasks" }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.title).toBe("write spec");
      expect(body.properties).toEqual({ status: "todo", estimate: 3, done: false });
      expect(body.sortOrder).toBe(5);
      expect(prisma.collectionItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ properties: { status: "todo", estimate: 3, done: false } }) }),
      );
    });

    it("404s for an unknown collection", async () => {
      const res = await createItem(request({ title: "x" }), params({ id: "missing" }));
      expect(res.status).toBe(404);
    });

    it("merges a partial property patch with the stored record", async () => {
      vi.mocked(prisma.collectionItem.findFirst).mockResolvedValue({
        id: "item-1",
        collectionId: "col-1",
        properties: { status: "todo", estimate: 3, done: false },
      } as never);
      vi.mocked(prisma.collectionItem.update).mockImplementation((async (args: { data: Record<string, unknown> }) => ({
        id: "item-1",
        collectionId: "col-1",
        articleId: null,
        article: null,
        title: "write spec",
        properties: args.data.properties,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })) as never);

      const res = await patchItem(request({ properties: { done: true } }), params({ id: "col-1", itemId: "item-1" }));
      expect(res.status).toBe(200);
      expect((await res.json()).properties).toEqual({ status: "todo", estimate: 3, done: true });
      expect(vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.collectionItem.findFirst).mock.invocationCallOrder[0]);
    });

    it("lists a page of items publicly", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      vi.mocked(getSession).mockResolvedValue(null);
      vi.mocked(prisma.collectionItem.findMany).mockResolvedValue([
        { id: "i1", collectionId: "col-1", articleId: null, article: null, title: "a", properties: { estimate: 1 }, sortOrder: 0, createdAt: now, updatedAt: now },
      ] as never);
      vi.mocked(prisma.collectionItem.count).mockResolvedValue(250);

      const res = await listItems(request(null, "http://localhost/api/collections/col-1/items?page=2"), params({ id: "col-1" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ total: 250, page: 2, pageSize: 100, hasMore: true });
      expect(body.items[0].properties).toEqual({ status: null, estimate: 1, done: false });
      expect(prisma.collectionItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 100, take: 100 }));
    });
  });
});
