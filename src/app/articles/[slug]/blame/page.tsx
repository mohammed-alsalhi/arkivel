"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArticleWorkflowShell } from "@/components/ArticleWorkflowShell";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Paragraph = {
  text: string;
  revisionId: string;
  editedAt: string;
  editor: string | null;
  editSummary: string | null;
};

export default function BlamePage() {
  const params = useParams<{ slug: string }>();
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // First get the article ID from the slug
      const res = await fetch(`/api/articles?slug=${params.slug}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      const id = Array.isArray(data?.articles) ? data.articles[0]?.id : null;
      if (!id) { setLoading(false); return; }
      setArticleId(id);

      const blameRes = await fetch(`/api/articles/${id}/blame`);
      if (blameRes.ok) setParagraphs(await blameRes.json());
      setLoading(false);
    }
    load();
  }, [params.slug]);

  // A stable hue per revision, carried by a rule beside the text rather than a
  // pastel fill, so the inherited text color stays readable in both themes.
  function revisionColor(revId: string): string {
    let hash = 0;
    for (let i = 0; i < revId.length; i++) hash = (hash * 31 + revId.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    return `hsl(${hue}, 55%, 50%)`;
  }

  return (
    <ArticleWorkflowShell
      active="blame"
      description="each paragraph is colour-coded by the earliest revision that introduced it."
      slug={params.slug}
      title="blame"
    >
        {loading ? (
          <p className="text-muted text-[13px] italic">loading…</p>
        ) : paragraphs.length === 0 ? (
          <EmptyState
            title="no paragraph data"
            description="blame is built from saved revisions. edit and save the page to start tracking paragraphs."
          />
        ) : (
          <div className="space-y-1 text-[13px]">
            {paragraphs.map((p, i) => (
              <div
                key={i}
                className="flex gap-3 group"
              >
                {/* Blame metadata sidebar */}
                <div
                  className="w-40 shrink-0 border-s-[3px] bg-surface-hover ps-2 pe-2 py-1 text-[10px] leading-snug"
                  style={{ borderInlineStartColor: revisionColor(p.revisionId) }}
                >
                  <div className="font-semibold truncate">{p.editor ?? "unknown"}</div>
                  <div className="opacity-70">{formatDate(p.editedAt)}</div>
                  {p.editSummary && <div className="opacity-60 truncate italic">{p.editSummary}</div>}
                  {p.revisionId !== "current" && articleId && (
                    <Link
                      href={`/articles/${params.slug}/history#${p.revisionId}`}
                      className="underline opacity-70"
                    >
                      view revision
                    </Link>
                  )}
                </div>
                {/* Paragraph text */}
                <p className="flex-1 text-foreground leading-relaxed py-1">{p.text}</p>
              </div>
            ))}
          </div>
        )}
    </ArticleWorkflowShell>
  );
}
