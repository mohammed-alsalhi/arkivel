"use client";

import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageCaption from "@/components/editor/ImageCaptionExtension";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { marked } from "marked";
import { DOMParser as ProseMirrorDOMParser, Slice } from "@tiptap/pm/model";
import { WikiLink } from "./WikiLinkExtension";
import { PotentialLink } from "./PotentialLinkExtension";
import { FootnoteRef } from "./FootnoteExtension";
import { SlashCommandExtension, type SnippetItem, makeGetSuggestionItems } from "./SlashCommandExtension";
import SlashCommandMenu, { type SlashCommandMenuRef } from "./SlashCommandMenu";
import { CollapsibleBlock } from "./CollapsibleBlockExtension";
import { InlineComment } from "./InlineCommentExtension";
import { MermaidBlock } from "./MermaidExtension";
import { InlineMath, BlockMath } from "./KaTeXExtension";
import { DataTable } from "./DataTableExtension";
import { DecisionTree } from "./DecisionTreeExtension";
import { FindReplace } from "./FindReplaceExtension";
import FindReplacePanel from "./FindReplacePanel";
import { PullQuote } from "./PullQuoteExtension";
import { SmartTypography } from "./SmartTypographyExtension";
import { ClaimMarkExtension } from "./ClaimMarkExtension";
import { CalloutBlock } from "./CalloutBlockExtension";
import { QueryBlock } from "./QueryBlockExtension";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Highlight from "@tiptap/extension-highlight";
import EditorToolbar from "./EditorToolbar";
import WikiLinkSuggester from "./WikiLinkSuggester";
import LinkBubble from "./LinkBubble";
import WritingSessionGoal from "./WritingSessionGoal";
import {
  EditorInsertTray,
  EditorOutlineTray,
  EditorReviewTray,
  EditorSelectionActions,
  type EditorCommandItem,
  type EditorCheck,
  type EditorOutlineItem,
  type EditorTelemetry,
} from "./EditorPrimitives";
import { editorBlockTemplates, getEditorBlockTemplate } from "@/lib/editor-controls";
import { useWikiLinkSuggester } from "./useWikiLinkSuggester";
import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import styles from "./TiptapEditor.module.css";
import { useConfirm } from "@/lib/useConfirm";
import { useToast } from "@/components/Toast";

export type TiptapEditorHandle = {
  getHTML: () => string;
  getMarkdown: () => string;
  setContent: (content: string) => void;
};

type Props = {
  content?: string;
  placeholder?: string;
  articleTitle?: string;
  onUpdate?: () => void;
};

/**
 * Detect whether a plain-text string is an HTTP/HTTPS URL.
 */
function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Detect whether a plain-text string looks like Markdown.
 * We check for common Markdown constructs — headings, bold/italic,
 * unordered/ordered lists, links, images, code fences, blockquotes.
 */
