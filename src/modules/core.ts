import type { NavEntry, PaletteCommand } from "./types";

/**
 * The fixed core's navigation and palette entries. Modules append to these;
 * nothing else hand-lists a destination. The sidebar's search row is a
 * palette trigger, not a link, so it stays in the sidebar itself.
 */
export const CORE_NAV: NavEntry[] = [
  { label: "inbox", href: "/recent-changes", icon: "inbox", section: "top", order: 10 },
  { label: "new page", href: "/articles/new", icon: "plus", section: "top", order: 20 },
  { label: "all pages", href: "/articles", icon: "pages", section: "library", order: 10 },
  { label: "tags", href: "/tags", icon: "tag", section: "library", order: 20 },
  { label: "settings", href: "/settings", icon: "gear", section: "footer", order: 10, requires: "member" },
];

export const CORE_COMMANDS: PaletteCommand[] = [
  { label: "all pages", href: "/", keywords: ["home", "index", "articles"] },
  { label: "inbox", href: "/recent-changes", keywords: ["recent changes", "updates", "activity"] },
  { label: "tags", href: "/tags", keywords: ["labels"] },
  { label: "search", href: "/search", keywords: ["find"] },
  { label: "new page", href: "/articles/new", keywords: ["create", "write", "add"] },
  { label: "settings", href: "/settings", keywords: ["preferences", "account", "profile"], requires: "member" },
  { label: "admin", href: "/admin", keywords: ["administration", "users", "manage"], requires: "admin" },
];
