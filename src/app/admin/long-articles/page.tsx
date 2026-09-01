import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button, EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(html: string) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

export default async function LongArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ threshold?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  const { threshold: thresholdParam } = await searchParams;
  const threshold = Math.max(500, parseInt(thresholdParam ?? "5000", 10) || 5000);

  const articles = await prisma.article.findMany({
    where: { status: "published", redirectTo: null },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { title: "asc" },
  });

  const long = articles
    .map((a) => ({ ...a, wc: wordCount(a.content) }))
    .filter((a) => a.wc >= threshold)
    .sort((a, b) => b.wc - a.wc);

  return (
    <Page>
      <PageHeader
        title="Long Articles"
        description={
          <>
            Published articles with{" "}
            <strong>{threshold.toLocaleString()}+</strong> words that may benefit from being split into
            multiple focused articles.{" "}
            <strong className="ml-1">{long.length}</strong> of {articles.length} articles.
          </>
        }
        actions={
          <form method="get" className="flex items-center gap-2">
            <label className="text-[11px] text-muted">Threshold:</label>
            <input
              name="threshold"
              type="number"
              min={500}
              step={500}
              defaultValue={threshold}
              className="h-6 w-24 px-2 text-[11px] border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent pointer-coarse:h-9"
            />
            <Button type="submit">Update</Button>
          </form>
        }
      />

      {long.length === 0 ? (
        <EmptyState title={`✓ No articles exceed ${threshold.toLocaleString()} words.`} />
      ) : (
        <div className="border border-border divide-y divide-border">
          {long.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover">
              <div>
                <Link href={`/articles/${a.slug}`} className="text-[13px] text-wiki-link hover:underline font-medium">
                  {a.title}
                </Link>
                {a.category && (
                  <span className="ml-2 text-[11px] text-muted">
                    in{" "}
                    <Link href={`/categories/${a.category.slug}`} className="hover:underline">
                      {a.category.name}
                    </Link>
                  </span>
                )}
                <span className="ml-2 text-[11px] text-muted">
                  Last edited {new Date(a.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-muted">
                  {a.wc.toLocaleString()} words
                </span>
                <LinkButton href={`/articles/${a.slug}/edit`}>
                  Edit
                </LinkButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
