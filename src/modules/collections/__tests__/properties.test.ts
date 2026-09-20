import { describe, expect, it } from "vitest";
import {
  applyView,
  defaultViewFor,
  emptyProperties,
  propertyIdFromName,
  propertyValue,
  validateProperties,
  validateSchema,
  validateViewConfig,
  type PropertySchema,
  type ViewItem,
} from "../properties";
import { COLLECTION_TEMPLATES, getTemplate } from "../templates";

const schema: PropertySchema = [
  { id: "title", name: "task", type: "title" },
  {
    id: "status",
    name: "status",
    type: "select",
    options: [
      { id: "todo", label: "todo", tone: "default" },
      { id: "doing", label: "in progress", tone: "info" },
      { id: "done", label: "done", tone: "success" },
    ],
  },
  { id: "tags", name: "tags", type: "multi_select", options: [{ id: "a", label: "a", tone: "default" }, { id: "b", label: "b", tone: "warning" }] },
  { id: "due", name: "due", type: "date" },
  { id: "done", name: "done", type: "checkbox" },
  { id: "estimate", name: "estimate", type: "number" },
  { id: "link", name: "link", type: "url" },
  { id: "owner", name: "owner", type: "person" },
  { id: "page", name: "page", type: "page" },
  { id: "related", name: "related", type: "relation", collectionId: "other" },
  { id: "notes", name: "notes", type: "text" },
  { id: "created", name: "created", type: "created_time" },
  { id: "updated", name: "updated", type: "updated_time" },
];

function item(id: string, title: string, properties: Record<string, unknown>, createdAt = "2026-01-01T00:00:00.000Z"): ViewItem {
  return { id, title, properties, createdAt, updatedAt: createdAt };
}

