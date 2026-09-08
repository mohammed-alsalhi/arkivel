"use client";

import Link from "next/link";
import { useEffect, useRef, type FormEventHandler, type ReactNode, type RefObject } from "react";
import CategorySelect, { type CategoryOption } from "@/components/CategorySelect";
import { useSkin } from "@/components/SkinContext";
import TagPicker from "@/components/TagPicker";
import TiptapEditor, { type TiptapEditorHandle } from "@/components/editor/TiptapEditor";
import { Button, Field, Input, LinkButton, Page, PageHeader, Select, ToggleSwitch } from "@/components/ui";
import type { TrailItem } from "@/lib/trail";

export type ArticleEditorAutoSaveStatus = "clean" | "unsaved" | "saved" | "restored";

type ArticleEditorFormProps = {
  /** The wiki skin's page heading (`new page`, `editing: …`). */
  heading: ReactNode;
  /** The page's trail; the form renders the page chrome itself so folio can
   *  put save and cancel in the top bar. */
  trail: TrailItem[];
  /** Existing-page links (edit only): the article and its history. */
  articleLinks?: { article: string; history: string };
  onSubmit: FormEventHandler<HTMLFormElement>;
  title: string;
  onTitleChange: (title: string) => void;
  titlePlaceholder?: string;
  slugField?: {
    value: string;
    onChange: (slug: string) => void;
  };
  categories: CategoryOption[];
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  tagIds: string[];
  onTagChange: (tagIds: string[]) => void;
  editorRef: RefObject<TiptapEditorHandle | null>;
  initialContent: string;
  onEditorUpdate: () => void;
  autoSaveStatus: ArticleEditorAutoSaveStatus;
  status: string;
  onStatusChange: (status: string) => void;
  isPinned: boolean;
  onPinnedChange: (isPinned: boolean) => void;
  editSummaryField?: {
    value: string;
    onChange: (summary: string) => void;
  };
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  onCancel: () => void;
  deleteAction?: {
    deleting: boolean;
    onDelete: () => void | Promise<void>;
  };
};

const AUTOSAVE_COPY: Record<ArticleEditorAutoSaveStatus, string> = {
  clean: "",
  restored: "draft restored",
  unsaved: "saving draft…",
  saved: "draft saved",
};

/** `⌘S` / `Ctrl+S` submits the form instead of opening the browser's save dialog. */
function useSaveShortcut(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formRef]);
}

export default function ArticleEditorForm(props: ArticleEditorFormProps) {
  const skin = useSkin();
  return skin === "folio" ? <DocumentEditor {...props} /> : <FormEditor {...props} />;
}

/* ── wiki: the framed form ── */

function FormEditor({
  heading,
  trail,
  articleLinks,
  onSubmit,
  title,
  onTitleChange,
  titlePlaceholder,
  slugField,
  categories,
  categoryId,
  onCategoryChange,
  tagIds,
  onTagChange,
  editorRef,
  initialContent,
  onEditorUpdate,
  autoSaveStatus,
  status,
  onStatusChange,
  isPinned,
  onPinnedChange,
  editSummaryField,
  saving,
  submitLabel,
  savingLabel,
  onCancel,
  deleteAction,
}: ArticleEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef);

  return (
    <Page trail={trail} footer={false}>
      {articleLinks && (
        <nav className="article-tabbar" aria-label="page sections">
          <Link href={articleLinks.article} className="article-tab">page</Link>
          <span aria-current="page" className="article-tab article-tab-active">edit</span>
          <Link href={articleLinks.history} className="article-tab">history</Link>
        </nav>
      )}

      <PageHeader title={heading} />

      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <Field label="title" htmlFor="article-title">
          <Input
            id="article-title"
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
            required
          />
        </Field>

        {slugField ? (
          <Field label="slug (url path)" htmlFor="article-slug">
            <div className="flex items-center gap-1 text-[13px] text-muted">
              <span>/articles/</span>
              <Input
                id="article-slug"
                type="text"
                value={slugField.value}
                onChange={(event) => slugField.onChange(event.target.value)}
                required
                className="flex-1 font-mono"
              />
            </div>
          </Field>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Field htmlFor="article-category" label="space">
            <CategorySelect id="article-category" value={categoryId} onChange={onCategoryChange} categories={categories} />
          </Field>
          <Field label="tags">
            <TagPicker selectedTagIds={tagIds} onChange={onTagChange} />
          </Field>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="ui-label">content</span>
            <span className="text-[11px] text-muted" aria-live="polite">
              {AUTOSAVE_COPY[autoSaveStatus]}
            </span>
          </div>
          <TiptapEditor
            ref={editorRef}
            content={initialContent}
            placeholder="begin writing… use [[Page Name]] to create wiki links."
            articleTitle={title}
            onUpdate={onEditorUpdate}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="status" htmlFor="article-status">
            <Select
              id="article-status"
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="published">published</option>
            </Select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-[13px]">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(event) => onPinnedChange(event.target.checked)}
            />
            <span className="font-bold text-heading">pin to space page</span>
          </label>
        </div>

        {editSummaryField ? (
          <Field label="edit summary" htmlFor="edit-summary">
            <Input
              id="edit-summary"
              type="text"
              value={editSummaryField.value}
              onChange={(event) => editSummaryField.onChange(event.target.value)}
              placeholder="briefly describe your changes…"
            />
          </Field>
        ) : null}

        <div
          className={deleteAction
            ? "flex items-center justify-between border-t border-border pt-3"
            : "flex gap-2 border-t border-border pt-3"}
        >
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? savingLabel : submitLabel}
            </Button>
            <Button onClick={onCancel}>cancel</Button>
          </div>
          {deleteAction ? (
            <Button variant="danger" onClick={deleteAction.onDelete} disabled={deleteAction.deleting}>
              {deleteAction.deleting ? "deleting…" : "delete page"}
            </Button>
          ) : null}
        </div>
      </form>
    </Page>
  );
}

