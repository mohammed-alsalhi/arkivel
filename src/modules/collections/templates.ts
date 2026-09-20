import type { PropertySchema, ViewConfig } from "./properties";
import { defaultViewFor } from "./properties";

export type TemplateId =
  | "documentation"
  | "blank"
  | "tasks"
  | "reading_list"
  | "simple_table"
  | "courses"
  | "coursework"
  | "watchlist"
  | "episodes";

export type CollectionTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  schema: PropertySchema;
  views: { name: string; slug: string; kind: "table"; config: ViewConfig; isDefault: boolean }[];
};

function tableView(schema: PropertySchema, config?: Partial<ViewConfig>): CollectionTemplate["views"] {
  return [{ name: "table", slug: "table", kind: "table", isDefault: true, config: { ...defaultViewFor(schema), ...config } }];
}

const tasksSchema: PropertySchema = [
  { id: "title", name: "task", type: "title" },
  {
    id: "status",
    name: "status",
    type: "select",
    options: [
      { id: "todo", label: "todo", tone: "default" },
      { id: "in_progress", label: "in progress", tone: "info" },
      { id: "done", label: "done", tone: "success" },
    ],
  },
  { id: "due", name: "due", type: "date" },
  {
    id: "priority",
    name: "priority",
    type: "select",
    options: [
      { id: "low", label: "low", tone: "default" },
      { id: "medium", label: "medium", tone: "warning" },
      { id: "high", label: "high", tone: "danger" },
    ],
  },
  { id: "assignee", name: "assignee", type: "person" },
  { id: "notes", name: "notes", type: "text" },
];

const readingListSchema: PropertySchema = [
  { id: "title", name: "title", type: "title" },
  {
    id: "status",
    name: "status",
    type: "select",
    options: [
      { id: "to_read", label: "to read", tone: "default" },
      { id: "reading", label: "reading", tone: "info" },
      { id: "read", label: "read", tone: "success" },
    ],
  },
  { id: "url", name: "url", type: "url" },
  { id: "author", name: "author", type: "text" },
  { id: "rating", name: "rating", type: "number" },
];

const simpleTableSchema: PropertySchema = [
  { id: "title", name: "name", type: "title" },
  { id: "text", name: "text", type: "text" },
  { id: "number", name: "number", type: "number" },
  { id: "done", name: "done", type: "checkbox" },
];

const blankSchema: PropertySchema = [{ id: "title", name: "name", type: "title" }];

const coursesSchema: PropertySchema = [
  { id: "title", name: "course", type: "title" },
  { id: "code", name: "code", type: "text" },
  { id: "term", name: "term", type: "text" },
  { id: "source_url", name: "course website", type: "url" },
  { id: "source_id", name: "source id", type: "text" },
  { id: "notes", name: "notes", type: "text" },
];

const courseworkSchema: PropertySchema = [
  ...tasksSchema.filter((property) => property.id !== "assignee"),
  // The course workspace kit binds this property to its courses collection.
  { id: "course", name: "course", type: "text" },
  { id: "kind", name: "kind", type: "select", options: [
    { id: "assignment", label: "assignment", tone: "default" },
    { id: "exam", label: "exam", tone: "danger" },
    { id: "reading", label: "reading", tone: "info" },
    { id: "action", label: "action", tone: "warning" },
  ] },
  { id: "due_at", name: "exact deadline", type: "text" },
  { id: "timezone", name: "timezone", type: "text" },
  { id: "available_at", name: "available from", type: "text" },
  { id: "late_until", name: "late deadline", type: "text" },
  { id: "reservation_at", name: "confirmed reservation", type: "text" },
  { id: "score", name: "score", type: "number" },
  { id: "completion_evidence", name: "completion evidence", type: "text" },
  { id: "source_id", name: "source id", type: "text" },
  { id: "source_url", name: "source", type: "url" },
  { id: "source_list", name: "source list", type: "text" },
  { id: "source_status", name: "source status", type: "select", options: [
    { id: "needsAction", label: "open", tone: "default" },
    { id: "completed", label: "completed", tone: "success" },
    { id: "unknown", label: "unknown", tone: "warning" },
  ] },
  { id: "source_updated", name: "source captured at", type: "text" },
  { id: "source_notes", name: "source notes", type: "text" },
];

