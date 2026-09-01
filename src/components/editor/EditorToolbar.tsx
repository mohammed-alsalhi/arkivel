"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import VoiceDictationButton from "./VoiceDictationButton";
import HighlightColorPicker from "./HighlightColorPicker";
import type { ClaimLevel } from "./ClaimMarkExtension";
import styles from "./EditorToolbar.module.css";
import { useConfirm } from "@/lib/useConfirm";

type Props = {
  editor: Editor | null;
  onImageUpload: () => void;
  onDetectLinks: () => void;
  detectedLinkCount: number;
  onInsertToc: () => void;
  onAiRewrite: () => void;
  onAiExpand: () => void;
  onAiGenerate: () => void;
  onFindReplace: () => void;
  typewriterMode: boolean;
  onTypewriterToggle: () => void;
};

export type EditorToolAction = {
  label: string;
  icon: string;
  action: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: "default" | "accent" | "ai" | "danger";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ToolButton({ action }: { action: EditorToolAction }) {
  return (
    <button
      type="button"
      onClick={action.action}
      disabled={action.disabled}
      title={action.label}
      aria-label={action.label}
      aria-pressed={action.active || undefined}
      data-tone={action.tone ?? "default"}
      className={styles.toolButton}
    >
      <span aria-hidden="true" className={styles.toolIcon}>{action.icon}</span>
      <span className={styles.toolText}>{action.label}</span>
    </button>
  );
}

export function ToolbarGroup({
  label,
  actions,
}: {
  label: string;
  actions: EditorToolAction[];
}) {
  const visible = actions.filter((action) => !action.disabled || action.label === "Undo" || action.label === "Redo");
  if (visible.length === 0) return null;

  return (
    <div className={styles.group} aria-label={label}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.groupActions}>
        {visible.map((action) => (
          <ToolButton key={action.label} action={action} />
        ))}
      </div>
    </div>
  );
}

export function EditorTableControls({ actions }: { actions: EditorToolAction[] }) {
  return <ToolbarGroup label="Table" actions={actions} />;
}

function getBlockValue(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("codeBlock")) return "code";
  if (editor.isActive("blockquote")) return "quote";
  return "paragraph";
}

