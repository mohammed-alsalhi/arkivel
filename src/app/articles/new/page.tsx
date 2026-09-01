"use client";

import { useRef, useState, useEffect, useCallback, Suspense, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TiptapEditor, { type TiptapEditorHandle } from "@/components/editor/TiptapEditor";
import TagPicker from "@/components/TagPicker";
import CategorySelect from "@/components/CategorySelect";
import InfoboxEditor from "@/components/InfoboxEditor";
import TemplatePicker from "@/components/TemplatePicker";
import { useAdmin } from "@/components/AdminContext";
import type { ArticleTemplate } from "@/lib/templates";
import { getCategoryTemplate } from "@/lib/category-templates";
import SmartSuggestions from "@/components/editor/SmartSuggestions";
import { useToast } from "@/components/Toast";

type CategoryItem = { id: string; name: string; slug: string; parentId: string | null; children?: CategoryItem[] };

function flattenCategories(cats: CategoryItem[]): CategoryItem[] {
  const flat: CategoryItem[] = [];
  function walk(list: CategoryItem[]) {
    for (const c of list) {
      flat.push(c);
      if (c.children) walk(c.children);
    }
  }
  walk(cats);
  return flat;
}

type SimilarArticle = {
  id: string;
  title: string;
  slug: string;
  isDisambiguation: boolean;
};

/** Reads ?from=synthesize or ?from=url-import and pre-fills the editor from sessionStorage. Must be wrapped in Suspense. */
function DraftLoader({
  editorRef,
  setTitle,
}: {
  editorRef: RefObject<TiptapEditorHandle | null>;
  setTitle: (t: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const from = searchParams.get("from");
    const key =
      from === "synthesize" ? "wiki_synthesize_draft" :
      from === "url-import" ? "wiki_url_import_draft" :
      null;
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title: string; html: string };
      sessionStorage.removeItem(key);
      if (draft.title) setTitle(draft.title);
      if (draft.html) setTimeout(() => editorRef.current?.setContent(draft.html), 100);
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  return null;
}

export default function NewArticlePage() {
  const isAdmin = useAdmin();
  const router = useRouter();
  const { addToast } = useToast();
  const editorRef = useRef<TiptapEditorHandle>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("blank");
  const [isDisambiguation, setIsDisambiguation] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<SimilarArticle[]>([]);
  const [infobox, setInfobox] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [autofillTemplate, setAutofillTemplate] = useState("concept");
  const [autofillLoading, setAutofillLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  // Debounced similar title check
  const checkSimilar = useCallback(async (t: string) => {
    if (t.trim().length < 3) {
      setSimilarArticles([]);
      return;
    }
    try {
      const res = await fetch(`/api/articles/similar?title=${encodeURIComponent(t.trim())}`);
      if (res.ok) setSimilarArticles(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => checkSimilar(title), 500);
    return () => clearTimeout(timeout);
  }, [title, checkSimilar]);

  async function handleAutofill() {
    if (!title.trim() || autofillLoading) return;
    setAutofillLoading(true);
    try {
      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), template: autofillTemplate }),
      });
      if (res.ok) {
        const { html } = await res.json();
        editorRef.current?.setContent(html);
      }
    } catch { /* ignore */ }
    setAutofillLoading(false);
  }

  function handleTemplateSelect(template: ArticleTemplate) {
    setTemplateId(template.id);
    if (template.content && editorRef.current) {
      editorRef.current.setContent(template.content);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !editorRef.current) return;

    setSaving(true);
    const content = editorRef.current.getHTML();
    const contentRaw = editorRef.current.getMarkdown();

    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        content,
        contentRaw: contentRaw || null,
        categoryId: categoryId || null,
        tagIds,
        isDisambiguation,
        infobox: Object.keys(infobox).length > 0 ? infobox : null,
      }),
    });

    if (res.ok) {
      const article = await res.json();
      router.push(`/articles/${article.slug}`);
    } else {
      setSaving(false);
      addToast("Failed to create article", "error");
    }
  }

  if (!isAdmin) {
    return (
      <div className="wiki-notice">
        You must be <a href="/admin">logged in as admin</a> to create articles.
      </div>
    );
  }

  return (
    <div>
      <Suspense>
        <DraftLoader editorRef={editorRef} setTitle={setTitle} />
      </Suspense>

      <nav className="article-tabbar" aria-label="Article sections">
        <span className="article-tab article-tab-active">Creating</span>
      </nav>

      {/* Edit form in bordered area */}
      <div className="border border-border bg-surface px-5 py-4">
        <h1
          className="text-[1.5rem] font-normal text-heading border-b border-border pb-1 mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Create new article
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              required
              className="w-full border border-border bg-surface px-3 py-1.5 text-[14px] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* AI Auto-fill */}
          {title.trim().length >= 3 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-muted">AI auto-fill as:</span>
              <select
                value={autofillTemplate}
                onChange={(e) => setAutofillTemplate(e.target.value)}
                className="border border-border bg-surface px-2 py-1 text-[12px] focus:border-accent focus:outline-none"
              >
                <option value="person">Person</option>
                <option value="event">Event</option>
                <option value="place">Place</option>
                <option value="concept">Concept</option>
                <option value="organization">Organization</option>
                <option value="product">Product / Technology</option>
              </select>
              <button
                type="button"
                onClick={handleAutofill}
                disabled={autofillLoading}
                className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {autofillLoading ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Auto-fill
                  </>
                )}
              </button>
            </div>
          )}

          {/* Similar articles warning */}
          {similarArticles.length > 0 && (
            <div className="wiki-disambiguation-notice">
              <strong>Note:</strong> Similar articles already exist:{" "}
              {similarArticles.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link href={`/articles/${a.slug}`}>{a.title}</Link>
                </span>
              ))}
              <label className="flex items-center gap-2 mt-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={isDisambiguation}
                  onChange={(e) => setIsDisambiguation(e.target.checked)}
                />
                Create this as a disambiguation page
              </label>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Category:</label>
              <CategorySelect value={categoryId} onChange={(id) => {
                setCategoryId(id);
                // Auto-apply category template if user hasn't manually selected one
                if (id && templateId === "blank" && editorRef.current) {
                  const cat = flattenCategories(categories).find(c => c.id === id);
                  if (cat) {
                    const tmpl = getCategoryTemplate(cat.slug, categories);
                    if (tmpl) {
                      setTemplateId(tmpl.id);
                      editorRef.current.setContent(tmpl.content);
                    }
                  }
                }
              }} categories={categories} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-heading mb-1">Tags:</label>
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

          <div>
            <label className="block text-[13px] font-bold text-heading mb-1">Template:</label>
            <TemplatePicker selected={templateId} onSelect={handleTemplateSelect} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[13px] font-bold text-heading">Content:</label>
              <SmartSuggestions
                title={title}
                getHtml={() => editorRef.current?.getHTML() ?? ""}
              />
            </div>
            <TiptapEditor
              ref={editorRef}
              placeholder="Begin writing your article... Use [[Article Name]] to create wiki links."
              articleTitle={title}
            />
          </div>

          <div className="flex gap-2 border-t border-border pt-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent px-4 py-1.5 text-[13px] font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish article"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-border bg-surface-hover px-4 py-1.5 text-[13px] text-foreground hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
