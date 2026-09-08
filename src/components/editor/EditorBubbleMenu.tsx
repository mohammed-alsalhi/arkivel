"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState } from "@tiptap/react";

type Props = {
  editor: Editor | null;
  onLink: () => void;
  onWikiLink: () => void;
};

type BlockValue = "paragraph" | "h1" | "h2" | "h3" | "quote" | "code";

function blockValue(editor: Editor): BlockValue {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("codeBlock")) return "code";
  return "paragraph";
}

function setBlock(editor: Editor, value: BlockValue) {
  const chain = editor.chain().focus();
  if (value === "paragraph") chain.setParagraph().run();
  else if (value === "h1") chain.setHeading({ level: 1 }).run();
  else if (value === "h2") chain.setHeading({ level: 2 }).run();
  else if (value === "h3") chain.setHeading({ level: 3 }).run();
  else if (value === "quote") chain.setBlockquote().run();
  else chain.setCodeBlock().run();
}

function MarkButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="editor-bubble-button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** The selection toolbar: appears over selected text with turn-into, marks, and links. */
export default function EditorBubbleMenu({ editor, onLink, onWikiLink }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            block: blockValue(current),
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            strike: current.isActive("strike"),
            code: current.isActive("code"),
            link: current.isActive("link"),
          }
        : null,
  });

  if (!editor || !state) return null;

  return (
    <BubbleMenu
      editor={editor}
      className="editor-bubble"
      updateDelay={80}
      options={{ placement: "top-start", offset: 8 }}
      shouldShow={({ editor: current, state: editorState, from, to }) => {
        if (from === to || !current.isEditable) return false;
        if (current.isActive("codeBlock") || current.isActive("image")) return false;
        // Node selections (an image, a table cell drag) have no text to format.
        return editorState.doc.textBetween(from, to, " ").trim().length > 0;
      }}
    >
      <div role="toolbar" aria-label="Format selection" className="editor-bubble-row">
        <select
          className="editor-bubble-select"
          aria-label="Turn into"
          value={state.block}
          onChange={(event) => setBlock(editor, event.target.value as BlockValue)}
        >
          <option value="paragraph">text</option>
          <option value="h1">heading 1</option>
          <option value="h2">heading 2</option>
          <option value="h3">heading 3</option>
          <option value="quote">quote</option>
          <option value="code">code</option>
        </select>
        <span className="editor-bubble-divider" />
        <MarkButton label="bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </MarkButton>
        <MarkButton label="italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>i</em>
        </MarkButton>
        <MarkButton label="strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </MarkButton>
        <MarkButton label="inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
          <code>{"<>"}</code>
        </MarkButton>
        <span className="editor-bubble-divider" />
        <MarkButton label="link" active={state.link} onClick={onLink}>
          link
        </MarkButton>
        <MarkButton label="page link" active={false} onClick={onWikiLink}>
          [[ ]]
        </MarkButton>
      </div>
    </BubbleMenu>
  );
}
