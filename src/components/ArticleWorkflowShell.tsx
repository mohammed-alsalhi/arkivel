"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";
import { useArticleTrail } from "@/components/ArticleTrailContext";
import { Page, PageHeader } from "@/components/ui";
import type { TrailItem } from "@/lib/trail";

type ArticleWorkflowSection = "blame" | "diff" | "history";

/** Section switcher under the topbar: article / edit / history / current. */
export function ArticleWorkflowNav({
  active,
  showEditTab = false,
  slug,
}: {
  active: ArticleWorkflowSection;
  showEditTab?: boolean;
  slug: string;
}) {
  const isAdmin = useAdmin();
  return (
    <nav className="article-tabbar" aria-label="Article sections">
      <Link href={`/articles/${slug}`} className="article-tab">article</Link>
      {showEditTab && isAdmin && (
        <Link href={`/articles/${slug}/edit`} className="article-tab">edit</Link>
      )}
      {active !== "history" && (
        <Link href={`/articles/${slug}/history`} className="article-tab">history</Link>
      )}
      <span aria-current="page" className="article-tab article-tab-active">{active}</span>
    </nav>
  );
}

/**
 * Page chrome for history, diff, and blame. The trail comes from the article
 * route layout: `… / title / history` for history, and
 * `… / title / history / diff|blame` for the views that hang off history.
 */
export function ArticleWorkflowShell({
  actions,
  active,
  children,
  description,
  showEditTab = false,
  slug,
  title,
}: {
  actions?: ReactNode;
  active: ArticleWorkflowSection;
  children: ReactNode;
  description?: ReactNode;
  showEditTab?: boolean;
  slug: string;
  title: ReactNode;
}) {
  const { trail: historyTrail, article } = useArticleTrail("history");
  const trail: TrailItem[] =
    active === "history"
      ? historyTrail
      : [
          ...historyTrail.slice(0, -1),
          { label: "history", href: `/articles/${encodeURIComponent(slug)}/history` },
          { label: active },
        ];

  return (
    <Page trail={trail} updatedAt={article?.updatedAt}>
      <ArticleWorkflowNav active={active} showEditTab={showEditTab} slug={slug} />
      <PageHeader actions={actions} description={description} title={title} />
      {children}
    </Page>
  );
}
