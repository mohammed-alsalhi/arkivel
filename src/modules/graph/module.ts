import type { ModuleDefinition } from "../types";

const graph: ModuleDefinition = {
  id: "graph",
  name: "graph",
  description: "the wiki-link graph: the full map and each page's local neighbourhood in the context rail.",
  routes: ["/graph", "/api/graph"],
  nav: [{ label: "graph", href: "/graph", icon: "graph", section: "library", order: 30 }],
  commands: [{ label: "graph", href: "/graph", keywords: ["map", "links", "network"] }],
  docs: {
    help: "open the [graph](/graph) to follow wiki-link relationships.",
    features: [
      "graph — follow wiki-link relationships in each page's context rail or across the full [article graph](/graph).",
    ],
  },
  defaultEnabled: true,
};

export default graph;
