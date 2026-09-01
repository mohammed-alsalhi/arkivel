"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, DataTable, EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";

type ArticleEntry = {
  id: string;
  title: string;
  slug: string;
  status: string;
  expiresAt?: string | null;
  reviewDueAt?: string | null;
};

type ScheduleData = {
  expiredArticles: ArticleEntry[];
  expiringSoon: ArticleEntry[];
  reviewOverdue: ArticleEntry[];
  reviewDueSoon: ArticleEntry[];
};

function ArticleRow({ a, dateField }: { a: ArticleEntry; dateField: "expiresAt" | "reviewDueAt" }) {
  const date = a[dateField];
  return (
    <tr>
      <td>
        <Link href={`/articles/${a.slug}`} className="text-[13px] text-accent hover:underline font-medium">
          {a.title}
        </Link>
      </td>
      <td className="text-[12px] text-muted">
        {date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
      </td>
      <td>
        <span className={`text-[11px] px-1.5 py-0.5 rounded border ${
          a.status === "published" ? "border-success-border text-success bg-success-soft"
          : a.status === "review" ? "border-info-border text-info bg-info-soft"
          : "border-warning-border text-warning bg-warning-soft"
        }`}>
          {a.status}
        </span>
      </td>
      <td>
        <Link href={`/articles/${a.slug}/edit`} className="text-[11px] text-muted hover:text-accent pointer-coarse:inline-block pointer-coarse:py-2">
          edit
        </Link>
      </td>
    </tr>
  );
}

function Section({
  title,
  colour,
  articles,
  dateField,
  emptyText,
}: {
  title: string;
  colour: string;
  articles: ArticleEntry[];
  dateField: "expiresAt" | "reviewDueAt";
  emptyText: string;
}) {
  return (
    <div className={`border rounded-md overflow-hidden mb-6 ${colour}`}>
      <div className="px-4 py-2 border-b border-inherit flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-heading">{title}</h2>
        <span className="text-[11px] text-muted">{articles.length}</span>
      </div>
      {articles.length === 0 ? (
        <EmptyState className="m-3" title={emptyText} />
      ) : (
        <DataTable>
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => <ArticleRow key={a.id} a={a} dateField={dateField} />)}
            </tbody>
        </DataTable>
      )}
    </div>
  );
}

export default function ContentSchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content-schedule").then((r) => r.json()).then(setData);
  }, []);

  async function runArchive() {
    setArchiving(true);
    await fetch("/api/cron/expire-articles", { method: "POST" });
    const fresh = await fetch("/api/admin/content-schedule").then((r) => r.json());
    setData(fresh);
    setArchiving(false);
  }

  return (
    <Page>
      <PageHeader
        title="Content Schedule"
        description="Articles with expiry or review dates. Set these in the article editor."
        actions={
          <>
            <Button onClick={runArchive} disabled={archiving}>
              {archiving ? "Archiving..." : "Run auto-archive"}
            </Button>
            <LinkButton href="/admin">← Admin</LinkButton>
          </>
        }
      />

      {!data ? (
        <p className="text-[13px] text-muted italic">Loading...</p>
      ) : (
        <>
          <Section
            title="Expired (need archiving)"
            colour="border-danger-border"
            articles={data.expiredArticles}
            dateField="expiresAt"
            emptyText="No expired articles."
          />
          <Section
            title="Expiring in the next 14 days"
            colour="border-warning-border"
            articles={data.expiringSoon}
            dateField="expiresAt"
            emptyText="None expiring soon."
          />
          <Section
            title="Review overdue"
            colour="border-danger-border"
            articles={data.reviewOverdue}
            dateField="reviewDueAt"
            emptyText="No overdue reviews."
          />
          <Section
            title="Review due in the next 14 days"
            colour="border-info-border"
            articles={data.reviewDueSoon}
            dateField="reviewDueAt"
            emptyText="No reviews due soon."
          />
        </>
      )}
    </Page>
  );
}
