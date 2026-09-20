"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import clsx from "clsx";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import EditorBubbleMenu from "./EditorBubbleMenu";
import ImageCaption from "./ImageCaptionExtension";
import SlashMenu, { type SlashKeyHandler } from "./SlashMenu";
import type { SlashCommandId } from "./slashCommands";
import { WikiLink } from "./WikiLinkExtension";
import styles from "./TiptapEditor.module.css";

export type TiptapEditorHandle = {
  getHTML: () => string;
  getMarkdown: () => string;
  setContent: (content: string) => void;
  focus: (position?: "start" | "end") => void;
};

export type TiptapEditorVariant = "form" | "document";

type Props = {
  content?: string;
  placeholder?: string;
  articleTitle?: string;
  onUpdate?: () => void;
  /** `form` is the framed editor with a toolbar; `document` is the bare
   *  Notion-style page where the `/` menu and selection toolbar do the work. */
  variant?: TiptapEditorVariant;
};

type ToolButtonProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

const lowlight = createLowlight(common);

function ToolButton({ label, onClick, active = false, disabled = false }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active || undefined}
      className={`border px-2 py-1 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-foreground hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  if (!response.ok) return null;
  const data = await response.json() as { url?: unknown };
  return typeof data.url === "string" ? data.url : null;
}

function getBlockValue(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("codeBlock")) return "code";
  return "paragraph";
}

const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(
  function TiptapEditor(
    { content = "", placeholder = "start writing…", onUpdate, variant = "form" },
    ref,
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    const currentContentRef = useRef(content);
    const onUpdateRef = useRef(onUpdate);
    const keyHandlerRef = useRef<SlashKeyHandler | null>(null);

    useEffect(() => {
      onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false, link: false }),
        CodeBlockLowlight.configure({ lowlight }),
        ImageCaption.configure({ inline: false }),
        Link.configure({ openOnClick: false, autolink: true }).extend({
          parseHTML() {
            return [{ tag: "a[href]:not([data-wiki-link])" }];
          },
        }),
        Placeholder.configure({
          placeholder: ({ editor: current, node }) => {
            if (node.type.name === "heading") return `heading ${node.attrs.level}`;
            if (current.isEmpty) return placeholder;
            return "type '/' for blocks";
          },
        }),
        TableKit,
        WikiLink,
      ],
      content,
      onUpdate: () => onUpdateRef.current?.(),
      editorProps: {
        // The contenteditable is the control, so it carries the role and name.
        attributes: {
          class: "tiptap max-w-none",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": "page body",
        },
        // The slash menu borrows the keyboard while it is open.
        handleKeyDown(_view, event) {
          return keyHandlerRef.current?.(event) ?? false;
        },
        handleDrop(view, event) {
          const image = Array.from(event.dataTransfer?.files ?? []).find((file) => file.type.startsWith("image/"));
          if (!image) return false;

          event.preventDefault();
          const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          uploadImage(image)
            .then((url) => {
              if (!url) return;
              const imageNode = view.state.schema.nodes.image.create({ src: url, alt: image.name });
              view.dispatch(view.state.tr.insert(position ?? view.state.doc.content.size, imageNode));
            })
            .catch(() => undefined);
          return true;
        },
        handlePaste(view, event) {
          const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
          const image = imageItem?.getAsFile();
          if (!image) return false;

          event.preventDefault();
          uploadImage(image)
            .then((url) => {
              if (!url) return;
              const imageNode = view.state.schema.nodes.image.create({ src: url, alt: image.name });
              view.dispatch(view.state.tr.replaceSelectionWith(imageNode));
            })
            .catch(() => undefined);
          return true;
        },
      },
    });

    useEffect(() => {
      if (!editor || content === currentContentRef.current) return;
      currentContentRef.current = content;
      editor.commands.setContent(content);
    }, [content, editor]);

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      getMarkdown: () => htmlToMarkdown(editor?.getHTML() ?? ""),
      setContent: (nextContent: string) => {
        currentContentRef.current = nextContent;
        editor?.commands.setContent(nextContent);
      },
      focus: (position = "start") => {
        if (!editor) return;
        // Tiptap defers its own focus to the next animation frame; focus the
        // view now so the caret leaves the title even when frames are paused.
        editor.view.focus();
        editor.commands.focus(position);
      },
    }), [editor]);

    function setBlock(value: string) {
      if (!editor) return;
      if (value === "paragraph") editor.chain().focus().setParagraph().run();
      if (value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
      if (value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
      if (value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
      if (value === "quote") editor.chain().focus().toggleBlockquote().run();
      if (value === "code") editor.chain().focus().toggleCodeBlock().run();
    }

    const editLink = useCallback(() => {
      if (!editor) return;
      const currentUrl = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("url:", currentUrl ?? "https://");
      if (url === null) return;
      if (!url.trim()) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }, [editor]);

    const insertWikiLink = useCallback(() => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      const title = window.prompt("page title:", selectedText);
      if (!title?.trim()) return;

      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "wikiLink",
          attrs: {
            title: title.trim(),
            label: selectedText && selectedText !== title.trim() ? selectedText : null,
          },
        })
        .run();
    }, [editor]);

    async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file || !editor) return;

      try {
        const url = await uploadImage(file);
        if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } finally {
        event.target.value = "";
      }
    }

    /** Replace the typed `/query` with the chosen block. */
    const runSlashCommand = useCallback((id: SlashCommandId, range: { from: number; to: number }) => {
      if (!editor) return;
      const chain = editor.chain().focus().deleteRange(range);
      switch (id) {
        case "text": chain.setParagraph().run(); break;
        case "heading1": chain.setHeading({ level: 1 }).run(); break;
        case "heading2": chain.setHeading({ level: 2 }).run(); break;
        case "heading3": chain.setHeading({ level: 3 }).run(); break;
        case "bulletList": chain.toggleBulletList().run(); break;
        case "orderedList": chain.toggleOrderedList().run(); break;
        case "quote": chain.setBlockquote().run(); break;
        case "codeBlock": chain.setCodeBlock().run(); break;
        case "divider": chain.setHorizontalRule().run(); break;
        case "table": chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
        case "image":
          chain.run();
          fileInputRef.current?.click();
          break;
        case "wikiLink":
          chain.run();
          insertWikiLink();
          break;
      }
    }, [editor, insertWikiLink]);

    const isDocument = variant === "document";

    return (
      <div
        ref={shellRef}
        className={clsx(isDocument ? "editor-document" : styles.shell)}
        data-testid="editor-shell"
        data-variant={variant}
      >
        {!isDocument && (
        <div
          className="flex flex-wrap items-center gap-1 border-b border-border bg-surface p-2"
          data-testid="editor-toolbar"
          role="toolbar"
          aria-label="editor toolbar"
        >
          <select
            value={editor ? getBlockValue(editor) : "paragraph"}
            onChange={(event) => setBlock(event.target.value)}
            disabled={!editor}
            aria-label="block style"
            className="ui-select w-auto"
          >
            <option value="paragraph">paragraph</option>
            <option value="h1">heading 1</option>
            <option value="h2">heading 2</option>
            <option value="h3">heading 3</option>
            <option value="quote">quote</option>
            <option value="code">code block</option>
          </select>

          <ToolButton label="undo" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} />
          <ToolButton label="redo" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} />
          <ToolButton label="bold" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} disabled={!editor} />
          <ToolButton label="italic" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} disabled={!editor} />
          <ToolButton label="inline code" onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")} disabled={!editor} />
          <ToolButton label="bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} disabled={!editor} />
          <ToolButton label="numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} disabled={!editor} />
          <ToolButton label="link" onClick={editLink} active={editor?.isActive("link")} disabled={!editor} />
          <ToolButton label="wiki link" onClick={insertWikiLink} disabled={!editor} />
          <ToolButton label="image" onClick={() => fileInputRef.current?.click()} disabled={!editor} />
          <ToolButton
            label="table"
            onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            active={editor?.isActive("table")}
            disabled={!editor}
          />
        </div>
        )}

        {editor?.isActive("table") && (
          <div
            className={isDocument
              ? "editor-table-controls"
              : "flex flex-wrap items-center gap-1 border-b border-border bg-surface-hover p-2"}
            role="toolbar"
            aria-label="table controls"
          >
            <ToolButton label="add row" onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolButton label="add column" onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <ToolButton label="delete row" onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolButton label="delete column" onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolButton label="delete table" onClick={() => editor.chain().focus().deleteTable().run()} />
          </div>
        )}

        <div className={isDocument ? "editor-document-canvas" : styles.canvas}>
          <EditorContent editor={editor} />
        </div>

        <EditorBubbleMenu editor={editor} onLink={editLink} onWikiLink={insertWikiLink} />
        <SlashMenu editor={editor} containerRef={shellRef} keyHandlerRef={keyHandlerRef} onRun={runSlashCommand} />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
          tabIndex={-1}
        />

      </div>
    );
  },
);

function htmlToMarkdown(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";

  const root = new DOMParser().parseFromString(html, "text/html").body;

  function serialize(node: Node): string {
    if (node.nodeType === 3) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";

    const children = () => Array.from(node.childNodes).map(serialize).join("");
    const tag = node.tagName.toLowerCase();

    if (tag === "p") return `${children().trim()}\n\n`;
    if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${children().trim()}\n\n`;
    if (tag === "strong" || tag === "b") return `**${children()}**`;
    if (tag === "em" || tag === "i") return `*${children()}*`;
    if (tag === "s" || tag === "del") return `~~${children()}~~`;
    if (tag === "br") return "\n";
    if (tag === "hr") return "---\n\n";
    if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") return `\`${children()}\``;
    if (tag === "pre") {
      const code = node.textContent?.replace(/\n$/, "") ?? "";
      const language = node.querySelector("code")?.className.match(/language-([\w-]+)/)?.[1] ?? "";
      return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    }
    if (tag === "blockquote") {
      return `${children().trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
    }
    if (tag === "a") {
      const label = children();
      const wikiTitle = node.getAttribute("data-wiki-link");
      if (wikiTitle) return label === wikiTitle ? `[[${wikiTitle}]]` : `[[${wikiTitle}|${label}]]`;
      return `[${label}](${node.getAttribute("href") ?? ""})`;
    }
    if (tag === "img") {
      const alt = node.getAttribute("alt") ?? "";
      const src = node.getAttribute("src") ?? "";
      const title = node.getAttribute("title");
      return `![${alt}](${src}${title ? ` "${title}"` : ""})`;
    }
    if (tag === "figure") {
      const image = node.querySelector("img");
      return image ? `${serialize(image)}\n\n` : `${children().trim()}\n\n`;
    }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child, index) => `${tag === "ol" ? `${index + 1}.` : "-"} ${serialize(child).trim()}`)
        .join("\n");
      return `${items}\n\n`;
    }
    if (tag === "li") return children();
    if (tag === "table") return `${node.outerHTML}\n\n`;

    return children();
  }

  return Array.from(root.childNodes)
    .map(serialize)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default TiptapEditor;
