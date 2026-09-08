import api from "./api/module";
import assets from "./assets/module";
import collections from "./collections/module";
import exportModule from "./export/module";
import feeds from "./feeds/module";
import graph from "./graph/module";
import importModule from "./import/module";
import media from "./media/module";
import share from "./share/module";
import type { ModuleDefinition, ModuleId } from "./types";

/** Every built module, in display order. */
export const MODULES: readonly ModuleDefinition[] = [collections, graph, assets, importModule, exportModule, api, feeds, share, media];

export const MODULE_IDS: readonly ModuleId[] = MODULES.map((module) => module.id);

/** The enabled set when neither `ARKIVEL_MODULES` nor an admin override is present. */
export const DEFAULT_ENABLED_MODULES: readonly ModuleId[] = MODULES.filter((module) => module.defaultEnabled).map(
  (module) => module.id,
);

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && (MODULE_IDS as readonly string[]).includes(value);
}

export function moduleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULES.find((module) => module.id === id);
}

/** Known ids from any list-like input, deduplicated and in registry order; unknown ids are ignored. */
export function normalizeModuleIds(values: readonly unknown[]): ModuleId[] {
  const known = new Set(values.filter(isModuleId));
  return MODULE_IDS.filter((id) => known.has(id));
}

/** Parses `ARKIVEL_MODULES` (a comma list). Unset or blank means every module's default. */
export function parseModuleIds(env: string | undefined): ModuleId[] {
  const trimmed = env?.trim();
  if (!trimmed) return [...DEFAULT_ENABLED_MODULES];
  return normalizeModuleIds(trimmed.split(",").map((part) => part.trim().toLowerCase()));
}

/** The admin override stored in the `modules` SystemSetting row: `config: { enabled: ModuleId[] }`. */
export function parseModuleOverride(config: unknown): ModuleId[] | null {
  if (!config || typeof config !== "object") return null;
  const enabled = (config as { enabled?: unknown }).enabled;
  if (!Array.isArray(enabled)) return null;
  return normalizeModuleIds(enabled);
}

/**
 * Resolution order: the env list (or defaults), then the admin override when
 * one is stored. Pure, so it can be tested without a database.
 */
export function resolveEnabledModules(env: string | undefined, override: unknown): ModuleId[] {
  return parseModuleOverride(override) ?? parseModuleIds(env);
}

function routeMatches(route: string, pathname: string): boolean {
  const routeSegments = route.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length < routeSegments.length) return false;
  return routeSegments.every((segment, index) => segment === "*" || segment === pathSegments[index]);
}

/** The module owning a path (by its declared route prefixes), if any. */
export function moduleForPath(pathname: string): ModuleDefinition | undefined {
  const path = pathname.split("?")[0].split("#")[0];
  return MODULES.find((module) => module.routes.some((route) => routeMatches(route, path)));
}
