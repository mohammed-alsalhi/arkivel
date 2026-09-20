/**
 * Server-side data access for collections. Every mutation validates against the
 * collection's schema and writes an audit entry; slugs are generated and de-duplicated here.
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateSlug } from "@/lib/utils";
import type { CollectionDTO, CollectionSummary, ItemDTO, ItemPage, ViewDTO } from "./model";
import {
  defaultViewFor,
  readSchema,
  validateProperties,
  validateSchema,
  validateViewConfig,
  VIEW_KINDS,
  type PropertySchema,
  type PropertyValues,
  type ViewConfig,
  type ViewKind,
} from "./properties";

export const ITEM_PAGE_SIZE = 100;

/** A validation failure the API turns into a 400 with per-field errors. */
export class CollectionValidationError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "CollectionValidationError";
    this.fields = fields;
  }
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = generateSlug(base) || "untitled";
  if (!(await taken(root))) return root;
  let index = 2;
  while (await taken(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

const collectionSlugTaken = async (slug: string, exceptId?: string) =>
  !!(await prisma.collection.findFirst({ where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true } }));

const viewSlugTaken = (collectionId: string, exceptId?: string) => async (slug: string) =>
  !!(await prisma.collectionView.findFirst({
    where: { collectionId, slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  }));

// ---------------------------------------------------------------------------
// serializers
// ---------------------------------------------------------------------------

type ViewRow = { id: string; slug: string; name: string; kind: string; config: unknown; isDefault: boolean; sortOrder: number };

function toViewDTO(view: ViewRow, schema: PropertySchema): ViewDTO {
  const kind = (VIEW_KINDS as readonly string[]).includes(view.kind) ? (view.kind as ViewKind) : "table";
  return {
    id: view.id,
    slug: view.slug,
    name: view.name,
    kind,
    config: validateViewConfig(schema, view.config),
    isDefault: view.isDefault,
    sortOrder: view.sortOrder,
  };
}

type ItemRow = {
  id: string;
  collectionId: string;
  articleId: string | null;
  article?: { id: string; slug: string; title: string } | null;
  title: string;
  properties: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toItemDTO(item: ItemRow, schema: PropertySchema): ItemDTO {
  return {
    id: item.id,
    collectionId: item.collectionId,
    articleId: item.articleId,
    article: item.article ?? null,
    title: item.title,
    properties: validateProperties(schema, item.properties).value,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

const collectionInclude = {
  category: { select: { id: true, name: true, slug: true } },
  views: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
} satisfies Prisma.CollectionInclude;

type CollectionRow = Prisma.CollectionGetPayload<{ include: typeof collectionInclude }>;

function toCollectionDTO(row: CollectionRow): CollectionDTO {
  const schema = readSchema(row.schema);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    description: row.description,
    category: row.category,
    schema,
    views: row.views.map((view) => toViewDTO(view, schema)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// reads
// ---------------------------------------------------------------------------

export async function listCollections(): Promise<CollectionSummary[]> {
  const rows = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    description: row.description,
    category: row.category,
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getCollectionBySlug(slug: string): Promise<CollectionDTO | null> {
  const row = await prisma.collection.findUnique({ where: { slug }, include: collectionInclude });
  return row ? toCollectionDTO(row) : null;
}

export async function getCollectionById(id: string): Promise<CollectionDTO | null> {
  const row = await prisma.collection.findUnique({ where: { id }, include: collectionInclude });
  return row ? toCollectionDTO(row) : null;
}

/** API routes accept either the id or the slug in the `[id]` segment. */
export async function resolveCollection(idOrSlug: string): Promise<CollectionDTO | null> {
  return (await getCollectionById(idOrSlug)) ?? (await getCollectionBySlug(idOrSlug));
}

export type ItemQuery = { page?: number; q?: string };

export async function listItems(collection: CollectionDTO, query: ItemQuery = {}): Promise<ItemPage> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const q = query.q?.trim();
  const where: Prisma.CollectionItemWhereInput = {
    collectionId: collection.id,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.collectionItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * ITEM_PAGE_SIZE,
      take: ITEM_PAGE_SIZE,
      include: { article: { select: { id: true, slug: true, title: true } } },
    }),
    prisma.collectionItem.count({ where }),
  ]);
  return {
    items: rows.map((row) => toItemDTO(row, collection.schema)),
    total,
    page,
    pageSize: ITEM_PAGE_SIZE,
    hasMore: page * ITEM_PAGE_SIZE < total,
  };
}

export async function getItem(collection: CollectionDTO, itemId: string): Promise<ItemDTO | null> {
  const row = await prisma.collectionItem.findFirst({
    where: { id: itemId, collectionId: collection.id },
    include: { article: { select: { id: true, slug: true, title: true } } },
  });
  return row ? toItemDTO(row, collection.schema) : null;
}

/** Users offered by the `person` editor. */
export async function listPeople() {
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, displayName: true },
  });
  return users.map((user) => ({ id: user.id, label: user.displayName || user.username }));
}

// ---------------------------------------------------------------------------
// collections
// ---------------------------------------------------------------------------

export type CreateCollectionInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  categoryId?: string | null;
  schema: unknown;
  views?: { name: string; slug?: string; kind?: string; config?: unknown; isDefault?: boolean }[];
};

