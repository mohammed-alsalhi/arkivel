import { isPrivateInstance } from "@/lib/instance-access";

export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (isPrivateInstance()) return { rules: { userAgent: "*", disallow: "/" } };
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
