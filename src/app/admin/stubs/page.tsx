import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button, DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(html: string) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

export default async function AdminStubsPage({
  searchParams,
}: {
  searchParams: Promise<{ threshold?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/login");

  const { threshold: thresholdParam } = await searchParams;
  const threshold = Math.max(1, parseInt(thresholdParam ?? "150", 10) || 150);

  const articles = await prisma.article.findMany({
    where: { status: { not: "draft" } },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stubs = articles
    .map((a) => ({ ...a, wc: wordCount(a.content) }))
    .filter((a) => a.wc < threshold)
    .sort((a, b) => a.wc - b.wc);

  return (
    <Page>
      <PageHeader
        kicker={<Link href="/admin" className="hover:text-foreground">Admin</Link>}
        title="Stub Tracker"
        description={
          <>
            {stubs.length} article{stubs.length !== 1 ? "s" : ""} with fewer than {threshold} words
          </>
        }
        actions={
          <form method="get" className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Threshold:</label>
            <input
              name="threshold"
              type="number"
              min={1}
              defaultValue={threshold}
              className="h-7 w-20 px-2 text-sm border border-border rounded bg-background pointer-coarse:h-9"
            />
            <Button type="submit">Update</Button>
          </form>
        }
      />

      {stubs.length === 0 ? (
        <EmptyState title="No stub articles found." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th className="text-right">Words</th>
              <th>Last updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stubs.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/articles/${a.slug}`} className="hover:underline font-medium">
                    {a.title}
                  </Link>
                  <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-warning-soft text-warning font-medium">
                    stub
                  </span>
                </td>
                <td className="text-muted-foreground text-xs">
                  {a.category ? (
                    <Link href={`/categories/${a.category.slug}`} className="hover:underline">
                      {a.category.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right tabular-nums">{a.wc}</td>
                <td className="text-muted-foreground text-xs">
                  {new Date(a.updatedAt).toLocaleDateString()}
                </td>
                <td>
                  <Link
                    href={`/articles/${a.slug}/edit`}
                    className="text-xs text-accent hover:underline"
                  >
                    Expand
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}
