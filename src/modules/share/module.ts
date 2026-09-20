import type { ModuleDefinition } from "../types";

const share: ModuleDefinition = {
  id: "share",
  name: "share",
  description: "private preview links for unpublished pages.",
  routes: ["/share", "/api/articles/*/share-token"],
  nav: [],
  commands: [],
  docs: {
    help: "a draft can be previewed through a private `/share/:token` link before it is published.",
    features: ["share links — private `/share/:token` preview links for drafts, issued through the share-token api."],
  },
  defaultEnabled: true,
};

export default share;
