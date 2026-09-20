import type { ReactNode } from "react";

/** One crumb of a page's trail. The last item is the current page. */
export type TrailItem = { label: ReactNode; href?: string };

/** Root crumbs for each route family; every page's trail starts with one. */
export const TRAIL_ROOTS = {
  library: { label: "library", href: "/" },
  spaces: { label: "spaces", href: "/categories" },
  tags: { label: "tags", href: "/tags" },
  admin: { label: "admin", href: "/admin" },
  settings: { label: "settings", href: "/settings" },
  reference: { label: "reference", href: "/help" },
  account: { label: "account" },
  people: { label: "people" },
} as const satisfies Record<string, TrailItem>;

type CategoryCrumb = { name: string; slug: string };

/** Turns an ordered ancestor list (root first) into linked crumbs. */
export function categoryCrumbs(chain: CategoryCrumb[]): TrailItem[] {
  return chain.map((category) => ({
    label: category.name,
    href: `/categories/${encodeURIComponent(category.slug)}`,
  }));
}

/** The parent crumb of a trail (for back links) — the last item with a link before the current page. */
export function trailParent(trail: TrailItem[] | undefined): TrailItem | undefined {
  if (!trail || trail.length < 2) return undefined;
  for (let index = trail.length - 2; index >= 0; index -= 1) {
    if (trail[index].href) return trail[index];
  }
  return undefined;
}
