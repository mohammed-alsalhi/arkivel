"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState, Page, PageHeader } from "@/components/ui";

interface TILPost {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  user: { username: string; displayName: string | null };
  article: { title: string; slug: string } | null;
}

export default function TILPage() {
  const [posts, setPosts] = useState<TILPost[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTag, setActiveTag] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadPosts(tag = "") {
    setLoading(true);
    fetch(`/api/til${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadPosts(); }, []);

  function handleTagClick(tag: string) {
    const next = tag === activeTag ? "" : tag;
    setActiveTag(next);
    loadPosts(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSubmitting(true);
    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/til", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent.trim(), tags }),
    });
    if (res.ok) {
      setNewContent("");
      setNewTags("");
      loadPosts(activeTag);
    }
    setSubmitting(false);
  }

  function deletePost(id: string) {
    fetch(`/api/til/${id}`, { method: "DELETE" })
      .then(() => setPosts((prev) => prev.filter((p) => p.id !== id)));
  }

  // Collect all unique tags
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  return (
    <Page>
      <PageHeader
        title="Today I Learned"
        actions={
          <span className="text-xs text-muted">{total} post{total !== 1 ? "s" : ""}</span>
        }
      />

      <div>
        {/* New TIL form */}
        <form onSubmit={handleSubmit} className="border border-border rounded p-3 mb-5 bg-canvas">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value.slice(0, 280))}
            placeholder="Share something you learned today… (max 280 chars)"
            className="w-full text-sm bg-transparent resize-none outline-none"
            rows={3}
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="border border-border rounded px-2 py-0.5 text-xs bg-transparent flex-1"
            />
            <span className="text-xs text-muted">{newContent.length}/280</span>
            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="ui-button ui-button-primary"
            >
              Post
            </button>
          </div>
        </form>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`text-[11px] px-2 py-0.5 pointer-coarse:py-2 rounded border transition-colors ${
                  activeTag === tag
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border text-muted hover:border-accent/40"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : posts.length === 0 ? (
          <EmptyState title="No posts yet." />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="border border-border rounded p-3">
                <p className="text-sm">{post.content}</p>
                {post.article && (
                  <p className="text-xs text-muted mt-1">
                    →{" "}
                    <Link href={`/articles/${post.article.slug}`} className="text-wiki-link hover:underline">
                      {post.article.title}
                    </Link>
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {post.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTagClick(t)}
                      className="text-[10px] bg-surface border border-border rounded px-1.5 py-0.5 pointer-coarse:py-2 hover:border-accent/40"
                    >
                      {t}
                    </button>
                  ))}
                  <span className="text-[10px] text-muted ml-auto">
                    {post.user.displayName || post.user.username} •{" "}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-[10px] text-danger hover:underline pointer-coarse:py-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
