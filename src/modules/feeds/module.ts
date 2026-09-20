import type { ModuleDefinition } from "../types";

const feeds: ModuleDefinition = {
  id: "feeds",
  name: "feeds",
  description: "rss and atom feeds of recently published pages.",
  routes: ["/feed.xml", "/feed/atom"],
  nav: [],
  commands: [],
  docs: {
    help: "subscribe to `/feed.xml` (rss) or `/feed/atom` for recently published pages.",
    features: ["feeds — rss and atom feeds of recently published pages at `/feed.xml` and `/feed/atom`."],
  },
  defaultEnabled: true,
};

export default feeds;
