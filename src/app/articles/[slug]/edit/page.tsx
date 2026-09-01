"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { LoadingState } from "@/components/ui";
import TiptapEditor, { type TiptapEditorHandle } from "@/components/editor/TiptapEditor";
import CollaborativeEditor from "@/components/editor/CollaborativeEditor";
import TagPicker from "@/components/TagPicker";
import CategorySelect from "@/components/CategorySelect";
import InfoboxEditor from "@/components/InfoboxEditor";
import { useAdmin } from "@/components/AdminContext";
import ArticleLockGuard from "@/components/ArticleLockGuard";
import FocalPointPicker from "@/components/FocalPointPicker";
import ZenModeToggle from "@/components/editor/ZenModeToggle";
import SmartSuggestions from "@/components/editor/SmartSuggestions";
import { getSearchResults } from "@/lib/search-response";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

type CategoryItem = { id: string; name: string; slug: string; parentId: string | null; children?: CategoryItem[] };

type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string | null;
  redirectTo: string | null;
  infobox: Record<string, string> | null;
  status: string;
  isPinned: boolean;
  tags: { tag: { id: string } }[];
};

export default function EditArticlePage() {
  const isAdmin = useAdmin();
  const router = useRouter();
  const params = useParams();
  const { confirm, confirmDialog } = useConfirm();
  const { addToast } = useToast();
  const editorRef = useRef<TiptapEditorHandle>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [redirectTo, setRedirectTo] = useState("");
  const [infobox, setInfobox] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [editSummary, setEditSummary] = useState("");
  const [status, setStatus] = useState("published");
  const [isPinned, setIsPinned] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [cleanupTags, setCleanupTags] = useState<string[]>([]);
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [coverFocalX, setCoverFocalX] = useState(50);
  const [coverFocalY, setCoverFocalY] = useState(50);
  const [expiresAt, setExpiresAt] = useState("");
  const [reviewDueAt, setReviewDueAt] = useState("");
  const [metadataFields, setMetadataFields] = useState<{ name: string; label: string; type: string; options?: string; required?: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"clean" | "unsaved" | "saved">("clean");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    if (!categoryId) { setMetadataFields([]); return; }
    fetch(`/api/metadata-schemas/by-category/${categoryId}`)
      .then((r) => r.json())
      .then((d) => setMetadataFields(Array.isArray(d.fields) ? d.fields : []))
      .catch(() => setMetadataFields([]));
  }, [categoryId]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/articles?slug=${params.slug}`);
      if (!res.ok) return;
      const data = await res.json();
      const found = data.articles?.find((a: Article) => a.slug === params.slug);
      if (!found) {
        const searchRes = await fetch(`/api/search?q=${params.slug}&limit=1`);
        if (searchRes.ok) {
          const results = getSearchResults<{ id: string; title: string; slug: string }>(
            await searchRes.json()
          );
          if (results.length > 0) {
            const detailRes = await fetch(`/api/articles/${results[0].id}`);
            if (detailRes.ok) {
              const articleData = await detailRes.json();
              setArticle(articleData);
              setTitle(articleData.title);
              setSlug(articleData.slug);
              setCategoryId(articleData.categoryId || "");
              setRedirectTo(articleData.redirectTo || "");
              setInfobox(articleData.infobox || {});
              setStatus(articleData.status || "published");
              setIsPinned(articleData.isPinned || false);
              setCoverImage(articleData.coverImage || "");
              setCoverFocalX(articleData.coverFocalX ?? 50);
              setCoverFocalY(articleData.coverFocalY ?? 50);
              setExpiresAt(articleData.expiresAt ? articleData.expiresAt.slice(0, 10) : "");
              setReviewDueAt(articleData.reviewDueAt ? articleData.reviewDueAt.slice(0, 10) : "");
              setAccessPassword(articleData.accessPassword || "");
              setContentWarnings(articleData.contentWarnings || []);
              setCleanupTags(articleData.cleanupTags || []);
              setIsAbandoned(articleData.isAbandoned || false);
              setIsFeatured(articleData.isFeatured || false);
              setTagIds(articleData.tags.map((t: { tag: { id: string } }) => t.tag.id));
            }
          }
        }
        setLoading(false);
        return;
      }
      const detailRes = await fetch(`/api/articles/${found.id}`);
      if (detailRes.ok) {
        const articleData = await detailRes.json();
        setArticle(articleData);
        setTitle(articleData.title);
        setSlug(articleData.slug);
        setCategoryId(articleData.categoryId || "");
        setRedirectTo(articleData.redirectTo || "");
        setInfobox(articleData.infobox || {});
        setStatus(articleData.status || "published");
        setIsPinned(articleData.isPinned || false);
        setIsFeatured(articleData.isFeatured || false);
        setCoverImage(articleData.coverImage || "");
        setCoverFocalX(articleData.coverFocalX ?? 50);
        setCoverFocalY(articleData.coverFocalY ?? 50);
        setExpiresAt(articleData.expiresAt ? articleData.expiresAt.slice(0, 10) : "");
        setReviewDueAt(articleData.reviewDueAt ? articleData.reviewDueAt.slice(0, 10) : "");
        setContentWarnings(articleData.contentWarnings || []);
        setCleanupTags(articleData.cleanupTags || []);
        setIsAbandoned(articleData.isAbandoned || false);
        setTagIds(articleData.tags.map((t: { tag: { id: string } }) => t.tag.id));
      }
      setLoading(false);
    }
    load();
  }, [params.slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!article || !editorRef.current) return;

    setSaving(true);
    const content = editorRef.current.getHTML();
    const contentRaw = editorRef.current.getMarkdown();

    const res = await fetch(`/api/articles/${article.id}`, {
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
        redirectTo: redirectTo.trim() || null,
        infobox: Object.keys(infobox).length > 0 ? infobox : null,
        editSummary: editSummary.trim() || null,
        status,
        isPinned,
        coverImage: coverImage.trim() || null,
        coverFocalX,
        coverFocalY,
        expiresAt: expiresAt || null,
        reviewDueAt: reviewDueAt || null,
        accessPassword: accessPassword.trim() || null,
        contentWarnings,
        cleanupTags,
        isAbandoned,
        isFeatured,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      try { localStorage.removeItem(`wiki_draft_${article.id}`); } catch { /* noop */ }
      router.push(`/articles/${updated.slug}`);
    } else {
      const err = await res.json().catch(() => null);
      setSaving(false);
      addToast(err?.error || "Failed to update article", "error");
    }
  }

  async function handleAiSummary() {
    if (!editorRef.current || !article) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/ai/revision-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          oldContent: article.content,
          newContent: editorRef.current.getHTML(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setEditSummary(data.summary);
      }
    } catch { /* noop */ }
    setGeneratingSummary(false);
  }

  async function handleSuggestTags() {
    if (!editorRef.current) return;
    setSuggestingTags(true);
    const res = await fetch("/api/ai/suggest-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: editorRef.current.getHTML(), articleId: article?.id }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        const newIds = data.tags.map((t: { id: string }) => t.id).filter((id: string) => !tagIds.includes(id));
        if (newIds.length > 0) setTagIds([...tagIds, ...newIds]);
        else addToast("No new tag suggestions found (all suggested tags are already applied).", "info");
      } else {
        addToast("No tag suggestions available for this content.", "info");
      }
    }
    setSuggestingTags(false);
  }

  async function handleSuggestCategory() {
    if (!editorRef.current) return;
    setSuggestingCategory(true);
    const res = await fetch("/api/ai/suggest-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: editorRef.current.getHTML() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.suggestion) {
        setCategoryId(data.suggestion.id);
      } else {
        addToast("Could not determine a suitable category for this article.", "info");
      }
    }
    setSuggestingCategory(false);
  }

  async function handleSuggestTitle() {
    if (!editorRef.current) return;
    setSuggestingTitle(true);
    setTitleSuggestions([]);
    const res = await fetch("/api/ai/suggest-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTitle: title, content: editorRef.current.getHTML() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setTitleSuggestions(data.suggestions);
      } else {
        addToast("No title suggestions available.", "info");
      }
    }
    setSuggestingTitle(false);
  }

  function handleEditorUpdate() {
    setAutoSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (!article || !editorRef.current) return;
      try {
        const draft = { title, content: editorRef.current.getHTML(), savedAt: Date.now() };
        localStorage.setItem(`wiki_draft_${article.id}`, JSON.stringify(draft));
        setAutoSaveStatus("saved");
      } catch { /* storage may be unavailable */ }
    }, 2000);
  }

  async function handleDelete() {
    if (!article) return;
    if (!(await confirm(`Are you sure you want to delete "${article.title}"? This cannot be undone.`, { title: "Delete article", confirmLabel: "Delete", danger: true }))) return;

    setDeleting(true);
    const res = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/articles");
    } else {
      setDeleting(false);
      addToast("Failed to delete article", "error");
    }
  }

  if (!isAdmin) {
    return (
      <div className="wiki-notice">
        You must be <a href="/admin">logged in as admin</a> to edit articles.
      </div>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!article) {
    return <div className="py-8 text-center text-muted italic text-[13px]">Article not found.</div>;
  }

  return (
    <div>
      <nav className="article-tabbar" aria-label="Article sections">
        <Link href={`/articles/${article.slug}`} className="article-tab">
          Article
        </Link>
        <span className="article-tab article-tab-active">Editing</span>
        <Link href={`/articles/${article.slug}/history`} className="article-tab">
          History
        </Link>
        <Link href={`/articles/${article.slug}/discussion`} className="article-tab">
          Discussion
        </Link>
      </nav>

      {/* Edit form */}
      <div className="border border-border bg-surface px-5 py-4">
        <ArticleLockGuard articleId={article.id} isAdmin={isAdmin} />
        <h1
          className="text-[1.5rem] font-normal text-heading border-b border-border pb-1 mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Editing: {article.title}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-bold text-heading">Title:</label>
              <button type="button" onClick={handleSuggestTitle} disabled={suggestingTitle} className="h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-accent transition-colors">
                {suggestingTitle ? "…" : "AI suggest"}
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleSuggestions([]); }}
              required
              className="w-full border border-border bg-surface px-3 py-1.5 text-[14px] text-foreground focus:border-accent focus:outline-none"
            />
            {titleSuggestions.length > 0 && (
              <div className="mt-1 border border-border bg-surface">
                <p className="px-2 pt-1.5 text-[10px] text-muted font-bold uppercase">Suggestions — click to apply</p>
                {titleSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setTitle(s); setTitleSuggestions([]); }}
                    className="block w-full text-left px-3 py-1.5 text-[13px] text-foreground hover:bg-surface-hover border-t border-border"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Slug (URL path):</label>
            <div className="flex items-center gap-1 text-[13px] text-muted">
              <span>/articles/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                required
                className="flex-1 border border-border bg-surface px-3 py-1.5 text-[14px] text-foreground font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Redirect to (optional):</label>
            <div className="flex items-center gap-1 text-[13px] text-muted">
              <span>/articles/</span>
              <input
                type="text"
                value={redirectTo}
                onChange={(e) => setRedirectTo(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="Leave empty for normal article"
                className="flex-1 border border-border bg-surface px-3 py-1.5 text-[14px] text-foreground font-mono placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
            {redirectTo && (
              <p className="text-[11px] text-muted mt-1">
                Visitors to this article will be redirected to <strong>/articles/{redirectTo}</strong>
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[13px] font-bold text-heading">Category:</label>
                <button type="button" onClick={handleSuggestCategory} disabled={suggestingCategory} className="h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-accent transition-colors">
                  {suggestingCategory ? "…" : "AI suggest"}
                </button>
              </div>
              <CategorySelect value={categoryId} onChange={setCategoryId} categories={categories} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[13px] font-bold text-heading">Tags:</label>
                <button type="button" onClick={handleSuggestTags} disabled={suggestingTags} className="h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-accent transition-colors">
                  {suggestingTags ? "…" : "AI suggest"}
                </button>
              </div>
              <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />
            </div>
          </div>

          {categoryId && (
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Infobox fields:</label>
              <InfoboxEditor
                categoryId={categoryId}
                categories={categories}
                data={infobox}
                onChange={setInfobox}
              />
            </div>
          )}

          {metadataFields.length > 0 && (
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Metadata fields:</label>
              <div className="border border-border bg-surface p-3 space-y-2">
                {metadataFields.map((f) => (
                  <div key={f.name}>
                    <label className="block text-[12px] text-muted font-bold mb-0.5">
                      {f.label}{f.required && <span className="text-danger ml-0.5">*</span>}
                    </label>
                    {f.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={infobox[f.name] === "true"}
                        onChange={(e) => setInfobox({ ...infobox, [f.name]: e.target.checked ? "true" : "false" })}
                      />
                    ) : f.type === "select" ? (
                      <select
                        value={infobox[f.name] ?? ""}
                        onChange={(e) => setInfobox({ ...infobox, [f.name]: e.target.value })}
                        className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
                      >
                        <option value="">— Select —</option>
                        {(f.options ?? "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={infobox[f.name] ?? ""}
                        onChange={(e) => setInfobox({ ...infobox, [f.name]: e.target.value })}
                        required={f.required}
                        className="w-full border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-bold text-heading">Content:</label>
              <div className="flex items-center gap-2">
                {autoSaveStatus === "unsaved" && (
                  <span className="text-[11px] text-warning">Unsaved changes</span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-[11px] text-success">Draft saved</span>
                )}
                <SmartSuggestions
                  title={title}
                  getHtml={() => editorRef.current?.getHTML() ?? ""}
                />
                <ZenModeToggle />
              </div>
            </div>
            <CollaborativeEditor
              articleId={article.id}
              initialHtml={article.content}
              articleTitle={title}
              editorRef={editorRef}
              onHtmlChange={() => handleEditorUpdate()}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-border bg-surface px-3 py-1.5 text-[14px] text-foreground focus:border-accent focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                <span className="font-bold text-heading">Pin to category page</span>
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <span className="font-bold text-heading">Featured article</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Expires on:</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none"
              />
              <p className="text-[11px] text-muted mt-0.5">Auto-archives to draft when passed</p>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Review due by:</label>
              <input
                type="date"
                value={reviewDueAt}
                onChange={(e) => setReviewDueAt(e.target.value)}
                className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground focus:border-accent focus:outline-none"
              />
              <p className="text-[11px] text-muted mt-0.5">Shows in Content Schedule when overdue</p>
            </div>
          </div>

          {/* Cover image + focal point */}
          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Cover image URL:</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {coverImage && (
              <div className="mt-2">
                <label className="block text-[13px] font-bold text-heading mb-1">Focal point:</label>
                <FocalPointPicker
                  imageUrl={coverImage}
                  focalX={coverFocalX}
                  focalY={coverFocalY}
                  onChange={(x, y) => { setCoverFocalX(x); setCoverFocalY(y); }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Access password (optional):</label>
            <input
              type="text"
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] text-muted mt-0.5">Non-admin readers must enter this to view the article</p>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Content warnings:</label>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {["spoilers", "violence", "mature", "sensitive-topics", "strong-language", "medical"].map((w) => (
                <label key={w} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contentWarnings.includes(w)}
                    onChange={(e) => setContentWarnings(e.target.checked ? [...contentWarnings, w] : contentWarnings.filter((x) => x !== w))}
                  />
                  <span className="text-foreground capitalize">{w.replace("-", " ")}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Selected warnings are shown as a dismissible banner before the article</p>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Cleanup tags:</label>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {["needs-images", "needs-expansion", "needs-citations", "needs-review", "stub", "outdated"].map((t) => (
                <label key={t} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanupTags.includes(t)}
                    onChange={(e) => setCleanupTags(e.target.checked ? [...cleanupTags, t] : cleanupTags.filter((x) => x !== t))}
                  />
                  <span className="text-foreground">{t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Shown as an orange notice banner on the article page</p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAbandoned} onChange={(e) => setIsAbandoned(e.target.checked)} />
              <span className="text-[13px] font-bold text-heading">Mark as abandoned</span>
            </label>
            <p className="text-[11px] text-muted mt-0.5">Signals that this article is unmaintained and available for adoption by another editor</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-bold text-heading">Edit summary:</label>
              <button type="button" onClick={handleAiSummary} disabled={generatingSummary} className="h-5 px-1.5 text-[10px] border border-border rounded text-muted hover:text-accent transition-colors">
                {generatingSummary ? "…" : "AI summarize"}
              </button>
            </div>
            <input
              type="text"
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="Briefly describe your changes..."
              className="w-full border border-border bg-surface px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent px-4 py-1.5 text-[13px] font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-border bg-surface-hover px-4 py-1.5 text-[13px] text-foreground hover:bg-surface"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="border border-danger-border bg-surface px-4 py-1.5 text-[13px] text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete article"}
            </button>
          </div>
        </form>
      </div>
      {confirmDialog}
    </div>
  );
}
