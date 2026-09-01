import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(html: string) {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

export default async function AdminShortArticlesPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/login");

  const articles = await prisma.article.findMany({
    where: { status: { not: "draft" } },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      updatedAt: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withWC = articles.map((a) => ({ ...a, wc: wordCount(a.content) }));
  const stubs = withWC.filter((a) => a.wc < 100).sort((a, b) => a.wc - b.wc);

  // For each stub, find merge candidates: same category, ≥100 words, not itself
  const candidates = withWC.filter((a) => a.wc >= 100);

  const stubsWithSuggestions = stubs.map((stub) => {
    const sameCategory = candidates
      .filter((c) => c.categoryId && c.categoryId === stub.categoryId)
      .sort((a, b) => b.wc - a.wc)
      .slice(0, 3);
    return { ...stub, suggestions: sameCategory };
  });

  return (
    <Page>
      <PageHeader
        kicker={<Link href="/admin" className="hover:text-foreground">Admin</Link>}
        title="Short-Article Merger Suggestions"
        description={
          <>
            Articles under 100 words, each paired with potential merge targets from the same category.
            {" "}{stubs.length} stub{stubs.length !== 1 ? "s" : ""} found.
          </>
        }
      />

      {stubs.length === 0 ? (
        <EmptyState title="No articles under 100 words found." />
      ) : (
        <div className="space-y-4">
          {stubsWithSuggestions.map((stub) => (
            <div key={stub.id} className="border border-border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/articles/${stub.slug}`} className="font-medium hover:underline">
                      {stub.title}
                    </Link>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-warning-soft text-warning font-medium">
                      {stub.wc} words
                    </span>
                    {stub.category && (
                      <span className="text-[11px] text-muted-foreground">
                        in{" "}
                        <Link href={`/categories/${stub.category.slug}`} className="hover:underline">
                          {stub.category.name}
                        </Link>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated {new Date(stub.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <LinkButton href={`/articles/${stub.slug}/edit`}>Expand</LinkButton>
                </div>
              </div>

              {stub.suggestions.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase">
                    Suggested merge targets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stub.suggestions.map((target) => (
                      <div key={target.id} className="flex items-center gap-1 border border-border rounded px-2 py-1 text-xs">
                        <Link href={`/articles/${target.slug}`} className="hover:underline">
                          {target.title}
                        </Link>
                        <span className="text-muted-foreground">({target.wc}w)</span>
                        <Link
                          href={`/articles/${target.slug}/edit`}
                          className="ml-1 text-accent hover:underline"
                        >
                          Edit
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  {stub.categoryId
                    ? "No merge candidates found in this category."
                    : "Article has no category — assign one to get merge suggestions."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