function cleanName(value: unknown, field = "name"): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new CollectionValidationError(`${field} is required`, { [field]: "required" });
  if (name.length > 200) throw new CollectionValidationError(`${field} is too long`, { [field]: "at most 200 characters" });
  return name;
}

async function cleanSchema(input: unknown): Promise<PropertySchema> {
  const result = validateSchema(input);
  if (!result.ok) throw new CollectionValidationError("invalid schema", { schema: result.errors.join("; ") });
  for (const property of result.value) {
    if (property.type !== "relation") continue;
    const target = await prisma.collection.findUnique({ where: { id: property.collectionId }, select: { id: true } });
    if (!target) throw new CollectionValidationError("invalid relation", { [property.id]: "target collection not found" });
  }
  return result.value;
}

async function cleanCategoryId(value: unknown): Promise<string | null> {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CollectionValidationError("invalid space", { categoryId: "must be an id" });
  const category = await prisma.category.findUnique({ where: { id: value }, select: { id: true } });
  if (!category) throw new CollectionValidationError("space not found", { categoryId: "unknown space" });
  return category.id;
}

function cleanKind(value: unknown): ViewKind {
  if (value === undefined) return "table";
  if (typeof value !== "string" || !(VIEW_KINDS as readonly string[]).includes(value)) {
    throw new CollectionValidationError("invalid view kind", { kind: "must be table, board, list, or calendar" });
  }
  return value as ViewKind;
}

export async function createCollection(input: CreateCollectionInput): Promise<CollectionDTO> {
  const name = cleanName(input.name);
  const schema = await cleanSchema(input.schema);
  const categoryId = await cleanCategoryId(input.categoryId);
  const description = typeof input.description === "string" ? input.description.trim() || null : null;
  const icon = typeof input.icon === "string" ? input.icon.trim() || null : null;
  const slug = await uniqueSlug(name, (candidate) => collectionSlugTaken(candidate));

  const views = (input.views?.length ? input.views : [{ name: "table", slug: "table", isDefault: true }]).map((view, index) => {
    const viewName = cleanName(view.name, "view name");
    return {
      name: viewName,
      slug: generateSlug(view.slug ?? viewName) || `view-${index + 1}`,
      kind: cleanKind(view.kind),
      config: validateViewConfig(schema, view.config ?? defaultViewFor(schema)),
      isDefault: Boolean(view.isDefault),
      sortOrder: index,
    };
  });
  if (!views.some((view) => view.isDefault)) views[0].isDefault = true;
  const slugs = new Set<string>();
  for (const view of views) {
    let candidate = view.slug;
    let index = 2;
    while (slugs.has(candidate)) candidate = `${view.slug}-${index++}`;
    slugs.add(candidate);
    view.slug = candidate;
  }

  const row = await prisma.collection.create({
    data: {
      name,
      slug,
      description,
      icon,
      categoryId,
      schema: json(schema),
      views: { create: views.map((view) => ({ ...view, config: json(view.config) })) },
    },
    include: collectionInclude,
  });

  await logAudit("collection.create", { type: "collection", id: row.id, label: row.name }, { slug: row.slug, template: true });
  return toCollectionDTO(row);
}

export type UpdateCollectionInput = Partial<{
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  categoryId: string | null;
  schema: unknown;
}>;

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<CollectionDTO | null> {
  const current = await prisma.collection.findUnique({ where: { id }, select: { id: true, slug: true, name: true } });
  if (!current) return null;

  const data: Prisma.CollectionUpdateInput = {};
  if (input.name !== undefined) data.name = cleanName(input.name);
  if (input.slug !== undefined) {
    const requested = generateSlug(String(input.slug));
    if (!requested) throw new CollectionValidationError("slug is required", { slug: "required" });
    if (requested !== current.slug && (await collectionSlugTaken(requested, id))) {
      throw new CollectionValidationError("that slug is taken", { slug: "already in use" });
    }
    data.slug = requested;
  }
  if (input.description !== undefined) data.description = typeof input.description === "string" ? input.description.trim() || null : null;
  if (input.icon !== undefined) data.icon = typeof input.icon === "string" ? input.icon.trim() || null : null;
  if (input.categoryId !== undefined) {
    const categoryId = await cleanCategoryId(input.categoryId);
    data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }
  if (input.schema !== undefined) data.schema = json(await cleanSchema(input.schema));

  const row = await prisma.collection.update({ where: { id }, data, include: collectionInclude });
  await logAudit("collection.update", { type: "collection", id: row.id, label: row.name }, { fields: Object.keys(data) });
  return toCollectionDTO(row);
}