/* ── folio: the page is the editor ── */

function DocumentEditor({
  trail,
  articleLinks,
  onSubmit,
  title,
  onTitleChange,
  slugField,
  categories,
  categoryId,
  onCategoryChange,
  tagIds,
  onTagChange,
  editorRef,
  initialContent,
  onEditorUpdate,
  autoSaveStatus,
  status,
  onStatusChange,
  isPinned,
  onPinnedChange,
  editSummaryField,
  saving,
  submitLabel,
  savingLabel,
  onCancel,
  deleteAction,
}: ArticleEditorFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useSaveShortcut(formRef);

  // The title is a textarea that grows with its text, so a long title wraps like a heading.
  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [title]);

  const formId = "article-document-form";

  return (
    <Page
      trail={trail}
      footer={false}
      width="full"
      className="editor-page"
      chromeActions={
        <>
          <span className="editor-autosave" aria-live="polite">{AUTOSAVE_COPY[autoSaveStatus]}</span>
          {articleLinks && <LinkButton href={articleLinks.history}>history</LinkButton>}
          <Button onClick={onCancel}>cancel</Button>
          <Button type="submit" form={formId} variant="primary" disabled={saving}>
            {saving ? savingLabel : submitLabel}
          </Button>
        </>
      }
    >
      <form ref={formRef} id={formId} onSubmit={onSubmit} className="editor-document-page">
        <textarea
          ref={titleRef}
          id="article-title"
          className="editor-document-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value.replace(/\n/g, " "))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editorRef.current?.focus("start");
            }
          }}
          placeholder="untitled"
          aria-label="page title"
          rows={1}
          required
          autoComplete="off"
          spellCheck
        />

        <dl className="editor-props" aria-label="page properties">
          <div className="editor-prop">
            <dt><label htmlFor="article-category">space</label></dt>
            <dd><CategorySelect id="article-category" value={categoryId} onChange={onCategoryChange} categories={categories} /></dd>
          </div>
          <div className="editor-prop">
            <dt id="article-tags-label">tags</dt>
            <dd>
              <div role="group" aria-labelledby="article-tags-label">
                <TagPicker selectedTagIds={tagIds} onChange={onTagChange} />
              </div>
            </dd>
          </div>
          <div className="editor-prop">
            <dt><label htmlFor="article-status">status</label></dt>
            <dd>
              <Select id="article-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="published">published</option>
              </Select>
            </dd>
          </div>
          <div className="editor-prop">
            <dt>pinned</dt>
            <dd className="editor-prop-toggle">
              <ToggleSwitch
                checked={isPinned}
                onClick={() => onPinnedChange(!isPinned)}
                aria-label="pin to the space page"
              />
              <span>{isPinned ? "pinned to the space page" : "not pinned"}</span>
            </dd>
          </div>
          {slugField && (
            <div className="editor-prop">
              <dt><label htmlFor="article-slug">url</label></dt>
              <dd className="editor-prop-slug">
                <span>/articles/</span>
                <Input
                  id="article-slug"
                  type="text"
                  value={slugField.value}
                  onChange={(event) => slugField.onChange(event.target.value)}
                  required
                  className="font-mono"
                />
              </dd>
            </div>
          )}
          {editSummaryField && (
            <div className="editor-prop">
              <dt><label htmlFor="edit-summary">edit summary</label></dt>
              <dd>
                <Input
                  id="edit-summary"
                  type="text"
                  value={editSummaryField.value}
                  onChange={(event) => editSummaryField.onChange(event.target.value)}
                  placeholder="what changed?"
                />
              </dd>
            </div>
          )}
        </dl>

        <TiptapEditor
          ref={editorRef}
          variant="document"
          content={initialContent}
          placeholder="write, or type '/' for blocks and [[ for page links"
          articleTitle={title}
          onUpdate={onEditorUpdate}
        />

        <div className="editor-document-foot">
          <span className="editor-document-hint">
            <kbd>⌘S</kbd> saves · <kbd>/</kbd> inserts a block · select text to format
          </span>
          {deleteAction && (
            <button
              type="button"
              className="editor-document-delete"
              onClick={deleteAction.onDelete}
              disabled={deleteAction.deleting}
            >
              {deleteAction.deleting ? "deleting…" : "delete page"}
            </button>
          )}
        </div>
      </form>
    </Page>
  );
}
