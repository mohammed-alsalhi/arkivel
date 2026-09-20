import type { ModuleDefinition } from "../types";

const importModule: ModuleDefinition = {
  id: "import",
  name: "import",
  description: "the local file importer plus the notion and obsidian importers.",
  routes: ["/import", "/api/import", "/api/articles/import"],
  nav: [],
  commands: [{ label: "import", href: "/import", keywords: ["upload", "markdown", "notion", "obsidian"], requires: "admin" }],
  docs: {
    features: [
      "local import — upload markdown, text, html, json, or mediawiki xml through [the importer](/import), backed by `/api/articles/import`.",
      "notion and obsidian — continue through the dedicated [notion](/import/notion) or [obsidian](/import/obsidian) importer.",
    ],
  },
  defaultEnabled: true,
};

export default importModule;