export async function deleteCollection(id: string): Promise<boolean> {
  const current = await prisma.collection.findUnique({ where: { id }, select: { id: true, name: true, slug: true } });
  if (!current) return false;
  await prisma.collection.delete({ where: { id } });
  await logAudit("collection.delete", { type: "collection", id: current.id, label: current.name }, { slug: current.slug });
  return true;
}

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------

export type ItemInput = { title?: unknown; properties?: unknown; articleId?: unknown; sortOrder?: unknown };

function cleanTitle(value: unknown, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) throw new CollectionValidationError("title is required", { title: "required" });
    return undefined;
  }
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new CollectionValidationError("title is required", { title: "required" });
  if (title.length > 500) throw new CollectionValidationError("title is too long", { title: "at most 500 characters" });
  return title;
}

async function cleanArticleId(value: unknown, exceptItemId?: string, db: Prisma.TransactionClient = prisma): Promise<string | null | undefined> {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new CollectionValidationError("invalid page", { articleId: "must be an id" });
  const article = await db.article.findUnique({ where: { id: value }, select: { id: true } });
  if (!article) throw new CollectionValidationError("page not found", { articleId: "unknown page" });
  const linked = await db.collectionItem.findFirst({
    where: { articleId: value, ...(exceptItemId ? { NOT: { id: exceptItemId } } : {}) },
    select: { id: true },
  });
  if (linked) throw new CollectionValidationError("page already linked", { articleId: "already linked to another item" });
  return article.id;
}

async function cleanProperties(schema: PropertySchema, input: unknown, db: Prisma.TransactionClient = prisma): Promise<PropertyValues> {
  const result = validateProperties(schema, input);
  if (!result.ok) throw new CollectionValidationError("invalid properties", result.errors);
  for (const property of schema) {
    if (property.type !== "relation") continue;
    const ids = result.value[property.id] as string[];
    if (!ids.length) continue;
    const rows = await db.collectionItem.findMany({ where: { id: { in: ids }, collectionId: property.collectionId }, select: { id: true } });
    if (rows.length !== ids.length) throw new CollectionValidationError("invalid relation", { [property.id]: "items must belong to the target collection" });
  }
  return result.value;
}

export async function createItem(collection: CollectionDTO, input: ItemInput): Promise<ItemDTO> {
  const title = cleanTitle(input.title, true)!;
  const properties = await cleanProperties(collection.schema, input.properties ?? {});
  const articleId = (await cleanArticleId(input.articleId)) ?? null;
  const last = await prisma.collectionItem.findFirst({
    where: { collectionId: collection.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder) ? input.sortOrder : (last?.sortOrder ?? -1) + 1;

  const row = await prisma.collectionItem.create({
    data: { collectionId: collection.id, title, properties: json(properties), articleId, sortOrder },
    include: { article: { select: { id: true, slug: true, title: true } } },
  });
  await logAudit("collection.item.create", { type: "collection_item", id: row.id, label: row.title }, { collectionId: collection.id });
  return toItemDTO(row, collection.schema);
}

/** Patches an item: `properties` is merged with the stored record before validation. */
export async function updateItem(collection: CollectionDTO, itemId: string, input: ItemInput): Promise<ItemDTO | null> {
  return prisma.$transaction(async (tx) => {
    // Read after acquiring the row lock so manual patches and source imports preserve each other's fields.
    await tx.$queryRaw`SELECT id FROM "CollectionItem" WHERE id = ${itemId} AND "collectionId" = ${collection.id} FOR UPDATE`;
    const current = await tx.collectionItem.findFirst({ where: { id: itemId, collectionId: collection.id } });
    if (!current) return null;

    const data: Prisma.CollectionItemUncheckedUpdateInput = {};
    const title = cleanTitle(input.title, false);
    if (title !== undefined) data.title = title;
    if (input.properties !== undefined) {
      if (typeof input.properties !== "object" || input.properties === null || Array.isArray(input.properties)) {
        throw new CollectionValidationError("invalid properties", { properties: "must be an object" });
      }
      const stored = validateProperties(collection.schema, current.properties).value;
      data.properties = json(await cleanProperties(collection.schema, { ...stored, ...input.properties }, tx));
    }
    const articleId = await cleanArticleId(input.articleId, itemId, tx);
    if (articleId !== undefined) data.articleId = articleId;
    if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) data.sortOrder = input.sortOrder;

    const row = await tx.collectionItem.update({
      where: { id: itemId },
      data,
      include: { article: { select: { id: true, slug: true, title: true } } },
    });
    return toItemDTO(row, collection.schema);
  });
}

export async function deleteItem(collection: CollectionDTO, itemId: string): Promise<boolean> {
  const current = await prisma.collectionItem.findFirst({ where: { id: itemId, collectionId: collection.id }, select: { id: true, title: true } });
  if (!current) return false;
  await prisma.collectionItem.delete({ where: { id: itemId } });
  await logAudit("collection.item.delete", { type: "collection_item", id: current.id, label: current.title }, { collectionId: collection.id });
  return true;
}

// ---------------------------------------------------------------------------
// views
// ---------------------------------------------------------------------------

export type ViewInput = { name?: unknown; slug?: unknown; kind?: unknown; config?: unknown; isDefault?: unknown; sortOrder?: unknown };

export async function createView(collection: CollectionDTO, input: ViewInput): Promise<ViewDTO> {
  const name = cleanName(input.name, "name");
  const kind = cleanKind(input.kind);
  const config = validateViewConfig(collection.schema, input.config ?? defaultViewFor(collection.schema));
  const slug = await uniqueSlug(typeof input.slug === "string" && input.slug ? input.slug : name, viewSlugTaken(collection.id));
  const isDefault = Boolean(input.isDefault) || collection.views.length === 0;
  const sortOrder =
    typeof input.sortOrder === "number" ? input.sortOrder : Math.max(-1, ...collection.views.map((view) => view.sortOrder)) + 1;

  const row = await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.collectionView.updateMany({ where: { collectionId: collection.id }, data: { isDefault: false } });
    return tx.collectionView.create({
      data: { collectionId: collection.id, name, slug, kind, config: json(config), isDefault, sortOrder },
    });
  });
  await logAudit("collection.view.create", { type: "collection_view", id: row.id, label: row.name }, { collectionId: collection.id });
  return toViewDTO(row, collection.schema);
}

