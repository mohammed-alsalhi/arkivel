/**
 * The built-in starter kits. Pure data plus pure helpers; the database work
 * lives in `./apply` and the status computation in `./status`.
 */
import type { PropertyValues } from "@/modules/collections/properties";
import { CATALOG } from "@/modules/media/catalog";
import { watchlistProperties } from "@/modules/media/tmdb";
import { MODULE_IDS } from "@/modules/registry";
import type { KitCollection, KitDefinition, KitId, KitItem } from "./types";

export type * from "./types";
export { kitCollectionSlug, kitStatus } from "./status";

function daysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const tasksCollection: KitCollection = {
  template: "tasks",
  name: "tasks",
  views: [{ kind: "table" }, { kind: "board", groupBy: "status" }],
  items: [
    {
      title: "write the welcome page",
      properties: { status: "todo", priority: "high", due: daysFromNow(3), notes: "how to log in, where the spaces are, how to make a first page." },
    },
    {
      title: "review last week's meeting notes",
      properties: { status: "in_progress", priority: "medium", due: daysFromNow(1), notes: "pull the decisions out into their own pages." },
    },
    {
      title: "tag the untagged pages",
      properties: { status: "todo", priority: "low", due: daysFromNow(7) },
    },
    {
      title: "set up the reading list",
      properties: { status: "done", priority: "low", due: daysFromNow(-2), notes: "done — see the reading list collection." },
    },
  ],
};

const readingListCollection: KitCollection = {
  template: "reading_list",
  name: "reading list",
  views: [{ kind: "table" }],
  items: [
    { title: "How to Take Smart Notes", properties: { status: "reading", author: "Sönke Ahrens" } },
    {
      title: "Working in Public",
      properties: { status: "to_read", author: "Nadia Eghbal", url: "https://press.stripe.com/working-in-public" },
    },
  ],
};

// A film and series library on the collections engine.
// Rows come from the media module's starter catalogue so each carries its
// tmdb key, poster, and link, and discover recognises them as saved.
function title(id: number, status: "queued" | "watching" | "watched" | "dropped", extra: PropertyValues = {}): KitItem {
  const entry = CATALOG.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`watchlist kit: no catalogue entry ${id}`);
  return { title: entry.title, properties: { ...watchlistProperties(entry), status, sample: true, ...extra } };
}

const watchlistCollection: KitCollection = {
  template: "watchlist",
  name: "watchlist",
  views: [{ kind: "table" }, { kind: "board", groupBy: "status" }, { kind: "list" }],
  items: [
    title(95396, "watching"),
    title(136315, "watching"),
    title(693134, "queued"),
    title(666277, "queued"),
    title(976893, "queued"),
    title(126308, "queued"),
    title(120467, "watched", { rating: 9, watched_on: daysFromNow(-12) }),
    title(545611, "watched", { rating: 8, watched_on: daysFromNow(-30) }),
    title(244786, "watched", { rating: 9, watched_on: daysFromNow(-45) }),
    title(67070, "dropped"),
  ],
};

export const KITS: readonly KitDefinition[] = [
  {
    id: "documentation", name: "documentation", description: "a versioned documentation index over published articles, with ordered sections and a shared editor",
    modules: ["collections", "api", "assets", "import", "export"], skin: "editorial",
    collections: [{ template: "documentation", name: "documentation", views: [{ kind: "table" }] }],
  },
  {
    id: "wiki",
    name: "wiki",
    description: "a personal or public wiki: pages, links, the graph, feeds, share links, and the public api. no collections.",
    modules: ["graph", "api", "feeds", "share"],
    skin: "wiki",
    collections: [],
  },
  {
    id: "notes-and-tasks",
    name: "notes and tasks",
    description: "notes plus a tasks board and a reading list on the collections engine, with the graph for the notes.",
    modules: ["collections", "graph"],
    skin: "folio",
    collections: [tasksCollection, readingListCollection],
  },
  {
    id: "team-knowledge-base",
    name: "team knowledge base",
    description: "every module on, with an empty tasks collection to start from.",
    modules: [...MODULE_IDS],
    skin: "folio",
    collections: [{ ...tasksCollection, items: [] }],
  },
  {
    id: "course-workspace",
    name: "course workspace",
    description: "linked course hubs and coursework, with deadline views and repeatable course-sync imports.",
    modules: ["collections", "graph", "import", "export"],
    skin: "folio",
    collections: [
      { template: "courses", name: "courses" },
      { template: "coursework", name: "coursework", relations: { course: "courses" }, views: [
        { kind: "table" }, { kind: "board", groupBy: "status" }, { kind: "list" }, { kind: "calendar", groupBy: "due" },
      ] },
    ],
  },
  {
    id: "watchlist",
    name: "watchlist",
    description: "a film and series library: discovery with posters, a watchlist with a status board, per-episode marks, and export for backups.",
    modules: ["collections", "media", "assets", "export", "import"],
    skin: "folio",
    collections: [
      watchlistCollection,
      { template: "episodes", name: "episodes", relations: { show: "watchlist" }, views: [{ kind: "table" }] },
    ],
  },
];

export const KIT_IDS: readonly KitId[] = KITS.map((kit) => kit.id);

export function isKitId(value: unknown): value is KitId {
  return typeof value === "string" && (KIT_IDS as readonly string[]).includes(value);
}

export function getKit(id: unknown): KitDefinition | undefined {
  return KITS.find((kit) => kit.id === id);
}
