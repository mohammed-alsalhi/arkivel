import Link from "next/link";
import prisma from "@/lib/prisma";
import { TRAIL_ROOTS } from "@/lib/trail";
import { formatDate, plural } from "@/lib/utils";
import { notFound } from "next/navigation";
import { DataTable, EmptyState, Page, PageHeader, Section } from "@/components/ui";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Fetch contribution history (recent revisions by this user)
  const revisions = await prisma.articleRevision.findMany({
    where: {
      userId: user.id,
      article: { published: true, status: "published" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      article: { select: { id: true, title: true, slug: true } },
    },
  });

  // Fetch articles created by this user
  const articles = await prisma.article.findMany({
    where: { userId: user.id, published: true, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  });

  const displayName = user.displayName || user.username;

  return (
    <Page trail={[TRAIL_ROOTS.people, { label: displayName }]}>
      <PageHeader kicker="member" title={displayName} />

      {/* User info */}
      <div className="wiki-portal max-w-lg mb-4">
        <div className="wiki-portal-header">user information</div>
        <div className="wiki-portal-body">
          <DataTable>
            <tbody>
              <tr>
                <td className="text-muted font-bold">username</td>
                <td>{user.username}</td>
              </tr>
              <tr>
                <td className="text-muted font-bold">display name</td>
                <td>{displayName}</td>
              </tr>
              <tr>
                <td className="text-muted font-bold">role</td>
                <td className="text-muted">
                  {user.role}
                </td>
              </tr>
              <tr>
                <td className="text-muted font-bold">member since</td>
                <td>{formatDate(user.createdAt)}</td>
              </tr>
              <tr>
                <td className="text-muted font-bold">contributions</td>
                <td>
                  {plural(revisions.length, "edit", "edits")},{" "}
                  {plural(articles.length, "page", "pages")} created
                </td>
              </tr>
            </tbody>
          </DataTable>
        </div>
      </div>

      {/* Articles created */}
      {articles.length > 0 && (
        <Section title="pages created" className="mb-4">
          <ul className="text-[13px] space-y-1">
            {articles.map((article) => (
              <li key={article.id}>
                <Link href={`/articles/${article.slug}`} className="font-medium">
                  {article.title}
                </Link>
                {article.category && (
                  <span className="text-muted text-[12px] ml-1">
                    ({article.category.name})
                  </span>
                )}
                <span className="text-muted text-[11px] ml-2">
                  {formatDate(article.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recent edits */}
      {revisions.length > 0 && (
        <Section title="recent edits" className="mb-4">
          <ul className="text-[13px] space-y-1">
            {revisions.map((rev) => (
              <li key={rev.id}>
                <span className="text-muted text-[11px]">
                  {formatDate(rev.createdAt)}
                </span>
                {" "}
                {rev.article ? (
                  <Link href={`/articles/${rev.article.slug}`} className="font-medium">
                    {rev.article.title}
                  </Link>
                ) : (
                  <span className="text-muted italic">(deleted page)</span>
                )}
                {rev.editSummary && (
                  <span className="text-muted text-[12px] ml-1 italic">
                    &mdash; {rev.editSummary}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {articles.length === 0 && revisions.length === 0 && (
        <EmptyState description="this member has not made any contributions yet." />
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
