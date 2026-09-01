import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StalenessPage() {
  const user = await getSession();
  if (!user || !await isAdmin()) redirect("/admin");

  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 180 * 86400000); // 6 months

  const articles = await prisma.article.findMany({
    where: { status: "published", updatedAt: { lt: cutoff } },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      category: { select: { name: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });

  return (
    <Page>
      <PageHeader
        title="Stale Articles"
        description="Published articles not updated in the past 6 months, sorted oldest first."
      />

      {articles.length === 0 ? (
        <EmptyState title="No stale articles — great job keeping content fresh!" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Article</th>
              <th>Category</th>
              <th>Last Updated</th>
              <th className="w-24">Days Stale</th>
              <th className="w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => {
              // eslint-disable-next-line react-hooks/purity
              const daysStale = Math.floor((Date.now() - a.updatedAt.getTime()) / 86400000);
              return (
                <tr key={a.id}>
                  <td>
                    <Link href={`/articles/${a.slug}`} className="text-wiki-link hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="text-muted">{a.category?.name ?? "—"}</td>
                  <td className="text-muted text-xs">{formatDate(a.updatedAt)}</td>
                  <td>
                    <span
                      className={`text-xs font-medium ${daysStale > 365 ? "text-danger" : "text-warning"}`}
                    >
                      {daysStale}d
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/edit/${a.slug}`}
                      className="text-xs text-wiki-link hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}