export async function updateView(collection: CollectionDTO, viewId: string, input: ViewInput): Promise<ViewDTO | null> {
  const current = await prisma.collectionView.findFirst({ where: { id: viewId, collectionId: collection.id } });
  if (!current) return null;

  const data: Prisma.CollectionViewUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = cleanName(input.name, "name");
  if (input.slug !== undefined) {
    const requested = generateSlug(String(input.slug));
    if (!requested) throw new CollectionValidationError("slug is required", { slug: "required" });
    if (requested !== current.slug && (await viewSlugTaken(collection.id, viewId)(requested))) {
      throw new CollectionValidationError("that slug is taken", { slug: "already in use" });
    }
    data.slug = requested;
  }
  if (input.kind !== undefined) data.kind = cleanKind(input.kind);
  if (input.config !== undefined) data.config = json(validateViewConfig(collection.schema, input.config));
  if (typeof input.sortOrder === "number") data.sortOrder = input.sortOrder;
  const makeDefault = input.isDefault === true && !current.isDefault;
  if (makeDefault) data.isDefault = true;

  const row = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.collectionView.updateMany({ where: { collectionId: collection.id }, data: { isDefault: false } });
    return tx.collectionView.update({ where: { id: viewId }, data });
  });
  await logAudit("collection.view.update", { type: "collection_view", id: row.id, label: row.name }, { fields: Object.keys(data) });
  return toViewDTO(row, collection.schema);
}

export async function deleteView(collection: CollectionDTO, viewId: string): Promise<boolean | "last"> {
  const current = await prisma.collectionView.findFirst({ where: { id: viewId, collectionId: collection.id } });
  if (!current) return false;
  if (collection.views.length <= 1) return "last";

  await prisma.$transaction(async (tx) => {
    await tx.collectionView.delete({ where: { id: viewId } });
    if (current.isDefault) {
      const next = await tx.collectionView.findFirst({ where: { collectionId: collection.id }, orderBy: { sortOrder: "asc" } });
      if (next) await tx.collectionView.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  await logAudit("collection.view.delete", { type: "collection_view", id: current.id, label: current.name }, { collectionId: collection.id });
  return true;
}

/** The view a `/collections/[slug]` or `/collections/[slug]/[view]` page shows. */
export function pickView(collection: CollectionDTO, viewSlug?: string): ViewDTO | null {
  if (viewSlug) return collection.views.find((view) => view.slug === viewSlug) ?? null;
  return collection.views.find((view) => view.isDefault) ?? collection.views[0] ?? null;
}

/** Serialized fallback when a collection somehow has no stored views. */
export function fallbackView(collection: CollectionDTO): ViewDTO {
  return { id: "", slug: "table", name: "table", kind: "table", config: defaultViewFor(collection.schema), isDefault: true, sortOrder: 0 };
}

export type { ViewConfig };
