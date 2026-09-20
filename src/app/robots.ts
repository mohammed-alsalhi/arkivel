import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = config.baseUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/import", "/export"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
