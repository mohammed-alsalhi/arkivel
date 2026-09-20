/**
 * Applies a starter kit to the running deployment. Server only.
 *
 * - the `modules` SystemSetting override becomes the kit's module list (the
 *   same upsert `/api/admin/modules` performs);
 * - each kit collection is created once, keyed by slug — an existing
 *   collection is skipped untouched, and sample items are only seeded into a
 *   collection this call created;
 * - the kit's skin is reported, never written: skins are env/per-user.
 *
 * Idempotent, like `prisma/seed-demo.mjs`: applying twice changes nothing.
 */
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateSlug } from "@/lib/utils";
import { type PropertySchema } from "@/modules/collections/properties";
import { createCollection, createItem, type CreateCollectionInput } from "@/modules/collections/queries";
import { getTemplate, type CollectionTemplate } from "@/modules/collections/templates";
import { MODULES_SETTING_KEY } from "@/modules/enabled";
import { normalizeModuleIds } from "@/modules/registry";
import { getKit, kitCollectionSlug } from "./index";
import type { ApplyKitReport, KitCollection, KitView } from "./types";

export class KitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KitError";
  }
}

export type ApplyKitOptions = {
  /** Seed the kit's sample rows into collections this call creates. Default true. */
  seedSampleItems?: boolean;
};

type ViewInput = NonNullable<CreateCollectionInput["views"]>[number];

function firstSelect(schema: PropertySchema): string | undefined {
  return schema.find((property) => property.type === "select")?.id;
}

/** The views a kit collection starts with; the template's table view is the default. */
function kitViews(template: CollectionTemplate, requested: KitView[] | undefined): ViewInput[] {
  const wanted = requested?.length ? requested : [{ kind: "table" as const }];
  const views = wanted.map((view): ViewInput => {
    if (view.kind === "table") {
      const table = template.views[0];
      return { name: table.name, slug: table.slug, kind: "table", config: table.config, isDefault: true };
    }
    const groupBy = view.groupBy ?? (view.kind === "board" ? firstSelect(template.schema) : undefined);
    return {
      name: view.kind,
      slug: view.kind,
      kind: view.kind,
      config: { ...template.views[0].config, ...(groupBy ? { groupBy } : {}) },
      isDefault: false,
    };
  });
  if (!views.some((view) => view.isDefault)) views[0].isDefault = true;
  return views;
}

/** Finds a space by name (or its slug), creating it when missing. */
async function ensureCategory(name: string): Promise<string> {
  const slug = generateSlug(name) || "space";
  const existing = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.category.create({ data: { name, slug }, select: { id: true } });
  return created.id;
}

async function applyCollection(
  collection: KitCollection,
  seedSampleItems: boolean,
  report: ApplyKitReport,
): Promise<void> {
  const slug = kitCollectionSlug(collection);
  const existing = await prisma.collection.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    report.collectionsSkipped.push(slug);
    return;
  }

  const template = getTemplate(collection.template);
  if (!template) throw new KitError(`unknown template "${collection.template}"`);

  const schema = [...template.schema];
  for (const [propertyId, targetSlug] of Object.entries(collection.relations ?? {})) {
    const target = await prisma.collection.findUnique({ where: { slug: targetSlug }, select: { id: true } });
    const index = schema.findIndex((property) => property.id === propertyId);
    if (!target || index < 0) throw new KitError(`cannot bind relation "${propertyId}" to "${targetSlug}"`);
    schema[index] = { id: propertyId, name: schema[index].name, type: "relation", collectionId: target.id };
  }

  const created = await createCollection({
    name: collection.name,
    description: template.description,
    categoryId: collection.categoryName ? await ensureCategory(collection.categoryName) : null,
    schema,
    views: kitViews(template, collection.views),
  });
  report.collectionsCreated.push(created.slug);

  if (!seedSampleItems) return;
  for (const item of collection.items ?? []) {
    await createItem(created, { title: item.title, properties: item.properties ?? {} });
    report.itemsCreated += 1;
  }
}

export async function applyKit(kitId: unknown, options: ApplyKitOptions = {}): Promise<ApplyKitReport> {
  const kit = getKit(kitId);
  if (!kit) throw new KitError("unknown kit");
  const seedSampleItems = options.seedSampleItems ?? true;

  const enabled = normalizeModuleIds(kit.modules);
  await prisma.systemSetting.upsert({
    where: { id: MODULES_SETTING_KEY },
    update: { enabled: true, config: { enabled } },
    create: { id: MODULES_SETTING_KEY, enabled: true, config: { enabled } },
  });

  const report: ApplyKitReport = {
    kit: kit.id,
    skin: kit.skin,
    modulesEnabled: enabled,
    collectionsCreated: [],
    collectionsSkipped: [],
    itemsCreated: 0,
  };
  for (const collection of kit.collections) {
    await applyCollection(collection, seedSampleItems, report);
  }

  await logAudit("kit.apply", { type: "kit", id: kit.id, label: kit.name }, { ...report, seedSampleItems });
  return report;
}
