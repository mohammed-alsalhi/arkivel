"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ArticleStatusBadge from "@/components/ArticleStatusBadge";
import { DataTable, EmptyState, LinkButton, LoadingState, Page, PageHeader, Section } from "@/components/ui";

type ReviewArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
};

type SpaceGovernanceSummary = {
  articleCount: number;
  badges: string[];
  categoryId: string;
  categoryName: string;
  stalePages: number;
  unreviewedDrafts: number;
  widgets: { id: string; label: string }[];
};

// Full directory of admin tools, grouped. The sidebar links only here;
// every admin route must be reachable from this list.
const ADMIN_DIRECTORY: { title: string; entries: { href: string; label: string }[] }[] = [
  {
    title: "Content quality",
    entries: [
      { href: "/admin/lint", label: "Content lint" },
      { href: "/admin/quality", label: "Content quality" },
      { href: "/admin/stubs", label: "Stubs" },
      { href: "/admin/short-articles", label: "Short articles" },
      { href: "/admin/long-articles", label: "Long articles" },
      { href: "/admin/staleness", label: "Stale articles" },
      { href: "/admin/orphans", label: "Orphaned articles" },
      { href: "/admin/dead-ends", label: "Dead ends" },
      { href: "/admin/duplicate-content", label: "Duplicate content" },
      { href: "/admin/knowledge-gaps", label: "Knowledge gaps" },
      { href: "/admin/content-gaps", label: "Content gaps" },
      { href: "/admin/suggestions", label: "Suggestions" },
      { href: "/admin/external-links", label: "External links" },
    ],
  },
  {
    title: "Authoring",
    entries: [
      { href: "/admin/templates", label: "Templates" },
      { href: "/admin/macros", label: "Macros" },
      { href: "/admin/glossary", label: "Glossary" },
      { href: "/admin/metadata-schemas", label: "Metadata schemas" },
      { href: "/admin/series", label: "Series" },
      { href: "/admin/redirects", label: "Redirects" },
      { href: "/admin/kanban", label: "Article pipeline" },
      { href: "/admin/content-schedule", label: "Content schedule" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/import", label: "Bulk import" },
      { href: "/import", label: "Import articles" },
    ],
  },
  {
    title: "Insights",
    entries: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/metrics", label: "Metrics" },
      { href: "/admin/health", label: "Health" },
      { href: "/admin/search-analytics", label: "Search analytics" },
      { href: "/admin/search-gaps", label: "Search gaps" },
      { href: "/admin/category-stats", label: "Category stats" },
      { href: "/admin/category-growth", label: "Category growth" },
      { href: "/admin/tag-trends", label: "Tag trends" },
      { href: "/admin/user-activity", label: "User activity" },
      { href: "/admin/retention", label: "Reader retention" },
      { href: "/admin/referrers", label: "Referrers" },
      { href: "/admin/word-count", label: "Word counts" },
      { href: "/admin/writing-velocity", label: "Writing velocity" },
    ],
  },
  {
    title: "Organization",
    entries: [
      { href: "/admin/categories", label: "Category merge" },
      { href: "/admin/tags", label: "Tag management" },
      { href: "/admin/embeddings", label: "Embeddings" },
      { href: "/admin/prune-revisions", label: "Prune revisions" },
    ],
  },
  {
    title: "System",
    entries: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/plugins", label: "Plugins" },
      { href: "/admin/marketplace", label: "Marketplace" },
      { href: "/admin/webhooks", label: "Webhooks" },
      { href: "/admin/theme", label: "Theme" },
      { href: "/admin/customization", label: "Customization" },
      { href: "/admin/announcements", label: "Announcements" },
      { href: "/admin/performance", label: "Performance" },
      { href: "/admin/observability", label: "Observability" },
      { href: "/admin/operations", label: "Operations" },
      { href: "/admin/audit-log", label: "Audit log" },
      { href: "/admin/federated-peers", label: "Federated peers" },
      { href: "/admin/maintenance", label: "Maintenance mode" },
      { href: "/admin/read-only", label: "Read-only mode" },
    ],
  },
];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewArticles, setReviewArticles] = useState<ReviewArticle[]>([]);
  const [spaceGovernance, setSpaceGovernance] = useState<SpaceGovernanceSummary[]>([]);

  useEffect(() => {
    async function checkAuth() {
      const r = await fetch("/api/auth/check");
      const data = await r.json();
      setIsAdmin(data.admin);
      setLoading(false);
      if (data.admin) {
        const [draftRes, reviewRes, governanceRes] = await Promise.all([
          fetch("/api/articles?status=draft&limit=50"),
          fetch("/api/articles?status=review&limit=50"),
          fetch("/api/admin/space-governance/summary"),
        ]);
        const items: ReviewArticle[] = [];
        if (draftRes.ok) {
          const d = await draftRes.json();
          items.push(...d.articles);
        }
        if (reviewRes.ok) {
          const d = await reviewRes.json();
          items.push(...d.articles);
        }
        if (governanceRes.ok) {
          const governance = await governanceRes.json();
          setSpaceGovernance(Array.isArray(governance.spaces) ? governance.spaces : []);
        }
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setReviewArticles(items);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <Page>
      <PageHeader
        title="Admin"
        description="Review drafts and keep operational tools close at hand."
        actions={
          <>
            <LinkButton href="/admin/users">Users</LinkButton>
            <LinkButton href="/admin/categories">Categories</LinkButton>
            <LinkButton href="/admin/operations">Operations</LinkButton>
            <LinkButton href="/admin/observability">Observability</LinkButton>
            <LinkButton href="/admin/performance">Performance</LinkButton>
            <LinkButton href="/admin/quality">Quality</LinkButton>
            <LinkButton href="/admin/plugins">Plugins</LinkButton>
          </>
        }
      />
      {isAdmin ? (
        <>
          {spaceGovernance.length > 0 && (
            <Section title="Space governance">
              <div className="grid gap-3 lg:grid-cols-2">
                {spaceGovernance.slice(0, 4).map((space) => (
                  <div key={space.categoryId} className="border border-border bg-surface p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href="/admin/categories" className="font-medium hover:underline">
                        {space.categoryName}
                      </Link>
                      <span className="text-[11px] text-muted">{space.articleCount} article(s)</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {space.badges.slice(0, 3).map((badge) => (
                        <span key={badge} className="ui-chip">{badge}</span>
                      ))}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="border border-border-light bg-background p-2">
                        <dt className="text-muted">Stale pages</dt>
                        <dd className="text-lg font-semibold text-heading">{space.stalePages}</dd>
                      </div>
                      <div className="border border-border-light bg-background p-2">
                        <dt className="text-muted">Draft/review</dt>
                        <dd className="text-lg font-semibold text-heading">{space.unreviewedDrafts}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] text-muted">
                      Widgets: {space.widgets.map((widget) => widget.label).join(", ") || "None"}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {reviewArticles.length > 0 ? (
            <Section title={`Articles needing review (${reviewArticles.length})`}>
              <DataTable>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="w-24">Status</th>
                    <th className="w-28">Last edited</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewArticles.map((article) => (
                    <tr key={article.id}>
                      <td>
                        <Link href={`/articles/${article.slug}/edit`} className="font-medium">
                          {article.title}
                        </Link>
                      </td>
                      <td>
                        <ArticleStatusBadge status={article.status} />
                      </td>
                      <td className="text-muted text-[12px]">
                        {new Date(article.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Section>
          ) : (
            <EmptyState
              title="Nothing needs review"
              description="Draft and review queues are clear."
              actions={<LinkButton href="/articles" variant="primary">Browse articles</LinkButton>}
            />
          )}

          <Section title="All admin tools">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ADMIN_DIRECTORY.map((group) => (
                <div key={group.title}>
                  <h3 className="text-[11px] font-bold uppercase text-muted mb-1.5">{group.title}</h3>
                  <ul className="space-y-0.5">
                    {group.entries.map((entry) => (
                      <li key={entry.href}>
                        <Link href={entry.href} className="block py-1 text-[13px] text-wiki-link hover:bg-surface-hover px-1 -mx-1">
                          {entry.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <EmptyState
          title="Admin access required"
          description="You need to be logged in as an admin to access this page."
          actions={<LinkButton href="/login" variant="primary">Log in</LinkButton>}
        />
      )}
    </Page>
  );
}
