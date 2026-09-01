import prisma from "@/lib/prisma";
import Link from "next/link";
import { DataTable, EmptyState, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // Group revisions by userId and count
  const topContributors = await prisma.articleRevision.groupBy({
    by: ["userId"],
    where: { userId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  });

  // Fetch user details
  const userIds = topContributors.map((r) => r.userId as string);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = topContributors.map((r) => ({
    user: userMap.get(r.userId as string),
    revisions: r._count.id,
  }));

  return (
    <Page>
      <PageHeader
        title="Contributor Leaderboard"
        description="Top editors by total revision count."
      />

      {rows.length === 0 ? (
        <EmptyState title="No contributions recorded yet." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th className="w-12">Rank</th>
              <th>Contributor</th>
              <th className="text-right">Revisions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.user?.id ?? i}>
                <td className="text-muted font-medium">
                  {i === 0 && <span className="text-warning">1</span>}
                  {i === 1 && <span className="text-muted">2</span>}
                  {i === 2 && <span className="text-warning">3</span>}
                  {i > 2 && <span>{i + 1}</span>}
                </td>
                <td>
                  {row.user ? (
                    <Link href={`/users/${row.user.username}`} className="text-wiki-link hover:underline">
                      {row.user.displayName || row.user.username}
                    </Link>
                  ) : (
                    <span className="text-muted italic">Anonymous</span>
                  )}
                </td>
                <td className="text-right font-medium">{row.revisions.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Page>
  );
}