export default function EditorToolbar({
  editor,
  onImageUpload,
  onDetectLinks,
  detectedLinkCount,
  onInsertToc,
  onAiRewrite,
  onAiExpand,
  onAiGenerate,
  onFindReplace,
  typewriterMode,
  onTypewriterToggle,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  if (!editor) return null;
  const activeEditor = editor;

  const isTableActive = activeEditor.isActive("table");
  const blockValue = getBlockValue(activeEditor);

  function setBlock(value: string) {
    if (value === "paragraph") activeEditor.chain().focus().setParagraph().run();
    if (value === "h1") activeEditor.chain().focus().toggleHeading({ level: 1 }).run();
    if (value === "h2") activeEditor.chain().focus().toggleHeading({ level: 2 }).run();
    if (value === "h3") activeEditor.chain().focus().toggleHeading({ level: 3 }).run();
    if (value === "quote") activeEditor.chain().focus().toggleBlockquote().run();
    if (value === "code") {
      if (activeEditor.isActive("codeBlock")) {
        activeEditor.chain().focus().toggleCodeBlock().run();
      } else {
        const lang = window.prompt("Language (js, python, html, css):", "");
        activeEditor.chain().focus().toggleCodeBlock().run();
        if (lang) activeEditor.chain().focus().updateAttributes("codeBlock", { language: lang }).run();
      }
    }
  }

  function insertLink() {
    const previous = activeEditor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL:", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      activeEditor.chain().focus().unsetLink().run();
      return;
    }
    activeEditor.chain().focus().setLink({ href: url.trim() }).run();
  }

  function insertWikiLink() {
    const { from, to } = activeEditor.state.selection;
    const selectedText = activeEditor.state.doc.textBetween(from, to);
    const title = window.prompt("Article title to link:", selectedText || "");
    if (!title) return;
    const label = selectedText && selectedText !== title ? selectedText : null;
    activeEditor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({ type: "wikiLink", attrs: { title, label } })
      .run();
  }

  function insertFootnote() {
    const note = window.prompt("Footnote text:");
    if (!note) return;
    activeEditor.chain().focus().insertContent({ type: "footnoteRef", attrs: { note } }).run();
  }

  const primaryActions: EditorToolAction[] = [
    {
      label: "Undo",
      icon: "↶",
      action: () => activeEditor.chain().focus().undo().run(),
      disabled: !activeEditor.can().undo(),
    },
    {
      label: "Redo",
      icon: "↷",
      action: () => activeEditor.chain().focus().redo().run(),
      disabled: !activeEditor.can().redo(),
    },
    { label: "Bold", icon: "B", action: () => activeEditor.chain().focus().toggleBold().run(), active: activeEditor.isActive("bold") },
    { label: "Italic", icon: "I", action: () => activeEditor.chain().focus().toggleItalic().run(), active: activeEditor.isActive("italic") },
    { label: "Link", icon: "URL", action: insertLink, active: activeEditor.isActive("link") },
    { label: "Wiki link", icon: "[[]]", action: insertWikiLink },
    { label: "Bullets", icon: "UL", action: () => activeEditor.chain().focus().toggleBulletList().run(), active: activeEditor.isActive("bulletList") },
    { label: "Numbers", icon: "1.", action: () => activeEditor.chain().focus().toggleOrderedList().run(), active: activeEditor.isActive("orderedList") },
    { label: "Image", icon: "IMG", action: onImageUpload },
  ];

  const textActions: EditorToolAction[] = [
    { label: "Strike", icon: "S", action: () => activeEditor.chain().focus().toggleStrike().run(), active: activeEditor.isActive("strike") },
    { label: "Inline code", icon: "</>", action: () => activeEditor.chain().focus().toggleCode().run(), active: activeEditor.isActive("code") },
    { label: "Superscript", icon: "x2", action: () => activeEditor.chain().focus().toggleSuperscript().run(), active: activeEditor.isActive("superscript") },
    { label: "Subscript", icon: "x_2", action: () => activeEditor.chain().focus().toggleSubscript().run(), active: activeEditor.isActive("subscript") },
  ];

  const structureActions: EditorToolAction[] = [
    { label: "Quote", icon: "QT", action: () => activeEditor.chain().focus().toggleBlockquote().run(), active: activeEditor.isActive("blockquote") },
    { label: "Pull quote", icon: "PQ", action: () => activeEditor.chain().focus().togglePullQuote().run(), active: activeEditor.isActive("pullQuote") },
    { label: "Table", icon: "TBL", action: () => activeEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: "Divider", icon: "--", action: () => activeEditor.chain().focus().setHorizontalRule().run() },
    { label: "Footnote", icon: "fn", action: insertFootnote },
    { label: "Math block", icon: "SUM", action: () => activeEditor.chain().focus().insertBlockMath().run() },
  ];

  const knowledgeActions: EditorToolAction[] = [
    {
      label: "Detect wiki links",
      icon: detectedLinkCount > 0 ? `${detectedLinkCount}` : "LINK",
      action: onDetectLinks,
      tone: detectedLinkCount > 0 ? "accent" : "default",
    },
    { label: "Insert table of contents", icon: "TOC", action: onInsertToc },
    { label: "Find and replace", icon: "F/R", action: onFindReplace },
    { label: "Typewriter mode", icon: "TYPE", action: onTypewriterToggle, active: typewriterMode },
  ];

  const aiActions: EditorToolAction[] = [
    { label: "AI rewrite selection", icon: "Rewrite", action: onAiRewrite, tone: "ai" },
    { label: "AI expand selection", icon: "Expand", action: onAiExpand, tone: "ai" },
    { label: "AI generate article from headings", icon: "Draft", action: onAiGenerate, tone: "ai" },
  ];

  const tableActions: EditorToolAction[] = [
    { label: "Add row below", icon: "+R", action: () => activeEditor.chain().focus().addRowAfter().run() },
    { label: "Add column after", icon: "+C", action: () => activeEditor.chain().focus().addColumnAfter().run() },
    { label: "Delete row", icon: "-R", action: () => activeEditor.chain().focus().deleteRow().run() },
    { label: "Delete column", icon: "-C", action: () => activeEditor.chain().focus().deleteColumn().run() },
    { label: "Merge cells", icon: "MRG", action: () => activeEditor.chain().focus().mergeCells().run() },
    { label: "Split cell", icon: "SPL", action: () => activeEditor.chain().focus().splitCell().run() },
    { label: "Header row", icon: "H-R", action: () => activeEditor.chain().focus().toggleHeaderRow().run(), active: activeEditor.isActive("tableHeader") },
    { label: "Header column", icon: "H-C", action: () => activeEditor.chain().focus().toggleHeaderColumn().run(), active: activeEditor.isActive("tableHeader") },
    { label: "Delete table", icon: "DEL", action: () => activeEditor.chain().focus().deleteTable().run(), tone: "danger" },
  ];

  const claimLevels: { level: ClaimLevel; label: string }[] = [
    { level: "certain", label: "Certain" },
    { level: "probable", label: "Probable" },
    { level: "disputed", label: "Disputed" },
  ];

  return (
    <div className={styles.toolbar} data-testid="editor-toolbar">
      <div className={styles.main}>
        <div className={styles.blockPicker}>
          <select
            value={blockValue}
            onChange={(event) => setBlock(event.target.value)}
            aria-label="Block style"
            className={styles.blockSelect}
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="quote">Quote</option>
            <option value="code">Code block</option>
          </select>
        </div>

        <div className={styles.primaryActions} aria-label="Primary editor actions">
          {primaryActions.map((action) => (
            <ToolButton key={action.label} action={action} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className={styles.moreButton}
        >
          More
        </button>
      </div>

      {advancedOpen && (
        <div className={styles.advancedPanel}>
          <ToolbarGroup label="Format" actions={textActions} />
          <ToolbarGroup label="Insert" actions={structureActions} />
          <ToolbarGroup label="Knowledge" actions={knowledgeActions} />
          <ToolbarGroup label="AI" actions={aiActions} />

          <div className={styles.group} aria-label="Claim confidence">
            <span className={styles.groupLabel}>Claims</span>
            <div className={styles.groupActions}>
              {claimLevels.map(({ level, label }) => {
                const active = activeEditor.isActive("claimMark", { level });
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => activeEditor.chain().focus().toggleClaim(level).run()}
                    title={`Mark selection as ${label.toLowerCase()}`}
                    aria-pressed={active || undefined}
                    data-claim={level}
                    className={styles.claimButton}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.group} aria-label="Finishing">
            <span className={styles.groupLabel}>Finish</span>
            <div className={cx(styles.groupActions, styles.finishActions)}>
              <HighlightColorPicker editor={activeEditor} />
              <VoiceDictationButton editor={activeEditor} />
              <button
                type="button"
                onClick={() => void confirm("Ctrl+B - Bold\nCtrl+I - Italic\nCtrl+Z - Undo\nCtrl+Y - Redo\nCtrl+H - Find and replace\nCtrl+Shift+L - Wiki link\nCtrl+Shift+F - Footnote\n[[...]] - Wiki link search\n/ - Command menu", { title: "Editor shortcuts", confirmLabel: "Close", hideCancel: true })}
                title="Editor keyboard shortcuts"
                aria-label="Editor keyboard shortcuts"
                className={styles.toolButton}
              >
                <span aria-hidden="true" className={styles.toolIcon}>?</span>
                <span className={styles.toolText}>Shortcuts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isTableActive && (
        <div className={styles.contextBar} aria-label="Table controls">
          <EditorTableControls actions={tableActions} />
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
