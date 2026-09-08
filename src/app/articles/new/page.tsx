"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArticleEditorForm, { type ArticleEditorAutoSaveStatus } from "@/components/ArticleEditorForm";
import { useAdmin } from "@/components/AdminContext";
import type { TiptapEditorHandle } from "@/components/editor/TiptapEditor";
import { Page } from "@/components/ui";
import { TRAIL_ROOTS, type TrailItem } from "@/lib/trail";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryItem[];
};

type NewArticleDraft = {
  title?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: string;
  isPinned?: boolean;
  savedAt?: number;
};

const DRAFT_KEY = "wiki_draft_new";

const NEW_PAGE_TRAIL: TrailItem[] = [
  TRAIL_ROOTS.library,
  { label: "all pages", href: "/articles" },
  { label: "new page" },
];

export default function NewArticlePage() {
  const isAdmin = useAdmin();
  const router = useRouter();
  const editorRef = useRef<TiptapEditorHandle>(null);
  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState("published");
  const [isPinned, setIsPinned] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<ArticleEditorAutoSaveStatus>("clean");

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as NewArticleDraft;
          setTitle(draft.title ?? "");
          setInitialContent(draft.content ?? "");
          setCategoryId(draft.categoryId ?? "");
          setTagIds(Array.isArray(draft.tagIds) ? draft.tagIds : []);
          setStatus(draft.status ?? "published");
          setIsPinned(Boolean(draft.isPinned));
          setAutoSaveStatus("restored");
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    const pendingTimer = window.setTimeout(() => setAutoSaveStatus("unsaved"), 0);
    const timer = window.setTimeout(() => {
      const content = editorRef.current?.getHTML() ?? initialContent;
      const hasDraft = Boolean(
        title.trim()
        || content.replace(/<[^>]*>/g, "").trim()
        || categoryId
        || tagIds.length
        || status !== "published"
        || isPinned,
      );

      try {
        if (!hasDraft) {
          localStorage.removeItem(DRAFT_KEY);
          setAutoSaveStatus("clean");
          return;
        }

        const draft: NewArticleDraft = {
          title,
          content,
          categoryId,
          tagIds,
          status,
          isPinned,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("unsaved");
      }
    }, 1000);

    return () => {
      window.clearTimeout(pendingTimer);
      window.clearTimeout(timer);
    };
  }, [categoryId, draftReady, editorRevision, initialContent, isPinned, status, tagIds, title]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !editorRef.current) return;

    setSaving(true);
    const content = editorRef.current.getHTML();
    const contentRaw = editorRef.current.getMarkdown();

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          contentRaw: contentRaw || null,
          categoryId: categoryId || null,
          tagIds,
          status,
          isPinned,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "failed to create article");
      }

      const article = await response.json();
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/articles/${article.slug}`);
    } catch (error) {
      setSaving(false);
      window.alert(error instanceof Error ? error.message : "failed to create article");
    }
  }

  if (!isAdmin) {
    return (
      <Page trail={NEW_PAGE_TRAIL} footer={false}>
        <div className="wiki-notice">
          you must be <a href="/admin">logged in as admin</a> to create articles.
        </div>
      </Page>
    );
  }

  return (
      <ArticleEditorForm
        heading="new page"
        trail={NEW_PAGE_TRAIL}
        onSubmit={handleSubmit}
        title={title}
        onTitleChange={setTitle}
        titlePlaceholder="page title…"
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
        saving={saving}
        submitLabel="create page"
        savingLabel="saving…"
        onCancel={() => router.back()}
      />
  );
}
