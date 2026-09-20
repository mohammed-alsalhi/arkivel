"use client";

import { createContext, useContext, type ReactNode } from "react";
import { TRAIL_ROOTS, categoryCrumbs, type TrailItem } from "@/lib/trail";

export type ArticleTrailData = {
  slug: string;
  title: string;
  updatedAt: string;
  categories: { name: string; slug: string }[];
} | null;

const ArticleTrailContext = createContext<ArticleTrailData>(null);

export function ArticleTrailProvider({ value, children }: { value: ArticleTrailData; children: ReactNode }) {
  return <ArticleTrailContext.Provider value={value}>{children}</ArticleTrailContext.Provider>;
}

/**
 * Trail for any article-workflow route: `spaces / … / category / title [/ section]`.
 * Falls back to `library / all pages / <slug>` until the route layout has data.
 */
export function useArticleTrail(section?: string): { trail: TrailItem[]; article: ArticleTrailData } {
  const article = useContext(ArticleTrailContext);
  const base: TrailItem[] = article
    ? [
        ...(article.categories.length > 0
          ? [TRAIL_ROOTS.spaces, ...categoryCrumbs(article.categories)]
          : [TRAIL_ROOTS.library, { label: "all pages", href: "/articles" }]),
        { label: article.title, href: section ? `/articles/${encodeURIComponent(article.slug)}` : undefined },
      ]
    : [TRAIL_ROOTS.library, { label: "all pages", href: "/articles" }];
  return { trail: section ? [...base, { label: section }] : base, article };
}
