"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArticleEditorForm, { type ArticleEditorAutoSaveStatus } from "@/components/ArticleEditorForm";
import { useAdmin } from "@/components/AdminContext";
import { useArticleTrail } from "@/components/ArticleTrailContext";
import { LoadingState, Page } from "@/components/ui";
import type { TiptapEditorHandle } from "@/components/editor/TiptapEditor";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryItem[];
};

type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string | null;
  status: string;
  isPinned: boolean;
  updatedAt?: string;
  tags: { tag: { id: string } }[];
};

type ArticleDraft = {
  title?: string;
  slug?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: string;
  isPinned?: boolean;
  editSummary?: string;
  savedAt?: number;
};

export default function EditArticlePage() {
  const isAdmin = useAdmin();
  const router = useRouter();
  const params = useParams();
  const { trail } = useArticleTrail("edit");
  const editorRef = useRef<TiptapEditorHandle>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [editSummary, setEditSummary] = useState("");
  const [status, setStatus] = useState("published");
  const [isPinned, setIsPinned] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<ArticleEditorAutoSaveStatus>("clean");

  const routeSlug = typeof params.slug === "string" ? params.slug : "";

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!routeSlug) return;

    let cancelled = false;

    async function loadArticle() {
      try {
        const listResponse = await fetch(`/api/articles?slug=${encodeURIComponent(routeSlug)}&limit=1`);
        if (!listResponse.ok) return;

        const list = await listResponse.json();
        const match = Array.isArray(list.articles)
          ? list.articles.find((candidate: Article) => candidate.slug === routeSlug)
          : null;
        if (!match) return;

        const detailResponse = await fetch(`/api/articles/${match.id}`);
        if (!detailResponse.ok) return;

        const articleData = await detailResponse.json() as Article;
        if (cancelled) return;

        let draft: ArticleDraft | null = null;
        try {
          const raw = localStorage.getItem(`wiki_draft_${articleData.id}`);
          if (raw) {
            const candidate = JSON.parse(raw) as ArticleDraft;
            const serverUpdatedAt = articleData.updatedAt ? Date.parse(articleData.updatedAt) : 0;
            if ((candidate.savedAt ?? 0) > serverUpdatedAt) draft = candidate;
          }
        } catch {
          localStorage.removeItem(`wiki_draft_${articleData.id}`);
        }

        setArticle(articleData);
        setTitle(draft?.title ?? articleData.title);
        setSlug(draft?.slug ?? articleData.slug);
        setInitialContent(draft?.content ?? articleData.content);
        setCategoryId(draft?.categoryId ?? articleData.categoryId ?? "");
        setTagIds(draft?.tagIds ?? articleData.tags.map(({ tag }) => tag.id));
        setStatus(draft?.status ?? articleData.status ?? "published");
        setIsPinned(draft?.isPinned ?? Boolean(articleData.isPinned));
        setEditSummary(draft?.editSummary ?? "");
        setAutoSaveStatus(draft ? "restored" : "clean");
        setDraftReady(true);
      } catch {
        // The loading state below resolves to the existing not-found view.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [routeSlug]);

  useEffect(() => {
    if (!article || !draftReady) return;

    const pendingTimer = window.setTimeout(() => setAutoSaveStatus("unsaved"), 0);
    const timer = window.setTimeout(() => {
      try {
        const draft: ArticleDraft = {
          title,
          slug,
          content: editorRef.current?.getHTML() ?? initialContent,
          categoryId,
          tagIds,
          status,
          isPinned,
          editSummary,
          savedAt: Date.now(),
        };
        localStorage.setItem(`wiki_draft_${article.id}`, JSON.stringify(draft));
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("unsaved");
      }
    }, 1000);

    return () => {
      window.clearTimeout(pendingTimer);
      window.clearTimeout(timer);
    };
  }, [article, categoryId, draftReady, editSummary, editorRevision, initialContent, isPinned, slug, status, tagIds, title]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!article || !editorRef.current || !title.trim() || !slug.trim()) return;

    setSaving(true);
    const content = editorRef.current.getHTML();
    const contentRaw = editorRef.current.getMarkdown();

    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content,
          contentRaw: contentRaw || null,
          excerpt: content.replace(/<[^>]*>/g, "").substring(0, 200),
          categoryId: categoryId || null,
          tagIds,
          editSummary: editSummary.trim() || null,
          status,
          isPinned,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "failed to update article");
      }

      const updated = await response.json();
      localStorage.removeItem(`wiki_draft_${article.id}`);
      router.push(`/articles/${updated.slug}`);
    } catch (error) {
      setSaving(false);
      window.alert(error instanceof Error ? error.message : "failed to update article");
    }
  }

  async function handleDelete() {
    if (!article || !window.confirm(`delete "${article.title}"? this cannot be undone.`)) return;

    setDeleting(true);
    const response = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
    if (response.ok) {
      localStorage.removeItem(`wiki_draft_${article.id}`);
      router.push("/articles");
      return;
    }

    setDeleting(false);
    window.alert("failed to delete article");
  }

  if (!isAdmin) {
    return (
      <Page trail={trail} footer={false}>
        <div className="wiki-notice">
          you must be <a href="/admin">logged in as admin</a> to edit articles.
        </div>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page trail={trail} footer={false}>
        <LoadingState label="loading…" />
      </Page>
    );
  }

  if (!article) {
    return (
      <Page trail={trail} footer={false}>
        <LoadingState label="article not found." />
      </Page>
    );
  }

  return (
      <ArticleEditorForm
        heading={<>editing: {article.title}</>}
        trail={trail}
        articleLinks={{ article: `/articles/${article.slug}`, history: `/articles/${article.slug}/history` }}
        onSubmit={handleSubmit}
        title={title}
        onTitleChange={setTitle}
        slugField={{
          value: slug,
          onChange: (value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "-")),
        }}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        tagIds={tagIds}
        onTagChange={setTagIds}
        editorRef={editorRef}
        initialContent={initialContent}
        onEditorUpdate={() => setEditorRevision((revision) => revision + 1)}
        autoSaveStatus={autoSaveStatus}
        status={status}
        onStatusChange={setStatus}
        isPinned={isPinned}
        onPinnedChange={setIsPinned}
        editSummaryField={{ value: editSummary, onChange: setEditSummary }}
        saving={saving}
        submitLabel="save changes"
        savingLabel="saving…"
        onCancel={() => router.back()}
        deleteAction={{ deleting, onDelete: handleDelete }}
      />
  );
}
