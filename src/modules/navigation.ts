import { CORE_COMMANDS, CORE_NAV } from "./core";
import { MODULES } from "./registry";
import type { ModuleId, NavEntry, NavSection, PaletteCommand } from "./types";

export type NavAuth = { admin: boolean; loggedIn: boolean };

function allowed(requires: "member" | "admin" | undefined, auth: NavAuth): boolean {
  if (requires === "admin") return auth.admin;
  if (requires === "member") return auth.loggedIn || auth.admin;
  return true;
}

function enabledModules(enabled: readonly ModuleId[]) {
  const set = new Set(enabled);
  return MODULES.filter((module) => set.has(module.id));
}

/** `[...core, ...enabled module nav]` for one sidebar section, ordered and filtered by access. */
export function composeNav(section: NavSection, enabled: readonly ModuleId[], auth: NavAuth): NavEntry[] {
  return [...CORE_NAV, ...enabledModules(enabled).flatMap((module) => module.nav)]
    .filter((entry) => entry.section === section && allowed(entry.requires, auth))
    .sort((a, b) => a.order - b.order);
}

/** `[...core, ...enabled module commands]` for the palette's "go to" section, filtered by access. */
export function composeCommands(enabled: readonly ModuleId[], auth: NavAuth): PaletteCommand[] {
  return [...CORE_COMMANDS, ...enabledModules(enabled).flatMap((module) => module.commands)].filter((command) =>
    allowed(command.requires, auth),
  );
}