function looksLikeMarkdown(text: string): boolean {
  const patterns = [
    /^#{1,6}\s/m,           // headings
    /\*\*.+?\*\*/,          // bold
    /\*.+?\*/,              // italic
    /^[-*+]\s/m,            // unordered list
    /^\d+\.\s/m,            // ordered list
    /\[.+?\]\(.+?\)/,       // links
    /!\[.*?\]\(.+?\)/,      // images
    /^```/m,                // code fences
    /^>\s/m,                // blockquotes
  ];

  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) matchCount++;
  }

  // Require at least 2 different Markdown indicators to avoid false positives
  return matchCount >= 2;
}

type EditorTray = "insert" | "review" | "outline" | null;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const emptyTelemetry: EditorTelemetry = {
  words: 0,
  characters: 0,
  readMinutes: 1,
  headings: 0,
  links: 0,
  wikiLinks: 0,
  footnotes: 0,
  images: 0,
  tables: 0,
  richBlocks: 0,
  codeBlocks: 0,
  selectedWords: 0,
  selectedCharacters: 0,
  outline: [],
  checks: [],
  score: 0,
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function collectEditorTelemetry(editor: Editor | null): EditorTelemetry {
  if (!editor) return emptyTelemetry;

  const doc = editor.state.doc;
  const text = doc.textContent;
  const words = countWords(text);
  const characters = text.length;
  const outline: EditorOutlineItem[] = [];
  let headings = 0;
  let links = 0;
  let wikiLinks = 0;
  let footnotes = 0;
  let images = 0;
  let tables = 0;
  let richBlocks = 0;
  let codeBlocks = 0;
  let longestParagraphWords = 0;

  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings += 1;
      outline.push({
        level: Number(node.attrs.level ?? 2),
        text: node.textContent || "Untitled section",
        pos,
      });
    }

    if (node.type.name === "paragraph") {
      longestParagraphWords = Math.max(longestParagraphWords, countWords(node.textContent));
    }

    if (node.type.name === "image") images += 1;
    if (node.type.name === "table") tables += 1;
    if (node.type.name === "codeBlock") codeBlocks += 1;
    if (node.type.name === "footnoteRef") footnotes += 1;
    if (["calloutBlock", "mermaidBlock", "dataTable", "decisionTree", "blockMath", "collapsibleBlock", "queryBlock"].includes(node.type.name)) {
      richBlocks += 1;
    }
    if (node.type.name === "wikiLink") {
      wikiLinks += 1;
      links += 1;
    }
    if (node.isText) {
      for (const mark of node.marks) {
        if (mark.type.name === "link") links += 1;
      }
    }
  });

  const { from, to } = editor.state.selection;
  const selectedText = from === to ? "" : doc.textBetween(from, to, " ");
  const checks: EditorCheck[] = [
    {
      label: "Lead strength",
      detail: words >= 80 ? "Opening has enough substance." : "Aim for at least 80 words before publishing.",
      status: words >= 80 ? "good" : "warn",
    },
    {
      label: "Section structure",
      detail: headings > 0 ? `${headings} heading${headings === 1 ? "" : "s"} detected.` : "Add H2/H3 sections for scanability.",
      status: headings > 0 ? "good" : "warn",
    },
    {
      label: "Wiki mesh",
      detail: wikiLinks > 0 ? `${wikiLinks} wiki link${wikiLinks === 1 ? "" : "s"} connected.` : "Add wiki links so the page joins the graph.",
      status: wikiLinks > 0 ? "good" : "warn",
    },
    {
      label: "Evidence",
      detail: footnotes > 0 || links > 1 ? "External or footnote evidence is present." : "Add citations, footnotes, or source links.",
      status: footnotes > 0 || links > 1 ? "good" : "info",
    },
    {
      label: "Rich context",
      detail: images + tables + richBlocks + codeBlocks > 0 ? "Structured media or rich blocks are present." : "Consider a table, callout, image, or diagram.",
      status: images + tables + richBlocks + codeBlocks > 0 ? "good" : "info",
    },
    {
      label: "Paragraph rhythm",
      detail: longestParagraphWords <= 170 ? "Paragraphs are within a readable range." : "Break up the longest paragraph.",
      status: longestParagraphWords <= 170 ? "good" : "warn",
    },
  ];

  const positive = checks.filter((check) => check.status === "good").length;
  const score = Math.round((positive / checks.length) * 100);

  return {
    words,
    characters,
    readMinutes: Math.max(1, Math.ceil(words / 225)),
    headings,
    links,
    wikiLinks,
    footnotes,
    images,
    tables,
    richBlocks,
    codeBlocks,
    selectedWords: countWords(selectedText),
    selectedCharacters: selectedText.length,
    outline,
    checks,
    score,
  };
}

const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(
  function TiptapEditor({ content = "", placeholder = "Start writing...", articleTitle = "", onUpdate }, ref) {
    const { confirm, confirmDialog } = useConfirm();
    const { addToast } = useToast();
    const [markdownMode, setMarkdownMode] = useState(false);
    const [markdownText, setMarkdownText] = useState("");
    const [detectedCount, setDetectedCount] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [findReplaceOpen, setFindReplaceOpen] = useState(false);
    const [typewriterMode, setTypewriterMode] = useState(false);
    const [activeTray, setActiveTray] = useState<EditorTray>(null);
    const [, setEditorPulse] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const snippetsRef = useRef<SnippetItem[]>([]);
    const typewriterRafRef = useRef<number>(0);

    useEffect(() => {
      fetch("/api/snippets")
        .then((r) => r.ok ? r.json() : [])
        .then((data) => { if (Array.isArray(data)) snippetsRef.current = data; })
        .catch(() => {});
    }, []);

    useEffect(() => {
      try { setTypewriterMode(localStorage.getItem("wiki_typewriter_mode") === "1"); } catch {}
    }, []);

    const lowlight = createLowlight(common);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false, link: false }),
        CodeBlockLowlight.configure({ lowlight }),
        ImageCaption.configure({ inline: false }),
        Link.configure({ openOnClick: false }).extend({
          parseHTML() {
            return [{ tag: "a[href]:not([data-wiki-link])" }];
          },
        }),
        Placeholder.configure({ placeholder }),
        WikiLink,
        PotentialLink,
        FootnoteRef,
        TableKit,
        CollapsibleBlock,
        InlineComment,
        SlashCommandExtension.configure({
          suggestion: {
            items: (props) => makeGetSuggestionItems(snippetsRef.current)(props),
            render: () => {
              let component: ReactRenderer<SlashCommandMenuRef> | null = null;

              return {
                onStart: (props) => {
                  component = new ReactRenderer(SlashCommandMenu, {
                    props: {
                      items: props.items,
                      command: props.command,
                      clientRect: props.clientRect,
                    },
                    editor: props.editor,
                  });
                },
                onUpdate: (props) => {
                  component?.updateProps({
                    items: props.items,
                    command: props.command,
                    clientRect: props.clientRect,
                  });
                },
                onKeyDown: (props) => {
                  if (props.event.key === "Escape") {
                    component?.destroy();
                    component = null;
                    return true;
                  }
                  return component?.ref?.onKeyDown(props) ?? false;
                },
                onExit: () => {
                  component?.destroy();
                  component = null;
                },
              };
            },
          },
        }),
        MermaidBlock.configure({ lowlight }),
        InlineMath,
        BlockMath,
        DataTable,
        DecisionTree,
        FindReplace,
        PullQuote,
        SmartTypography,
        ClaimMarkExtension,
        CalloutBlock,
        QueryBlock,
        Superscript,
        Subscript,
        Highlight.configure({ multicolor: true }),
      ],
      content,
      editorProps: {
        attributes: {
          class: "tiptap max-w-none",
        },
        handleDrop(view, event) {
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;

          const imageFile = Array.from(files).find(f => f.type.startsWith("image/"));
          if (!imageFile) return false;

          event.preventDefault();

          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const formData = new FormData();
          formData.append("file", imageFile);

          fetch("/api/upload", { method: "POST", body: formData })
            .then(res => res.json())
            .then(({ url }) => {
              const node = view.state.schema.nodes.image.create({ src: url });
              const pos = coords?.pos ?? view.state.doc.content.size;
              const tr = view.state.tr.insert(pos, node);
              view.dispatch(tr);
            });

          return true;
        },
        handlePaste(view, event) {
          const items = event.clipboardData?.items;
          if (!items) return false;

          // Check for Markdown / URL in text/plain content (only when no text/html is present)
          const hasHtml = Array.from(items).some(i => i.type === "text/html");
          if (!hasHtml) {
            const textItem = Array.from(items).find(i => i.type === "text/plain");
            if (textItem) {
              const text = event.clipboardData?.getData("text/plain");
              if (text && looksLikeMarkdown(text)) {
                event.preventDefault();
                const html = marked.parse(text, { async: false }) as string;
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = html;
                const pmParser = ProseMirrorDOMParser.fromSchema(view.state.schema);
                const parsed = pmParser.parse(tempDiv);
                const { tr } = view.state;
                view.dispatch(
                  tr.replaceSelection(new Slice(parsed.content, 0, 0))
                );
                return true;
              }

              // Smart URL paste: plain URL → auto-link (wrap selection or insert as link)
              const trimmed = text?.trim() ?? "";
              if (trimmed && isUrl(trimmed)) {
                event.preventDefault();
                const linkMark = view.state.schema.marks.link;
                if (linkMark) {
                  const { from, to } = view.state.selection;
                  if (from < to) {
                    // Wrap existing selection with the pasted URL as href
                    const tr = view.state.tr.addMark(from, to, linkMark.create({ href: trimmed }));
                    view.dispatch(tr);
                  } else {
                    // Insert the URL as linked text
                    const tr = view.state.tr.insertText(trimmed, from);
                    tr.addMark(from, from + trimmed.length, linkMark.create({ href: trimmed }));
                    view.dispatch(tr);
                  }
                }
                return true;
              }
            }
          }

          // Check for pasted images
          const imageItem = Array.from(items).find(i => i.type.startsWith("image/"));
          if (!imageItem) return false;

          event.preventDefault();
          const file = imageItem.getAsFile();
          if (!file) return false;

          const formData = new FormData();
          formData.append("file", file);

          fetch("/api/upload", { method: "POST", body: formData })
            .then(res => res.json())
            .then(({ url }) => {
              const node = view.state.schema.nodes.image.create({ src: url });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            });

          return true;
        },
        handleClick(view, pos) {
          const resolved = view.state.doc.resolve(pos);
          const marks = resolved.marks();
          const potentialMark = marks.find(
            (m) => m.type.name === "potentialLink"
          );
          if (!potentialMark) return false;

          const title = potentialMark.attrs.title as string;
          const $pos = resolved;
          const parent = $pos.parent;
          let from = $pos.before($pos.depth) + 1;
          let to = from;

          // Walk through the parent's children to find the text range with this mark
          parent.forEach((node, offset) => {
            const hasMark = node.marks.some(
              (m) =>
                m.type.name === "potentialLink" && m.attrs.title === title
            );
            if (hasMark) {
              const nodeFrom = $pos.start() + offset;
              const nodeTo = nodeFrom + node.nodeSize;
              if (pos >= nodeFrom && pos < nodeTo) {
                from = nodeFrom;
                to = nodeTo;
              }
            }
          });

          const tr = view.state.tr;
          tr.removeMark(from, to, potentialMark.type);
          tr.replaceRangeWith(
            from,
            to,
            view.state.schema.nodes.wikiLink.create({ title })
          );
          view.dispatch(tr);
          setDetectedCount((c) => Math.max(0, c - 1));
          return true;
        },
      },
    });

    useEffect(() => {
      if (!editor) return;
      const bump = () => setEditorPulse((value) => (value + 1) % 100000);
      const handler = () => {
        setHasChanges(true);
        bump();
        onUpdate?.();
      };
      const selectionHandler = () => bump();
      editor.on("update", handler);
      editor.on("selectionUpdate", selectionHandler);
      return () => {
        editor.off("update", handler);
        editor.off("selectionUpdate", selectionHandler);
      };
    }, [editor, onUpdate]);

    // Typewriter scrolling: keep cursor vertically centred when mode is active
    useEffect(() => {
      if (!editor || !typewriterMode) return;
      const scroll = () => {
        cancelAnimationFrame(typewriterRafRef.current);
        typewriterRafRef.current = requestAnimationFrame(() => {
          try {
            const { from } = editor.state.selection;
            const coords = editor.view.coordsAtPos(from);
            const target = window.scrollY + coords.top - window.innerHeight / 2;
            window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
          } catch { /* view may not be mounted */ }
        });
      };
      editor.on("selectionUpdate", scroll);
      editor.on("update", scroll);
      return () => {
        editor.off("selectionUpdate", scroll);
        editor.off("update", scroll);
        cancelAnimationFrame(typewriterRafRef.current);
      };
    }, [editor, typewriterMode]);

    // Ctrl+H / Cmd+H → open find & replace
    useEffect(() => {
      function onKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === "h") {
          e.preventDefault();
          setFindReplaceOpen((o) => !o);
        }
        if (e.key === "Escape") setFindReplaceOpen(false);
      }
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    const suggester = useWikiLinkSuggester(editor);
    const telemetry = collectEditorTelemetry(editor);

    const handleDetectLinks = useCallback(async () => {
      if (!editor) return;

      // First clear any existing potential link marks
      const { tr } = editor.state;
      const markType = editor.schema.marks.potentialLink;
      tr.removeMark(0, editor.state.doc.content.size, markType);
      editor.view.dispatch(tr);

      // Fetch all article titles
      const res = await fetch("/api/articles/titles");
      if (!res.ok) return;
      const articles: { title: string; slug: string }[] = await res.json();
      if (articles.length === 0) return;

      // Sort by title length descending so longer matches take priority
      const sorted = [...articles].sort(
        (a, b) => b.title.length - a.title.length
      );

      let count = 0;
      const { tr: tr2 } = editor.state;

      editor.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;

        // Skip text inside wikiLink nodes (parent check)
        const $pos = editor.state.doc.resolve(pos);
        if ($pos.parent.type.name === "wikiLink") return;
        // Skip headings
        if ($pos.parent.type.name === "heading") return;

        // Skip text that already has a potentialLink mark
        if (node.marks.some((m) => m.type.name === "potentialLink")) return;

        const text = node.text;
        // Track which character positions are already matched
        const matched = new Array(text.length).fill(false);

        for (const article of sorted) {
          const titleLower = article.title.toLowerCase();
          const textLower = text.toLowerCase();
          let searchFrom = 0;

          while (searchFrom < text.length) {
            const idx = textLower.indexOf(titleLower, searchFrom);
            if (idx === -1) break;

            const end = idx + article.title.length;

            // Check if any character in this range is already matched
            let overlap = false;
            for (let i = idx; i < end; i++) {
              if (matched[i]) {
                overlap = true;
                break;
              }
            }

            if (!overlap) {
              // Check word boundaries
              const beforeOk =
                idx === 0 || /\W/.test(text[idx - 1]);
              const afterOk =
                end >= text.length || /\W/.test(text[end]);

              if (beforeOk && afterOk) {
                tr2.addMark(
                  pos + idx,
                  pos + end,
                  markType.create({ title: article.title })
                );
                for (let i = idx; i < end; i++) matched[i] = true;
                count++;
              }
            }

            searchFrom = end;
          }
        }
      });

      if (count > 0) {
        editor.view.dispatch(tr2);
      }
      setDetectedCount(count);
    }, [editor]);

    useImperativeHandle(ref, () => ({
      getHTML: () => {
        const html = editor?.getHTML() || "";
        // Strip potential-link marks — they're editor-only hints, not saved content
        return html.replace(/<span[^>]*data-suggest-title="[^"]*"[^>]*>(.*?)<\/span>/g, "$1");
      },
      getMarkdown: () => markdownText,
      setContent: (content: string) => {
        editor?.commands.setContent(content);
      },
    }));

    async function handleAiRewrite() {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        addToast("Select some text first, then click AI Rewrite.", "warning");
        return;
      }
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      const instruction = window.prompt("Rewrite instruction (optional — leave blank for default):", "") ?? "";
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, instruction: instruction.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        addToast(err.error ?? "AI rewrite failed.", "error");
        return;
      }
      const { result } = await res.json();
      if (result) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
      }
    }

    async function handleAiExpand() {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        addToast("Select a paragraph first, then click AI Expand.", "warning");
        return;
      }
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      const context = editor.state.doc.textContent.slice(0, 500);
      const res = await fetch("/api/ai/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, context }),
      });
      if (!res.ok) return;
      const { expanded } = await res.json();
      if (expanded) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(expanded).run();
      }
    }

    async function handleAiGenerate() {
      if (!editor) return;
      const headings: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          const prefix = "#".repeat(node.attrs.level as number);
          headings.push(`${prefix} ${node.textContent}`);
        }
      });
      if (headings.length === 0) {
        addToast("Add some headings first. AI Generate fills in content under each heading.", "warning");
        return;
      }
      const title = articleTitle || "Article";
      if (!(await confirm(`Generate content for ${headings.length} section(s)? This will replace text below each heading.`, { title: "AI Generate", confirmLabel: "Generate", danger: true }))) return;
      const res = await fetch("/api/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, headings }),
      });
      if (!res.ok) {
        addToast("AI generation failed. Check that AI_API_KEY is configured.", "error");
        return;
      }
      const { html } = await res.json();
      if (html) {
        // Replace entire document content with generated HTML
        editor.chain().focus().setContent(html).run();
      }
    }

    function handleInsertToc() {
      if (!editor) return;

      const headings: { level: number; text: string }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          headings.push({ level: node.attrs.level as number, text: node.textContent });
        }
      });

      if (headings.length === 0) {
        addToast("No headings found. Add some headings first.", "warning");
        return;
      }

      // Build nested ordered-list HTML
      const minLevel = Math.min(...headings.map((h) => h.level));
      let html = "<ol>";
      let currentLevel = minLevel;
      for (const h of headings) {
        if (h.level > currentLevel) {
          html += "<ol>";
          currentLevel = h.level;
        } else if (h.level < currentLevel) {
          html += "</ol>";
          currentLevel = h.level;
        }
        const anchor = h.text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        html += `<li><a href="#${anchor}">${h.text}</a></li>`;
      }
      while (currentLevel >= minLevel) {
        html += "</ol>";
        currentLevel--;
      }

      editor.chain().focus().insertContent(html).run();
    }

    function handleSelectionLink() {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const url = window.prompt("URL for selected text:", "https://");
      if (!url?.trim()) return;
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }

    function handleSelectionWikiLink() {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) return;
      const title = window.prompt("Article title to link:", selectedText.trim());
      if (!title?.trim()) return;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "wikiLink",
          attrs: {
            title: title.trim(),
            label: selectedText.trim() !== title.trim() ? selectedText.trim() : null,
          },
        })
        .run();
    }

    function handleSelectionFootnote() {
      if (!editor) return;
      const note = window.prompt("Footnote text:");
      if (!note?.trim()) return;
      const { to } = editor.state.selection;
      editor.chain().focus().setTextSelection(to).insertContent({ type: "footnoteRef", attrs: { note: note.trim() } }).run();
    }

    function insertQuickBlock(kind: string) {
      if (!editor) return;

      const template = getEditorBlockTemplate(kind);
      if (template) {
        editor.chain().focus().insertContent(template.html).run();
        return;
      }

      if (kind === "note") editor.chain().focus().insertCallout("note").run();
      if (kind === "tip") editor.chain().focus().insertCallout("tip").run();
      if (kind === "warning") editor.chain().focus().insertCallout("warning").run();
      if (kind === "table") editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
      if (kind === "data") editor.chain().focus().insertDataTable().run();
      if (kind === "mermaid") editor.chain().focus().insertMermaidBlock().run();
      if (kind === "math") editor.chain().focus().insertBlockMath().run();
      if (kind === "decision") editor.chain().focus().insertDecisionTree().run();
      if (kind === "collapse") editor.chain().focus().insertCollapsibleBlock().run();
      if (kind === "query") editor.chain().focus().insertQueryBlock().run();
      if (kind === "scaffold") {
        editor.chain().focus().insertContent(
          `<h2>Overview</h2><p>Summarize the subject, scope, and why it matters.</p><h2>Background</h2><p>Add origins, context, and prerequisites.</p><h2>Key Details</h2><p>Describe the most important facts, mechanics, or relationships.</p><h2>See Also</h2><ul><li>[[Related article]]</li></ul>`
        ).run();
      }
      if (kind === "timeline") {
        editor.chain().focus().insertContent(
          `<div class="wiki-timeline"><div class="wiki-timeline-entry"><div class="wiki-timeline-date">Date</div><div class="wiki-timeline-body"><p>Event description</p></div></div><div class="wiki-timeline-entry"><div class="wiki-timeline-date">Date</div><div class="wiki-timeline-body"><p>Event description</p></div></div></div><p></p>`
        ).run();
      }
    }

    function jumpToOutlineItem(item: EditorOutlineItem) {
      if (!editor) return;
      const target = Math.min(item.pos + 1, editor.state.doc.content.size);
      editor.chain().focus().setTextSelection(target).run();
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        selection?.anchorNode?.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }

    async function handleImageUpload() {
      fileInputRef.current?.click();
    }

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        // Suggest alt text from filename
        let suggestedAlt = "";
        try {
          const altRes = await fetch("/api/ai/alt-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name }),
          });
          if (altRes.ok) {
            const altData = await altRes.json();
            suggestedAlt = altData.altText ?? "";
          }
        } catch { /* ignore */ }
        const caption = window.prompt("Image caption (optional):", suggestedAlt) ?? "";
        editor.chain().focus().setImage({ src: url, title: caption.trim() || undefined }).run();
      }

      e.target.value = "";
    }

    function toggleMarkdownMode() {
      if (!editor) return;

      if (!markdownMode) {
        const html = editor.getHTML();
        setMarkdownText(htmlToBasicMarkdown(html));
      } else {
        const html = basicMarkdownToHtml(markdownText);
        editor.commands.setContent(html);
      }
      setMarkdownMode(!markdownMode);
    }

    const quickBlocks: EditorCommandItem[] = [
      { id: "scaffold", label: "Article scaffold", meta: "Sections", group: "Start" },
      { id: "callout-note", label: "Note callout", meta: "Template", group: "Start" },
      { id: "metadata-table", label: "Metadata table", meta: "Template", group: "Structure" },
      { id: "infobox", label: "Infobox", meta: "Template", group: "Structure" },
      { id: "timeline", label: "Timeline", meta: "Template", group: "Structure" },
      { id: "decision-log", label: "Decision log", meta: "Template", group: "Research" },
      { id: "research-note", label: "Research note", meta: "Template", group: "Research" },
      { id: "worldbuilding-entry", label: "Worldbuilding entry", meta: "Template", group: "Research" },
      { id: "table", label: "Table", meta: "4 x 4", group: "Structure" },
      { id: "data", label: "Data table", meta: "CSV", group: "Advanced" },
      { id: "mermaid", label: "Diagram", meta: "Mermaid", group: "Advanced" },
      { id: "math", label: "Math", meta: "KaTeX", group: "Advanced" },
      { id: "decision", label: "Decision tree", meta: "Branches", group: "Advanced" },
      { id: "collapse", label: "Collapsible", meta: "Details", group: "Structure" },
      { id: "query", label: "Query block", meta: "Live list", group: "Structure" },
      ...editorBlockTemplates
        .filter((template) => !["callout-note", "metadata-table", "timeline", "infobox", "decision-log", "research-note", "worldbuilding-entry"].includes(template.id))
        .map((template) => ({
          id: template.id,
          label: template.label,
          meta: "Template",
          group: template.group,
        })),
    ];

    const quickBlockGroups = [
      { label: "Start", ids: ["scaffold", "callout-note"] },
      { label: "Structure", ids: ["metadata-table", "infobox", "timeline", "table", "collapse", "query"] },
      { label: "Research", ids: ["decision-log", "research-note", "worldbuilding-entry"] },
      { label: "Advanced", ids: ["data", "mermaid", "math", "decision"] },
    ];

    const trayButtons: { key: Exclude<EditorTray, null>; label: string; detail: string }[] = [
      { key: "insert", label: "Insert", detail: "Add blocks" },
      { key: "review", label: "Review", detail: `${telemetry.score}% ready` },
      { key: "outline", label: "Outline", detail: `${telemetry.outline.length} sections` },
    ];

    function toggleTray(tray: Exclude<EditorTray, null>) {
      setActiveTray((current) => (current === tray ? null : tray));
    }

    function renderActiveTray() {
      if (!editor || markdownMode || activeTray === null) return null;

      if (activeTray === "insert") {
        return (
          <EditorInsertTray
            commands={quickBlocks}
            groups={quickBlockGroups}
            onInsert={insertQuickBlock}
          />
        );
      }

      if (activeTray === "review") {
        return <EditorReviewTray editor={editor} telemetry={telemetry} />;
      }

      if (activeTray === "outline") {
        return (
          <EditorOutlineTray
            editor={editor}
            articleTitle={articleTitle}
            outline={telemetry.outline}
            onJump={jumpToOutlineItem}
          />
        );
      }
    }

    return (
      <div className={styles.shell} data-testid="editor-shell">
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.titleBlock}>
              <strong className={styles.title}>{articleTitle || "Editor"}</strong>
              <span className={styles.subtitle}>
                {markdownMode ? "Markdown mode" : `${telemetry.words} words - ${telemetry.readMinutes} min read`}
              </span>
            </div>
          </div>

          <div className={styles.headerActions} data-testid="editor-feature-tabs">
            {!markdownMode && (
              <>
                {trayButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    onClick={() => toggleTray(button.key)}
                    aria-pressed={activeTray === button.key}
                    aria-label={`${button.label}: ${button.detail}`}
                    className={styles.trayToggle}
                  >
                    {button.label}
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={toggleMarkdownMode}
              className={styles.trayToggle}
              aria-pressed={markdownMode}
            >
              {markdownMode ? "Write" : "Markdown"}
            </button>
          </div>
        </header>

        {!markdownMode && (
          <EditorToolbar
            editor={editor}
            onImageUpload={handleImageUpload}
            onDetectLinks={handleDetectLinks}
            detectedLinkCount={detectedCount}
            onInsertToc={handleInsertToc}
            onAiRewrite={handleAiRewrite}
            onAiExpand={handleAiExpand}
            onAiGenerate={handleAiGenerate}
            onFindReplace={() => setFindReplaceOpen((o) => !o)}
            typewriterMode={typewriterMode}
            onTypewriterToggle={() => {
              const next = !typewriterMode;
              setTypewriterMode(next);
              try { localStorage.setItem("wiki_typewriter_mode", next ? "1" : "0"); } catch {}
            }}
          />
        )}

        <FindReplacePanel
          editor={editor}
          open={findReplaceOpen}
          onClose={() => setFindReplaceOpen(false)}
        />

        {renderActiveTray()}

        <div className={cx(styles.workspace, markdownMode && styles.markdownWorkspace)}>
          <div className={styles.mainPanel}>
            {!markdownMode && telemetry.selectedCharacters > 0 && (
              <EditorSelectionActions
                selectedWords={telemetry.selectedWords}
                actions={[
                  { id: "rewrite", label: "Rewrite", onSelect: handleAiRewrite },
                  { id: "expand", label: "Expand", onSelect: handleAiExpand },
                  { id: "wiki-link", label: "Wiki link", onSelect: handleSelectionWikiLink },
                  { id: "url", label: "URL", onSelect: handleSelectionLink },
                  { id: "footnote", label: "Footnote", onSelect: handleSelectionFootnote },
                ]}
              />
            )}

            {markdownMode ? (
              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                className={styles.markdownPlane}
                placeholder="Write in markdown..."
              />
            ) : (
              <div className={styles.canvas}>
                <EditorContent editor={editor} />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />

            {!markdownMode && editor && (
              <div className={styles.statusbar}>
                <div className={styles.statusStats}>
                  <span>{telemetry.words} words</span>
                  <span>{telemetry.readMinutes} min read</span>
                  <span>{telemetry.score}% ready</span>
                </div>
                <WritingSessionGoal editor={editor} />
                <div className={styles.statusState}>
                  <span>{hasChanges ? "Unsaved" : "Saved"}</span>
                  <span>{editor.state.doc.content.childCount} blocks</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <WikiLinkSuggester
          active={suggester.active}
          query={suggester.query}
          position={suggester.position}
          onSelect={suggester.selectItem}
          onDismiss={suggester.dismiss}
        />

        {!markdownMode && <LinkBubble editor={editor} />}

        {confirmDialog}
      </div>
    );
  }
);

function htmlToBasicMarkdown(html: string): string {
  return html
    // Convert wiki links to [[Title]] or [[Title|Label]] before stripping tags
    .replace(/<a[^>]*data-wiki-link="([^"]*)"[^>]*>([^<]*)<\/a>/gi, (_m, title, text) => {
      return text !== title ? `[[${title}|${text}]]` : `[[${title}]]`;
    })
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function basicMarkdownToHtml(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let paragraph: string[] = [];

  function convertInline(text: string): string {
    return text
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, title, label) => {
        const slug = slugify(title);
        const display = label || title;
        return `<a href="/articles/${slug}" class="wiki-link" data-wiki-link="${title}">${display}</a>`;
      })
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function flushParagraph() {
    if (paragraph.length > 0) {
      result.push(`<p>${convertInline(paragraph.join("<br>"))}</p>`);
      paragraph = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      result.push(`<h3>${convertInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      flushParagraph();
      result.push(`<h2>${convertInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      flushParagraph();
      result.push(`<h1>${convertInline(trimmed.slice(2))}</h1>`);
    } else {
      paragraph.push(trimmed);
    }
  }

  flushParagraph();
  return result.join("");
}

export default TiptapEditor;
