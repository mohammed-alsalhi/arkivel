import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { DataTable, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TagTrendsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  // Get all tags with article counts per month (last 12 months)
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const tagArticles = await prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      articles: {
        where: { article: { status: "published", createdAt: { gte: since } } },
        select: { article: { select: { createdAt: true } } },
      },
      _count: { select: { articles: true } },
    },
    orderBy: { articles: { _count: "desc" } },
    take: 30,
  });

  // Build monthly buckets for the last 12 months
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  type TagRow = {
    id: string;
    name: string;
    slug: string;
    total: number;
    monthlyCounts: number[];
    maxCount: number;
  };

  const rows: TagRow[] = tagArticles.map((t) => {
    const monthlyCounts = months.map((m) =>
      t.articles.filter((a) => {
        const d = new Date(a.article.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === m;
      }).length
    );
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      total: t._count.articles,
      monthlyCounts,
      maxCount: Math.max(...monthlyCounts, 1),
    };
  });

  const shortMonths = months.map((m) => {
    const [y, mo] = m.split("-");
    const d = new Date(parseInt(y), parseInt(mo) - 1);
    return d.toLocaleString("en", { month: "short" });
  });

  return (
    <Page>
      <PageHeader
        title="Tag Usage Trends"
        description="New published articles per tag per month, last 12 months. Top 30 tags by total article count."
      />

      <DataTable className="text-[11px]">
          <thead>
            <tr>
              <th className="text-[12px]">Tag</th>
              <th className="text-right w-12">Total</th>
              {shortMonths.map((m, i) => (
                <th key={i} className="text-center w-8">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/tags/${row.slug}`} className="text-wiki-link hover:underline font-medium">
                    {row.name}
                  </Link>
                </td>
                <td className="text-right tabular-nums text-muted">{row.total}</td>
                {row.monthlyCounts.map((c, i) => (
                  <td key={i} className="text-center">
                    {c > 0 ? (
                      <span
                        className="inline-block rounded-sm text-[10px] font-mono"
                        style={{
                          width: "1.6rem",
                          height: "1.3rem",
                          lineHeight: "1.3rem",
                          background: `rgba(var(--color-accent-rgb, 99 102 241) / ${Math.min(1, 0.2 + (c / row.maxCount) * 0.8)})`,
                          color: c / row.maxCount > 0.5 ? "white" : "var(--color-foreground)",
                        }}
                      >
                        {c}
                      </span>
                    ) : (
                      <span className="text-muted">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
      </DataTable>
    </Page>
  );
}
