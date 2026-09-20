import { cache } from "react";
import prisma from "@/lib/prisma";
import { documentationIndex, type DocumentationPage } from "./index";

export const getDocumentationIndex = cache(async () => {
  const items = await prisma.collectionItem.findMany({
    where: { collection: { slug: "documentation" }, article: { is: { published: true, status: "published", accessPassword: null, redirectTo: null } } },
    select: { properties: true, sortOrder: true, article: { select: { slug: true, title: true, excerpt: true } } },
  });
  const pages: DocumentationPage[] = [];
  for (const item of items) {
    if (!item.article) continue;
    const p = item.properties && typeof item.properties === "object" && !Array.isArray(item.properties) ? item.properties : {};
    const text = (name: string, fallback: string) => typeof p[name] === "string" && p[name].trim() ? p[name].trim() : fallback;
    pages.push({ ...item.article, version: text("version", "current"), section: text("section", "guide"), key: text("key", ""), order: typeof p.order === "number" && Number.isFinite(p.order) ? p.order : item.sortOrder });
  }
  return documentationIndex(pages);
});
