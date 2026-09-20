import Link from "next/link";
import prisma from "@/lib/prisma";
import CategoryManager from "@/components/CategoryManager";
import TagManager from "@/components/TagManager";
import { EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { plural } from "@/lib/utils";

async function getCategoryTree() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { articles: true } },
        children: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { articles: true } },
            children: {
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { articles: true } } },
            },
          },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategoryTree();
  const categoryCount = countCategoryNodes(categories);
  const articleCount = countCategoryArticles(categories);

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "spaces" }]}>
      <PageHeader
        kicker="library"
        title="spaces"
        description={
          <>
            {plural(categoryCount, "space", "spaces")} organizing {plural(articleCount, "page", "pages")}.
            select a space to browse its pages.
          </>
        }
        actions={
          <>
            <LinkButton href="/articles">all pages</LinkButton>
            <LinkButton href="/tags">tags</LinkButton>
          </>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="no spaces yet"
          description="spaces group related pages. create the first one below."
        />
      ) : (
        <div className="category-tree">
          {categories.map((cat) => (
            <CategoryTreeRow key={cat.id} category={cat} depth={0} />
          ))}
        </div>
      )}

      {/* Admin-only create form (client component) */}
      <CategoryManager />

      {/* Admin-only tag management */}
      <TagManager />
    </Page>
  );
}

type TreeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { articles: number };
  children?: TreeCategory[];
};

function countCategoryNodes(categories: TreeCategory[]): number {
  return categories.reduce((sum, category) => sum + 1 + countCategoryNodes(category.children ?? []), 0);
}

function countCategoryArticles(categories: TreeCategory[]): number {
  return categories.reduce((sum, category) => sum + category._count.articles + countCategoryArticles(category.children ?? []), 0);
}

function CategoryTreeRow({ category, depth }: { category: TreeCategory; depth: number }) {
  return (
    <>
      <div
        className="category-tree-row"
        style={{ paddingLeft: `${depth * 1.15 + 0.65}rem` }}
      >
        {depth > 0 && <span className="category-tree-depth" aria-hidden="true" />}
        <Link
          href={`/categories/${category.slug}`}
          className="category-tree-title"
        >
          {category.name}
        </Link>
        <span className="category-tree-count">
          ({plural(category._count.articles, "page", "pages")})
        </span>
        {category.description && (
          <span className="category-tree-description">
            {category.description}
          </span>
        )}
      </div>
      {category.children?.map((child) => (
        <CategoryTreeRow key={child.id} category={child} depth={depth + 1} />
      ))}
    </>
  );
}

export const dynamic = "force-dynamic";
