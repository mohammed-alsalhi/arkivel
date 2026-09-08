import Link from "next/link";
import prisma from "@/lib/prisma";
import { EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { name: "asc" },
  });

  const maxCount = Math.max(...tags.map((t) => t._count.articles), 1);

  function sizeClass(count: number) {
    const ratio = count / maxCount;
    if (ratio > 0.6) return "tag-cloud-item-lg";
    if (ratio > 0.3) return "tag-cloud-item-md";
    return "tag-cloud-item-sm";
  }

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "tags" }]}>
      <PageHeader
        title="tags"
        description={`${tags.length} tags in the wiki`}
      />

      {tags.length === 0 ? (
        <EmptyState
          title="no tags yet"
          description="tags are created when you add them to a page."
          actions={<LinkButton href="/articles/new">new page</LinkButton>}
        />
      ) : (
        <div className="tag-cloud">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className={`tag-cloud-item ${sizeClass(tag._count.articles)}`}
              style={tag.color ? { borderColor: tag.color } : undefined}
            >
              {tag.name}
              <span className="text-[10px] text-muted ml-1">({tag._count.articles})</span>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

export const dynamic = "force-dynamic";
