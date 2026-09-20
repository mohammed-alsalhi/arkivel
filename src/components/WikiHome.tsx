import Link from "next/link";
import { PageFooter, PageTopbar } from "@/components/ui";
import { config } from "@/lib/config";
import { TRAIL_ROOTS, type TrailItem } from "@/lib/trail";
import { formatDate, plural } from "@/lib/utils";

const trail: TrailItem[] = [TRAIL_ROOTS.library, { label: "home" }];

async function getHomeData() {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        take: 24,
        where: { published: true, status: "published" },
        orderBy: { updatedAt: "desc" },
        include: { category: true },
      }),
      prisma.article.count({ where: { published: true, status: "published" } }),
    ]);

    return { articles, total };
  } catch {
    return { articles: [], total: 0 };
  }
}

export default async function WikiHome() {
  const { articles, total } = await getHomeData();

  return (
    <>
      <PageTopbar trail={trail} />

      <div className="focused-home">
        <header className="focused-home-header">
          <p className="focused-home-count">
            {plural(total, "page", "pages")}
          </p>
          <h1>home</h1>
          <p>{config.welcomeText}</p>
        </header>

        <section className="focused-home-index" aria-labelledby="recent-pages-heading">
          <div className="focused-home-index-heading">
            <h2 id="recent-pages-heading">recently updated</h2>
            <Link href="/articles/new">new page</Link>
          </div>

          {articles.length === 0 ? (
            <div className="focused-home-empty">
              <p>this wiki is ready for its first page.</p>
              <Link href="/articles/new">create the first page</Link>
            </div>
          ) : (
            <ol className="focused-page-list">
              {articles.map((article) => (
                <li key={article.id}>
                  <div className="focused-page-list-main">
                    <Link href={`/articles/${article.slug}`} className="focused-page-list-title">
                      {article.title}
                    </Link>
                    {article.excerpt && <p>{article.excerpt}</p>}
                  </div>
                  <div className="focused-page-list-meta">
                    {article.category && (
                      <Link href={`/categories/${article.category.slug}`}>{article.category.name}</Link>
                    )}
                    <time dateTime={article.updatedAt.toISOString()}>{formatDate(article.updatedAt)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <PageFooter trail={trail} />
    </>
  );
}

export const dynamic = "force-dynamic";
