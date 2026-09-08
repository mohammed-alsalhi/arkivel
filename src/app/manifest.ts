import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.name,
    short_name: config.name.length > 12 ? config.name.split(" ")[0] : config.name,
    description: config.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: config.siteMode === "product" ? "#ffffff" : config.siteMode === "media" ? "#111113" : "#f8f9fa",
    theme_color: config.siteMode === "product" ? "#0b0b0c" : config.siteMode === "media" ? "#ed7964" : "#3366cc",
    orientation: "any",
    icons: [
      {
        src: config.appIcon,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["reference", "education"],
  };
}