// A film and series library: what to watch next, what is in progress, how it felt.
const watchlistSchema: PropertySchema = [
  { id: "title", name: "title", type: "title" },
  { id: "media", name: "type", type: "select", options: [
    { id: "movie", label: "film", tone: "default" },
    { id: "series", label: "series", tone: "info" },
  ] },
  { id: "status", name: "status", type: "select", options: [
    { id: "queued", label: "to watch", tone: "default" },
    { id: "watching", label: "watching", tone: "info" },
    { id: "watched", label: "watched", tone: "success" },
    { id: "dropped", label: "dropped", tone: "warning" },
  ] },
  { id: "moods", name: "moods", type: "multi_select", options: [
    { id: "funny", label: "funny", tone: "warning" },
    { id: "feel_good", label: "feel-good", tone: "success" },
    { id: "relaxing", label: "relaxing", tone: "success" },
    { id: "romantic", label: "romantic", tone: "danger" },
    { id: "thrilling", label: "thrilling", tone: "info" },
    { id: "dark", label: "dark", tone: "default" },
    { id: "thoughtful", label: "thought-provoking", tone: "info" },
    { id: "inspiring", label: "inspiring", tone: "success" },
    { id: "action", label: "action-packed", tone: "danger" },
    { id: "scary", label: "scary", tone: "danger" },
  ] },
  { id: "year", name: "year", type: "number" },
  { id: "release_date", name: "release date", type: "date" },
  { id: "rating", name: "my rating", type: "number" },
  { id: "watched_on", name: "watched on", type: "date" },
  { id: "watched_at", name: "exact watched time", type: "text" },
  { id: "url", name: "link", type: "url" },
  { id: "poster", name: "poster", type: "url" },
  { id: "backdrop", name: "backdrop", type: "url" },
  { id: "overview", name: "overview", type: "text" },
  { id: "genres", name: "genres", type: "text" },
  { id: "runtime", name: "runtime (minutes)", type: "number" },
  { id: "score", name: "tmdb score", type: "number" },
  { id: "notes", name: "notes", type: "text" },
  // The media module keys saved titles by this ("movie:693134"); blank for hand-added rows.
  { id: "tmdb", name: "tmdb id", type: "text" },
  // Kit rows start as samples; any edit clears it so "remove samples" leaves your titles alone.
  { id: "sample", name: "starter title", type: "checkbox" },
];

// Episode marks for a series in the watchlist; the watchlist kit binds `show`.
const episodesSchema: PropertySchema = [
  { id: "title", name: "episode", type: "title" },
  { id: "show", name: "show", type: "text" },
  { id: "season", name: "season", type: "number" },
  { id: "episode", name: "episode number", type: "number" },
  { id: "watched", name: "watched", type: "checkbox" },
  { id: "watched_on", name: "watched on", type: "date" },
  { id: "watched_at", name: "exact watched time", type: "text" },
];

const documentationSchema: PropertySchema = [
  { id: "title", name: "page", type: "title" },
  { id: "version", name: "version", type: "text" },
  { id: "section", name: "section", type: "text" },
  { id: "key", name: "topic key", type: "text" },
  { id: "order", name: "reading order", type: "number" },
];

export const COLLECTION_TEMPLATES: readonly CollectionTemplate[] = [
  { id: "documentation", name: "documentation", description: "versioned documentation: link each row to a published article, then set its version, section, topic key, and reading order", schema: documentationSchema, views: tableView(documentationSchema) },
  { id: "courses", name: "courses", description: "course hubs, term, source links, and notes.", schema: coursesSchema,
    views: tableView(coursesSchema, { visible: ["title", "code", "term", "source_url"] }) },
  { id: "coursework", name: "coursework", description: "course tasks with deadlines, completion evidence, and import provenance.", schema: courseworkSchema,
    views: tableView(courseworkSchema, { visible: ["title", "status", "course", "due", "priority", "kind", "source_url"], sorts: [{ property: "due", direction: "asc" }] }) },
  { id: "blank", name: "blank", description: "a title column; add properties as you go.", schema: blankSchema, views: tableView(blankSchema) },
  {
    id: "tasks",
    name: "tasks",
    description: "status, due date, priority, assignee, notes.",
    schema: tasksSchema,
    views: tableView(tasksSchema, { sorts: [{ property: "due", direction: "asc" }] }),
  },
  {
    id: "reading_list",
    name: "reading list",
    description: "status, link, author, rating.",
    schema: readingListSchema,
    views: tableView(readingListSchema),
  },
  {
    id: "simple_table",
    name: "simple table",
    description: "a text, a number, and a checkbox.",
    schema: simpleTableSchema,
    views: tableView(simpleTableSchema),
  },
  {
    id: "watchlist",
    name: "watchlist",
    description: "films and series: type, status, moods, year, rating, when you watched it.",
    schema: watchlistSchema,
    views: tableView(watchlistSchema, { visible: ["title", "media", "status", "moods", "year", "rating"] }),
  },
  {
    id: "episodes",
    name: "episodes",
    description: "episode marks for a series: season, number, watched, watched on.",
    schema: episodesSchema,
    views: tableView(episodesSchema, {
      visible: ["title", "show", "season", "episode", "watched"],
      sorts: [{ property: "season", direction: "asc" }, { property: "episode", direction: "asc" }],
    }),
  },
];

export function getTemplate(id: unknown): CollectionTemplate | undefined {
  return COLLECTION_TEMPLATES.find((template) => template.id === id);
}
