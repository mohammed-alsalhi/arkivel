import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { computeQualityScore } from "@/app/api/articles/[id]/quality-score/route";
import { DataTable, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminQualityPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/login");

  const articles = await prisma.article.findMany({
    where: { status: "published" },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const scored = articles
    .map((a) => ({ ...a, quality: computeQualityScore(a) }))
    .sort((a, b) => a.quality.score - b.quality.score); // worst first

  const colorMap: Record<string, string> = {
    Poor: "bg-danger-soft text-danger",
    Fair: "bg-warning-soft text-warning",
    Good: "bg-info-soft text-info",
    Excellent: "bg-success-soft text-success",
  };

  return (
    <Page>
      <PageHeader
        kicker={<Link href="/admin" className="hover:text-foreground">Admin</Link>}
        title="Article Quality"
        description={`${scored.length} published articles sorted by quality score (worst first). Score is 0–100 based on word count, links, images, freshness, and excerpt.`}
      />

      <DataTable>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th className="text-center">Score</th>
            <th className="text-right">Words</th>
            <th className="text-right">Links</th>
            <th className="text-right">Images</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {scored.map((a) => {
            const wc = a.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
            const links = (a.content.match(/data-wiki-link=/g) || []).length;
            const images = (a.content.match(/<img/g) || []).length;
            return (
              <tr key={a.id}>
                <td>
                  <Link href={`/articles/${a.slug}`} className="hover:underline font-medium">
                    {a.title}
                  </Link>
                </td>
                <td className="text-muted-foreground text-xs">
                  {a.category?.name ?? "—"}
                </td>
                <td className="text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${colorMap[a.quality.label]}`}>
                    {a.quality.score} · {a.quality.label}
                  </span>
                </td>
                <td className="text-right tabular-nums text-xs">{wc}</td>
                <td className="text-right tabular-nums text-xs">{links}</td>
                <td className="text-right tabular-nums text-xs">{images}</td>
                <td>
                  <Link href={`/articles/${a.slug}/edit`} className="text-xs text-accent hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </Page>
  );
}
