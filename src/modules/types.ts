/**
 * The module contract (docs/modules-and-collections.md). A module is a folder
 * under `src/modules/<id>/` that declares what it owns; a deployment enables a
 * set of them and everything else (routes, sidebar, palette, docs) composes
 * from the registry. A module may not import from another module.
 */

export type ModuleId = "graph" | "assets" | "import" | "export" | "api" | "feeds" | "share" | "collections" | "media";

export type NavSection = "top" | "library" | "spaces" | "footer";

/** A key into the shared inline icon set (`src/components/icons.tsx`). */
export type IconName = "search" | "inbox" | "plus" | "pages" | "tag" | "graph" | "folder" | "gear" | "table" | "film";

export type NavEntry = {
  label: string;
  href: string;
  icon: IconName;
  section: NavSection;
  order: number;
  requires?: "member" | "admin";
};

export type PaletteCommand = {
  label: string;
  href: string;
  keywords: string[];
  requires?: "member" | "admin";
};

export type ModuleDefinition = {
  id: ModuleId;
  name: string;            // lowercase interface copy
  description: string;
  /** path prefixes this module owns; disabled → 404. `*` matches one segment. */
  routes: string[];
  nav: NavEntry[];
  commands: PaletteCommand[];
  /**
   * Interface copy for the help and features pages. Strings may carry
   * `[label](href)` links and `` `code` `` spans; a feature reads
   * `title — body` (see `DocsText`).
   */
  docs: { help?: string; features: string[] };
  /** default enablement when ARKIVEL_MODULES is unset */
  defaultEnabled: boolean;
};
