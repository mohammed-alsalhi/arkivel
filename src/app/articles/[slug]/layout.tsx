import type { ReactNode } from "react";
import { ArticleTrailProvider } from "@/components/ArticleTrailContext";
import { articleSummary } from "@/lib/trail-server";

// Every article-workflow route (read, edit, history, diff, blame) shares the
// article's title and category path so client pages can render a complete
// trail on first paint instead of waiting for their own fetch.
export default async function ArticleRouteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const summary = await articleSummary(slug);
  return <ArticleTrailProvider value={summary}>{children}</ArticleTrailProvider>;
}

export const dynamic = "force-dynamic";
