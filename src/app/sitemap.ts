import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = config.baseUrl;

  // A personal library has nothing to index beyond its front door.
  if (config.siteMode === "media") {
    return [{ url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 }];
  }

  const { default: prisma } = await import("@/lib/prisma");
  const articles = await prisma.article.findMany({
    where: { published: true, status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: {
      articles: {
        some: { published: true, status: "published" },
      },
    },
    select: { slug: true, createdAt: true },
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/graph`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/tags`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/articles/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/categories/${c.slug}`,
    lastModified: c.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...articlePages, ...categoryPages];
}
