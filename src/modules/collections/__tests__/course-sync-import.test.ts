import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PropertySchema, PropertyValues } from "../properties";

vi.mock("@/lib/prisma", () => ({ default: { $transaction: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
import prisma from "@/lib/prisma";
import { importCourseSync } from "../course-sync-import";
import { getTemplate } from "../templates";

type Row = { id: string; collectionId: string; title: string; properties: PropertyValues };
const source = { task_list: "Example term", generated_at: "2026-09-07T12:00:00Z", tasks: [
  { id: "source:1", title: "[CS 101] Read syllabus", due: "2026-09-08", status: "needsAction" },
  { id: "source:2", title: "[CS 101] Join forum", status: "completed" },
] };
let rows: Map<string, Row>;
let schema: PropertySchema;

beforeEach(() => {
  rows = new Map();
  schema = getTemplate("coursework")!.schema.map((property) => property.id === "course" ? { id: "course", name: "course", type: "relation", collectionId: "courses" } : property);
  vi.mocked(prisma.$transaction).mockImplementation((async (run: (tx: unknown) => Promise<unknown>) => run({
    $queryRaw: vi.fn(async () => []),
    collection: { findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, schema: where.id === "work" ? schema : getTemplate("courses")!.schema }) },
    collectionItem: {
      findMany: async ({ where }: { where: { collectionId: string; id: { in: string[] } } }) => [...rows.values()].filter((row) => row.collectionId === where.collectionId && where.id.in.includes(row.id)),
      create: async ({ data }: { data: Row }) => { if (rows.has(data.id)) throw new Error("duplicate identity"); rows.set(data.id, structuredClone(data)); return data; },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => { const row = { ...rows.get(where.id)!, ...data }; rows.set(row.id, structuredClone(row)); return row; },
    },
  })) as never);
});

describe("course-sync import", () => {
  it("previews without writes, binds courses, and makes a repeat import a no-op", async () => {
    expect(await importCourseSync("work", source)).toMatchObject({ dryRun: true, created: 2, coursesCreated: 1 });
    expect(rows.size).toBe(0);
    expect(await importCourseSync("work", source, false)).toMatchObject({ created: 2, coursesCreated: 1 });
    expect(rows.size).toBe(3);
    const course = [...rows.values()].find((row) => row.collectionId === "courses")!;
    const tasks = [...rows.values()].filter((row) => row.collectionId === "work");
    expect(tasks.every((row) => JSON.stringify(row.properties.course) === JSON.stringify([course.id]))).toBe(true);
    expect(await importCourseSync("work", source, false)).toMatchObject({ created: 0, updated: 0, unchanged: 2, coursesCreated: 0 });
  });

  it("preserves manual completion and notes, absent deadlines/rows, and newer snapshots", async () => {
    await importCourseSync("work", source, false);
    const task = [...rows.values()].find((row) => row.properties.source_id === "source:1")!;
    task.properties.status = "done";
    task.properties.notes = "keep my notes";
    const changed = { ...source, generated_at: "2026-09-08T12:00:00Z", tasks: [{ id: "source:1", title: "[CS 101] Revised syllabus", status: "needsAction" }] };
    expect(await importCourseSync("work", changed, false)).toMatchObject({ updated: 1 });
    expect(rows.get(task.id)?.properties).toMatchObject({ status: "done", notes: "keep my notes", due: "2026-09-08" });
    expect(rows.size).toBe(3);
    expect(await importCourseSync("work", source, false)).toMatchObject({ skipped: 1, unchanged: 1 });
    expect(rows.get(task.id)?.title).toBe("[CS 101] Revised syllabus");
  });

  it("scopes identities by collection and source list and validates the whole batch before writes", async () => {
    await importCourseSync("work", source, false);
    expect(await importCourseSync("work", { ...source, task_list: "Another term" }, false)).toMatchObject({ created: 2, coursesCreated: 1 });
    const size = rows.size;
    await expect(importCourseSync("work", { ...source, tasks: [...source.tasks, { id: "bad", title: "Bad", due: "2026-02-30" }] }, false)).rejects.toThrow();
    expect(rows.size).toBe(size);
    schema = schema.filter((property) => property.id !== "source_id");
    await expect(importCourseSync("work", source, false)).rejects.toThrow(/properties intact/);
    expect(rows.size).toBe(size);
  });
});