describe("validateSchema", () => {
  it("accepts a well-formed schema and normalizes option tones", () => {
    const result = validateSchema([
      { id: "title", name: "name", type: "title" },
      { id: "state", name: "state", type: "select", options: [{ id: "x", label: "x" }] },
    ]);
    expect(result.ok).toBe(true);
    expect(result.value[1]).toEqual({ id: "state", name: "state", type: "select", options: [{ id: "x", label: "x", tone: "default" }] });
  });

  it("requires exactly one title", () => {
    expect(validateSchema([{ id: "a", name: "a", type: "text" }]).errors).toContain("schema needs exactly one title property");
    const two = validateSchema([
      { id: "a", name: "a", type: "title" },
      { id: "b", name: "b", type: "title" },
    ]);
    expect(two.ok).toBe(false);
    expect(two.errors).toContain("schema may only have one title property");
  });

  it("rejects duplicate ids, unknown types, bad tones, and relations without a target", () => {
    const result = validateSchema([
      { id: "title", name: "t", type: "title" },
      { id: "title", name: "dup", type: "text" },
      { id: "weird", name: "w", type: "rating" },
      { id: "s", name: "s", type: "select", options: [{ id: "o", label: "o", tone: "purple" }] },
      { id: "r", name: "r", type: "relation" },
      { id: "bad id!", name: "b", type: "text" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/duplicate id "title"/);
    expect(result.errors.join("\n")).toMatch(/unknown type "rating"/);
    expect(result.errors.join("\n")).toMatch(/unknown tone/);
    expect(result.errors.join("\n")).toMatch(/relation needs a target/);
    expect(result.errors.join("\n")).toMatch(/may only use letters/);
  });

  it("rejects non-array input", () => {
    expect(validateSchema({ id: "title" }).ok).toBe(false);
    expect(validateSchema(null).value).toEqual([]);
  });
});

describe("validateProperties", () => {
  it("drops unknown keys and computed properties", () => {
    const result = validateProperties(schema, { notes: "hi", ghost: 1, title: "nope", created: "x" });
    expect(result.ok).toBe(true);
    expect(result.value.notes).toBe("hi");
    expect(result.value).not.toHaveProperty("ghost");
    expect(result.value).not.toHaveProperty("title");
    expect(result.value).not.toHaveProperty("created");
  });

  it("fills empties with type-appropriate blanks", () => {
    const value = emptyProperties(schema);
    expect(value).toEqual({
      status: null,
      tags: [],
      due: null,
      done: false,
      estimate: null,
      link: null,
      owner: null,
      page: null,
      related: [],
      notes: null,
    });
  });

  it("rejects wrong types per property", () => {
    const result = validateProperties(schema, {
      notes: 12,
      estimate: "3",
      done: "yes",
      due: "yesterday",
      link: "ftp://files",
      status: "unknown",
      tags: ["a", "zzz"],
      owner: 42,
      related: "x",
    });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(["done", "due", "estimate", "link", "notes", "owner", "related", "status", "tags"]);
    expect(result.errors.tags).toMatch(/unknown option "zzz"/);
  });

  it("accepts correct values and de-duplicates lists", () => {
    const result = validateProperties(schema, {
      notes: "n",
      estimate: 2.5,
      done: true,
      due: "2026-03-04",
      link: " https://example.com/x ",
      status: "done",
      tags: ["a", "b", "a"],
      owner: "user-1",
      page: "article-1",
      related: ["i1", "i1", "i2"],
    });
    expect(result.ok).toBe(true);
    expect(result.value.link).toBe("https://example.com/x");
    expect(result.value.tags).toEqual(["a", "b"]);
    expect(result.value.related).toEqual(["i1", "i2"]);
  });

  it("treats null and empty string as clearing", () => {
    const result = validateProperties(schema, { estimate: null, notes: "", done: null, tags: null });
    expect(result.ok).toBe(true);
    expect(result.value.estimate).toBeNull();
    expect(result.value.notes).toBeNull();
    expect(result.value.done).toBe(false);
    expect(result.value.tags).toEqual([]);
  });

  it("rejects a non-object properties payload", () => {
    expect(validateProperties(schema, "nope").ok).toBe(false);
    expect(validateProperties(schema, [1]).ok).toBe(false);
  });

  it("rejects impossible calendar dates and normalizes relation ids", () => {
    expect(validateProperties(schema, { due: "2026-02-30" }).ok).toBe(false);
    expect(validateProperties(schema, { due: "2024-02-29", related: [" i1 ", "i1"] }).value.related).toEqual(["i1"]);
  });
});

describe("views", () => {
  const items = [
    item("1", "write spec", { status: "done", estimate: 3, tags: ["a"], done: true }, "2026-01-03T00:00:00.000Z"),
    item("2", "Build table", { status: "todo", estimate: 8, tags: ["b"], done: false }, "2026-01-01T00:00:00.000Z"),
    item("3", "ship", { status: "doing", estimate: null, tags: [], done: false }, "2026-01-02T00:00:00.000Z"),
    item("4", "another todo", { status: "todo", estimate: 1, done: false }, "2026-01-04T00:00:00.000Z"),
  ];

  it("defaultViewFor shows every property in schema order", () => {
    expect(defaultViewFor(schema)).toEqual({ filters: [], sorts: [], visible: schema.map((property) => property.id) });
  });

  it("validateViewConfig drops unknown properties and bad operators", () => {
    const config = validateViewConfig(schema, {
      filters: [
        { property: "status", op: "eq", value: "todo" },
        { property: "nope", op: "eq", value: 1 },
        { property: "status", op: "between", value: 1 },
      ],
      sorts: [{ property: "estimate", direction: "desc" }, { property: "ghost" }],
      visible: ["title", "ghost", "status"],
      groupBy: "ghost",
    });
    expect(config).toEqual({
      filters: [{ property: "status", op: "eq", value: "todo" }],
      sorts: [{ property: "estimate", direction: "desc" }],
      visible: ["title", "status"],
    });
    expect(validateViewConfig(schema, null)).toEqual(defaultViewFor(schema));
  });

  it("propertyValue resolves computed properties from the row", () => {
    expect(propertyValue(items[0], schema[0])).toBe("write spec");
    expect(propertyValue(items[0], schema.find((property) => property.id === "created")!)).toBe("2026-01-03T00:00:00.000Z");
    expect(propertyValue(items[0], schema.find((property) => property.id === "status")!)).toBe("done");
    expect(propertyValue(items[3], schema.find((property) => property.id === "tags")!)).toBeNull();
  });

  it("filters with eq, contains, empty, and comparisons", () => {
    const eq = applyView(items, { filters: [{ property: "status", op: "eq", value: "todo" }], sorts: [], visible: [] }, schema);
    expect(eq.items.map((entry) => entry.id)).toEqual(["2", "4"]);

    const contains = applyView(items, { filters: [{ property: "title", op: "contains", value: "TODO" }], sorts: [], visible: [] }, schema);
    expect(contains.items.map((entry) => entry.id)).toEqual(["4"]);

    const empty = applyView(items, { filters: [{ property: "estimate", op: "empty" }], sorts: [], visible: [] }, schema);
    expect(empty.items.map((entry) => entry.id)).toEqual(["3"]);

    const gt = applyView(items, { filters: [{ property: "estimate", op: "gt", value: 2 }], sorts: [], visible: [] }, schema);
    expect(gt.items.map((entry) => entry.id)).toEqual(["1", "2"]);

    const inList = applyView(items, { filters: [{ property: "tags", op: "eq", value: "a" }], sorts: [], visible: [] }, schema);
    expect(inList.items.map((entry) => entry.id)).toEqual(["1"]);

    const checked = applyView(items, { filters: [{ property: "done", op: "not_empty" }], sorts: [], visible: [] }, schema);
    expect(checked.items.map((entry) => entry.id)).toEqual(["1"]);
  });

  it("sorts numbers, titles, dates, and select options in option order with empties last", () => {
    const byEstimate = applyView(items, { filters: [], sorts: [{ property: "estimate", direction: "desc" }], visible: [] }, schema);
    expect(byEstimate.items.map((entry) => entry.id)).toEqual(["2", "1", "4", "3"]);

    const byTitle = applyView(items, { filters: [], sorts: [{ property: "title", direction: "asc" }], visible: [] }, schema);
    expect(byTitle.items.map((entry) => entry.title)).toEqual(["another todo", "Build table", "ship", "write spec"]);

    const byStatus = applyView(items, { filters: [], sorts: [{ property: "status", direction: "asc" }], visible: [] }, schema);
    expect(byStatus.items.map((entry) => entry.id)).toEqual(["2", "4", "3", "1"]);

    const byCreated = applyView(items, { filters: [], sorts: [{ property: "created", direction: "asc" }], visible: [] }, schema);
    expect(byCreated.items.map((entry) => entry.id)).toEqual(["2", "3", "1", "4"]);
  });

  it("groups by a select in option order with a trailing empty bucket", () => {
    const withBlank = [...items, item("5", "unsorted", {})];
    const grouped = applyView(withBlank, { filters: [], sorts: [], visible: ["title"], groupBy: "status" }, schema);
    expect(grouped.groups?.map((group) => [group.label, group.items.map((entry) => entry.id)])).toEqual([
      ["todo", ["2", "4"]],
      ["in progress", ["3"]],
      ["done", ["1"]],
      ["no value", ["5"]],
    ]);
  });

  it("returns the visible columns as definitions, skipping unknown ids", () => {
    const view = applyView(items, { filters: [], sorts: [], visible: ["status", "ghost", "title"] }, schema);
    expect(view.columns.map((column) => column.id)).toEqual(["status", "title"]);
    expect(view.groups).toBeNull();
  });
});

describe("helpers", () => {
  it("derives stable ids from names and avoids collisions", () => {
    expect(propertyIdFromName("Due date")).toBe("due_date");
    expect(propertyIdFromName("Crème brûlée!")).toBe("creme_brulee");
    expect(propertyIdFromName("status", ["status", "status_2"])).toBe("status_3");
    expect(propertyIdFromName("")).toBe("property");
  });

  it("ships templates whose schemas validate", () => {
    for (const template of COLLECTION_TEMPLATES) {
      expect(validateSchema(template.schema).ok, template.id).toBe(true);
      expect(template.views[0].config.visible).toContain("title");
      expect(template.views[0].config.visible.every((id) => template.schema.some((property) => property.id === id))).toBe(true);
    }
    expect(getTemplate("tasks")?.schema.some((property) => property.type === "person")).toBe(true);
    expect(getTemplate("nope")).toBeUndefined();
  });
});
