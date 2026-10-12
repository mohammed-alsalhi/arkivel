/**
 * Starter kits (docs/modules-and-collections.md): a preset of enabled modules
 * plus seeded collections. Kits are applied from
 * `/admin/kits`; there is no marketplace and no third-party plugin surface.
 */
import type { PropertyValues } from "@/modules/collections/properties";
import type { TemplateId } from "@/modules/collections/templates";
import type { ModuleId } from "@/modules/types";

export type KitId = "documentation" | "wiki" | "notes-and-tasks" | "team-knowledge-base" | "course-workspace" | "watchlist";

export type KitViewKind = "table" | "board" | "list" | "calendar";

/**
 * A view a kit collection ships with. `table` reuses the template's table view;
 * `board` groups by `groupBy` (default: the schema's first select property).
 */
export type KitView = { kind: KitViewKind; groupBy?: string };

/** A sample row; `properties` are validated against the template schema on apply. */
export type KitItem = { title: string; properties?: PropertyValues };

export type KitCollection = {
  template: TemplateId;
  /** Display name; the slug (and the idempotency key) derives from it. */
  name: string;
  /** Space to create the collection in; created by name when missing. */
  categoryName?: string;
  views?: KitView[];
  /** Property id to an earlier kit collection's slug. Bound to its real id on creation. */
  relations?: Record<string, string>;
  items?: KitItem[];
};

export type KitDefinition = {
  id: KitId;
  name: string;
  description: string;
  modules: ModuleId[];
  collections: KitCollection[];
};

/** What `applyKit` did. Collections are reported by slug. */
export type ApplyKitReport = {
  kit: KitId;
  modulesEnabled: ModuleId[];
  collectionsCreated: string[];
  collectionsSkipped: string[];
  itemsCreated: number;
};

export type KitApplyState = "applied" | "partial" | "not applied";

/** One kit as `/api/admin/kits` reports it: the definition plus what is already in place. */
export type KitStatus = {
  id: KitId;
  name: string;
  description: string;
  modules: ModuleId[];
  /** The kit's modules that are enabled right now. */
  modulesEnabled: ModuleId[];
  collections: { name: string; slug: string; template: TemplateId; exists: boolean; sampleItems: number }[];
  status: KitApplyState;
};
