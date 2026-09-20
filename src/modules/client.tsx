"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_ENABLED_MODULES } from "./registry";
import type { ModuleId } from "./types";

// Outside the provider (tests, isolated renders) every default module counts as
// enabled, which matches a deployment with no env list and no override.
const EnabledModulesContext = createContext<readonly ModuleId[]>(DEFAULT_ENABLED_MODULES);

/** Fed by the root layout with the server-resolved enabled set. */
export function EnabledModulesProvider({ children, modules }: { children: ReactNode; modules: readonly ModuleId[] }) {
  return <EnabledModulesContext.Provider value={modules}>{children}</EnabledModulesContext.Provider>;
}

export function useEnabledModules(): readonly ModuleId[] {
  return useContext(EnabledModulesContext);
}

export function useModuleEnabled(id: ModuleId): boolean {
  return useEnabledModules().includes(id);
}
