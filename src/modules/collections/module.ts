import type { ModuleDefinition } from "../types";

const collections: ModuleDefinition = {
  id: "collections",
  name: "collections",
  description:
    "collections with typed properties, linked items, and table, board, list, and calendar views. tasks, courses, and reading lists are templates on it.",
  routes: ["/collections", "/api/collections"],
  nav: [{ label: "collections", href: "/collections", icon: "table", section: "library", order: 25 }],
  commands: [
    { label: "collections", href: "/collections", keywords: ["database", "table", "tasks", "tracker", "courses", "coursework", "calendar"] },
    { label: "new collection", href: "/collections?new=1", keywords: ["create", "database", "tasks"], requires: "member" },
  ],
  docs: {
    help: "open [collections](/collections) for tasks, courses, and reading lists. switch between table, board, list, and calendar, or import a course-sync export into coursework; items can link to pages.",
    features: [
      "collections — typed properties and linked items with shared table, board, list, and calendar views, search, filters, and sorting; the course workspace kit supports repeatable metadata imports with a preview.",
    ],
  },
  defaultEnabled: true,
};

export default collections;
