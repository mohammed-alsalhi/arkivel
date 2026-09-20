import type { ModuleDefinition } from "../types";

const assets: ModuleDefinition = {
  id: "assets",
  name: "assets",
  description: "the asset library and file uploads for images, pdfs, audio, video, and other files.",
  routes: ["/assets", "/api/assets", "/api/upload"],
  nav: [],
  commands: [{ label: "assets", href: "/assets", keywords: ["files", "images", "uploads", "library"], requires: "admin" }],
  docs: {
    features: [
      "assets — upload and browse images, pdfs, audio, video, and other files in the [asset library](/assets).",
    ],
  },
  defaultEnabled: true,
};

export default assets;
