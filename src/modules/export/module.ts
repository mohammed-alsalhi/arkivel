import type { ModuleDefinition } from "../types";

const exportModule: ModuleDefinition = {
  id: "export",
  name: "export",
  description: "whole-wiki or per-space downloads as markdown, json, or a zip archive, with export history.",
  routes: ["/export", "/api/export"],
  nav: [],
  commands: [{ label: "export", href: "/export", keywords: ["download", "backup", "markdown", "zip"], requires: "admin" }],
  docs: {
    features: [
      "export — download the full wiki or one category as markdown or a zip archive from [export](/export).",
    ],
  },
  defaultEnabled: true,
};

export default exportModule;
