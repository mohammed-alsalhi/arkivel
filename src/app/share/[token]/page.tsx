import { notFound } from "next/navigation";
import ArticleContent from "@/components/ArticleContent";
import TableOfContents from "@/components/TableOfContents";
import prisma from "@/lib/prisma";
import { resolveWikiLinks } from "@/lib/wikilinks";
import { formatDate } from "@/lib/utils";
import { config } from "@/lib/config";
import { Notice, Page, PageHeader } from "@/components/ui";
import { requireModule } from "@/modules/enabled";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function SharePreviewPage({ params }: Props) {
  await requireModule("share");
  const { token } = await params;

  const article = await prisma.article.findUnique({
    where: { shareToken: token },
    include: { category: true, tags: { include: { tag: true } } },
  });

  if (!article) notFound();

  const resolved = await resolveWikiLinks(article.content);

  return (
    <Page width="narrow" className="py-8">
      <Notice className="border-l-4 border-l-warning-border mb-6">
        <strong>draft preview</strong> — this is a private preview link. the page has not been published.
      </Notice>

      <PageHeader
        description={(
          <>
            From {config.name} &mdash; Last edited {formatDate(article.updatedAt)}
            {article.category && ` · ${article.category.name}`}
          </>
        )}
        title={article.title}
      />

      <TableOfContents html={resolved} />

      <ArticleContent footnotePresentation="share" html={resolved} />

      {article.tags.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border text-[12px] text-muted">
          Tags: {article.tags.map(({ tag }) => tag.name).join(", ")}
        </div>
      )}
    </Page>
  );
}
