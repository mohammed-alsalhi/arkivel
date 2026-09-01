"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";
import { Button, EmptyState, LoadingState, Page, PageHeader, Section } from "@/components/ui";
import { useConfirm } from "@/lib/useConfirm";

type Discussion = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  replies: Discussion[];
};

type ArticleInfo = {
  id: string;
  title: string;
  slug: string;
};

function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "Share your thoughts...",
  submitLabel = "Post comment",
}: {
  onSubmit: (author: string, content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit(author, content);
    setContent("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handle} className="space-y-2">
      <div>
        <label className="block text-[13px] font-bold text-heading mb-1">Name:</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Anonymous"
          className="w-full max-w-xs border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[13px] font-bold text-heading mb-1">Comment:</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          placeholder={placeholder}
          className="w-full border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-y"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={submitting || !content.trim()}>
          {submitting ? "Posting..." : submitLabel}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] text-muted hover:text-foreground pointer-coarse:py-2"
          >
            cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Comment({
  d,
  articleId,
  isAdmin,
  onDelete,
  onReply,
  depth = 0,
}: {
  d: Discussion;
  articleId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onReply: (parentId: string, author: string, content: string) => Promise<void>;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = d.replies.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border pl-3" : ""}>
      <div className="border border-border bg-surface-hover px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-bold text-heading">{d.author}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">
              {new Date(d.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {hasReplies && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="text-[11px] text-muted hover:text-foreground pointer-coarse:py-2"
              >
                {collapsed ? `show ${d.replies.length} repl${d.replies.length === 1 ? "y" : "ies"}` : "collapse"}
              </button>
            )}
            {depth < 3 && (
              <button
                onClick={() => setReplying((v) => !v)}
                className="text-[11px] text-accent hover:underline pointer-coarse:py-2"
              >
                reply
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onDelete(d.id)}
                className="text-[11px] text-danger hover:underline pointer-coarse:py-2"
              >
                delete
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-foreground whitespace-pre-wrap">
          {d.content.split(/(@[\w-]+)/g).map((part, i) =>
            /^@[\w-]+$/.test(part) ? (
              <span key={i} className="text-accent font-medium">{part}</span>
            ) : (
              part
            )
          )}
        </p>
      </div>

      {replying && (
        <div className="mt-1 ml-4 border-l-2 border-accent pl-3 pb-1">
          <CommentForm
            onSubmit={async (author, content) => {
              await onReply(d.id, author, content);
              setReplying(false);
            }}
            onCancel={() => setReplying(false)}
            placeholder={`Reply to ${d.author}...`}
            submitLabel="Post reply"
          />
        </div>
      )}

      {!collapsed && hasReplies && (
        <div className="mt-1 space-y-1">
          {d.replies.map((r) => (
            <Comment
              key={r.id}
              d={r}
              articleId={articleId}
              isAdmin={isAdmin}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscussionPage() {
  const { confirm, confirmDialog } = useConfirm();
  const isAdmin = useAdmin();
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<ArticleInfo | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/articles?slug=${slug}`);
      if (!res.ok) return;
      const data = await res.json();
      const found = data.articles?.find((a: ArticleInfo) => a.slug === slug);
      if (!found) { setLoading(false); return; }
      setArticle(found);
      const discRes = await fetch(`/api/articles/${found.id}/discussions`);
      if (discRes.ok) setDiscussions(await discRes.json());
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handlePost(author: string, content: string) {
    if (!article) return;
    const res = await fetch(`/api/articles/${article.id}/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: author.trim() || "Anonymous", content: content.trim() }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setDiscussions((prev) => [...prev, newComment]);
    }
  }

  async function handleReply(parentId: string, author: string, content: string) {
    if (!article) return;
    const res = await fetch(`/api/articles/${article.id}/discussions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: author.trim() || "Anonymous",
        content: content.trim(),
        parentId,
      }),
    });
    if (res.ok) {
      const newReply = await res.json();
      setDiscussions((prev) => insertReply(prev, parentId, newReply));
    }
  }

  function insertReply(list: Discussion[], parentId: string, reply: Discussion): Discussion[] {
    return list.map((d) => {
      if (d.id === parentId) return { ...d, replies: [...d.replies, reply] };
      return { ...d, replies: insertReply(d.replies, parentId, reply) };
    });
  }

  async function handleDelete(discussionId: string) {
    if (!article) return;
    if (!(await confirm("Delete this comment and all its replies?", { title: "Delete comment", confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(
      `/api/articles/${article.id}/discussions?discussionId=${discussionId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setDiscussions((prev) => removeComment(prev, discussionId));
    }
  }

  function removeComment(list: Discussion[], id: string): Discussion[] {
    return list
      .filter((d) => d.id !== id)
      .map((d) => ({ ...d, replies: removeComment(d.replies, id) }));
  }

  if (loading) return <LoadingState />;
  if (!article) return <div className="py-8 text-center text-muted italic text-[13px]">Article not found.</div>;

  const totalCount = (list: Discussion[]): number =>
    list.reduce((n, d) => n + 1 + totalCount(d.replies), 0);

  return (
    <div>
      <nav className="article-tabbar" aria-label="Article sections">
        <Link href={`/articles/${slug}`} className="article-tab">Article</Link>
        {isAdmin && <Link href={`/articles/${slug}/edit`} className="article-tab">Edit</Link>}
        <Link href={`/articles/${slug}/history`} className="article-tab">History</Link>
        <span className="article-tab article-tab-active">Discussion</span>
      </nav>

      <Page className="border border-border bg-surface px-5 py-4">
        <PageHeader
          title={
            <>
              Discussion: {article.title}
              {totalCount(discussions) > 0 && (
                <span className="ml-2 text-[1rem] text-muted font-normal">
                  ({totalCount(discussions)} comment{totalCount(discussions) !== 1 ? "s" : ""})
                </span>
              )}
            </>
          }
        />

        {discussions.length === 0 ? (
          <EmptyState description="No comments yet. Be the first to start a discussion." />
        ) : (
          <div className="space-y-3">
            {discussions.map((d) => (
              <Comment
                key={d.id}
                d={d}
                articleId={article.id}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onReply={handleReply}
              />
            ))}
          </div>
        )}

        <Section title="Add a comment">
          <CommentForm onSubmit={handlePost} />
        </Section>
      </Page>
      {confirmDialog}
    </div>
  );
}
