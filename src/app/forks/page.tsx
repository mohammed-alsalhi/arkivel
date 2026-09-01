import Link from "next/link";
import prisma from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";

export default async function ForksPage() {
  const user = await getSession();
  if (!user || !await isAdmin()) redirect("/");

  const forks = await prisma.articleFork.findMany({
    where: { status: "proposed" },
    include: {
      author: { select: { username: true, displayName: true } },
      original: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Page>
      <PageHeader
        title="Proposed Article Forks"
        actions={<LinkButton href="/admin">Admin</LinkButton>}
      />

      {forks.length === 0 ? (
        <EmptyState title="No proposed forks awaiting review." />
      ) : (
          <div className="space-y-3">
            {forks.map((fork) => (
              <div key={fork.id} className="border border-border rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{fork.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Fork of{" "}
                      <Link href={`/articles/${fork.original.slug}`} className="text-wiki-link hover:underline">
                        {fork.original.title}
                      </Link>
                      {" "}by {fork.author.displayName || fork.author.username}
                    </p>
                    {fork.message && <p className="text-xs text-muted mt-1 italic">&ldquo;{fork.message}&rdquo;</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={`/api/forks/${fork.id}`} method="POST">
                      <button
                        formAction={`/api/forks/${fork.id}`}
                        className="ui-button ui-button-primary"
                        onClick={async (e) => {
                          e.preventDefault();
                          await fetch(`/api/forks/${fork.id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "merge" }),
                          });
                          window.location.reload();
                        }}
                      >
                        Merge
                      </button>
                    </form>
                    <button
                      className="ui-button ui-button-danger"
                      onClick={async () => {
                        const note = prompt("Rejection note (optional):");
                        await fetch(`/api/forks/${fork.id}`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "reject", reviewNote: note }),
                        });
                        window.location.reload();
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
