/**
 * Pure status computation for `/api/admin/kits`: given what is enabled and
 * which collections exist, how much of a kit is already in place.
 */
import { generateSlug } from "@/lib/utils";
import type { ModuleId } from "@/modules/types";
import type { KitApplyState, KitCollection, KitDefinition, KitStatus } from "./types";

/** The slug a kit collection is created under — and looked up by on later applies. */
export function kitCollectionSlug(collection: Pick<KitCollection, "name">): string {
  return generateSlug(collection.name) || "untitled";
}

export type KitEnvironment = {
  /** The currently enabled module ids. */
  enabled: readonly ModuleId[];
  /** Slugs of collections that exist. */
  existingSlugs: ReadonlySet<string> | readonly string[];
};

/**
 * `applied` when every kit module is enabled (extra modules do not count
 * against it) and every kit collection exists; `not applied` when nothing of
 * it is in place; `partial` in between.
 */
export function kitStatus(kit: KitDefinition, environment: KitEnvironment): KitStatus {
  const enabled = new Set(environment.enabled);
  const existing = new Set(environment.existingSlugs);

  const modulesEnabled = kit.modules.filter((id) => enabled.has(id));
  const collections = kit.collections.map((collection) => {
    const slug = kitCollectionSlug(collection);
    return { name: collection.name, slug, template: collection.template, exists: existing.has(slug), sampleItems: collection.items?.length ?? 0 };
  });

  const wanted = kit.modules.length + collections.length;
  const present = modulesEnabled.length + collections.filter((collection) => collection.exists).length;
  const status: KitApplyState = present === wanted ? "applied" : present === 0 ? "not applied" : "partial";

  return {
    id: kit.id,
    name: kit.name,
    description: kit.description,
    skin: kit.skin,
    modules: kit.modules,
    modulesEnabled,
    collections,
    status,
  };
}
