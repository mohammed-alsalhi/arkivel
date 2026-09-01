"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

type LinkInfo = {
  type: "link" | "wikiLink";
  href?: string;
  title?: string;
  label?: string | null;
  from: number;
  to: number;
};

type Props = {
  editor: Editor | null;
};

export default function LinkBubble({ editor }: Props) {
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleHoveredRef = useRef(false);

  const getContainer = useCallback(() => {
    if (!editor) return null;
    return editor.view.dom.closest(".border.border-border") as HTMLElement | null;
  }, [editor]);

  const calcPosition = useCallback(
    (element: HTMLElement) => {
      const container = getContainer();
      if (!container) return null;
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        top: rect.bottom - containerRect.top + 4,
        left: rect.left - containerRect.left,
      };
    },
    [getContainer]
  );

  const findLinkFromElement = useCallback(
    (linkEl: HTMLAnchorElement): LinkInfo | null => {
      if (!editor) return null;

      const wikiTitle = linkEl.getAttribute("data-wiki-link");

      if (wikiTitle) {
        // Wiki link atom node — find it in the ProseMirror doc
        try {
          const pos = editor.view.posAtDOM(linkEl, 0);
          for (let offset = -2; offset <= 2; offset++) {
            const tryPos = pos + offset;
            if (tryPos < 0 || tryPos >= editor.state.doc.content.size) continue;
            const node = editor.state.doc.nodeAt(tryPos);
            if (node && node.type.name === "wikiLink") {
              return {
                type: "wikiLink",
                title: node.attrs.title,
                label: node.attrs.label,
                from: tryPos,
                to: tryPos + node.nodeSize,
              };
            }
          }
        } catch {
          // posAtDOM can throw if the element is detached
        }
        return null;
      }

      // Regular link mark
      try {
        const pos = editor.view.posAtDOM(linkEl, 0);
        const resolved = editor.state.doc.resolve(pos);
        const marks = resolved.marks();
        const linkMark = marks.find((m) => m.type.name === "link");
        if (!linkMark) return null;

        const parent = resolved.parent;
        const parentOffset = resolved.start();
        let markFrom = pos;
        let markTo = pos;

        parent.forEach((child, offset) => {
          const nodeFrom = parentOffset + offset;
          const nodeTo = nodeFrom + child.nodeSize;
          if (
            child.marks.some(
              (m) => m.type.name === "link" && m.attrs.href === linkMark.attrs.href
            )
          ) {
            if (pos >= nodeFrom && pos <= nodeTo) {
              markFrom = nodeFrom;
              markTo = nodeTo;
            }
          }
        });

        return {
          type: "link",
          href: linkMark.attrs.href,
          from: markFrom,
          to: markTo,
        };
      } catch {
        return null;
      }
    },
    [editor]
  );

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const startDismissTimer = useCallback(() => {
    clearDismissTimer();
    dismissTimer.current = setTimeout(() => {
      if (!bubbleHoveredRef.current) {
        setLinkInfo(null);
        setEditing(false);
      }
    }, 200);
  }, [clearDismissTimer]);

  // Hover detection via DOM events on the editor
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    function handleMouseOver(e: Event) {
      const target = e.target as HTMLElement;
      const linkEl = target.closest("a") as HTMLAnchorElement | null;
      if (!linkEl || !editorDom.contains(linkEl)) return;

      clearDismissTimer();
      const info = findLinkFromElement(linkEl);
      if (info) {
        const pos = calcPosition(linkEl);
        if (pos) {
          setPosition(pos);
          setLinkInfo(info);
        }
      }
    }

    function handleMouseOut(e: Event) {
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      // Still on a link inside the editor — don't dismiss
      if (related?.closest("a") && editorDom.contains(related)) return;
      startDismissTimer();
    }

    // Prevent browser navigation when clicking links inside the editor
    function handleClick(e: Event) {
      const target = e.target as HTMLElement;
      const linkEl = target.closest("a") as HTMLAnchorElement | null;
      if (linkEl && editorDom.contains(linkEl)) {
        e.preventDefault();
      }
    }

    editorDom.addEventListener("mouseover", handleMouseOver);
    editorDom.addEventListener("mouseout", handleMouseOut);
    editorDom.addEventListener("click", handleClick);

    return () => {
      editorDom.removeEventListener("mouseover", handleMouseOver);
      editorDom.removeEventListener("mouseout", handleMouseOut);
      editorDom.removeEventListener("click", handleClick);
      clearDismissTimer();
    };
  }, [editor, findLinkFromElement, calcPosition, clearDismissTimer, startDismissTimer]);

  // Also detect from selection (keyboard nav + clicking atom nodes)
  useEffect(() => {
    if (!editor) return;

    function onSelectionUpdate() {
      if (!editor) return;
      const { state } = editor;

      // NodeSelection on a wikiLink atom
      if (state.selection instanceof NodeSelection) {
        const node = state.selection.node;
        if (node.type.name === "wikiLink") {
          const pos = state.selection.from;
          const coords = editor.view.coordsAtPos(pos);
          const container = getContainer();
          if (container) {
            const rect = container.getBoundingClientRect();
            setPosition({
              top: coords.bottom - rect.top + 4,
              left: coords.left - rect.left,
            });
          }
          clearDismissTimer();
          setLinkInfo({
            type: "wikiLink",
            title: node.attrs.title,
            label: node.attrs.label,
            from: pos,
            to: pos + node.nodeSize,
          });
          return;
        }
      }

      // Text cursor on a link mark
      const { from, empty } = state.selection;
      if (!empty) return;
      const $from = state.doc.resolve(from);
      const marks = $from.marks();
      const linkMark = marks.find((m) => m.type.name === "link");
      if (linkMark) {
        const parent = $from.parent;
        const parentOffset = $from.start();
        let markFrom = from;
        let markTo = from;
        parent.forEach((child, offset) => {
          const nodeFrom = parentOffset + offset;
          const nodeTo = nodeFrom + child.nodeSize;
          if (
            child.marks.some(
              (m) => m.type.name === "link" && m.attrs.href === linkMark.attrs.href
            )
          ) {
            if (from >= nodeFrom && from <= nodeTo) {
              markFrom = nodeFrom;
              markTo = nodeTo;
            }
          }
        });

        const coords = editor.view.coordsAtPos(markFrom);
        const container = getContainer();
        if (container) {
          const rect = container.getBoundingClientRect();
          setPosition({
            top: coords.bottom - rect.top + 4,
            left: coords.left - rect.left,
          });
        }
        clearDismissTimer();
        setLinkInfo({
          type: "link",
          href: linkMark.attrs.href,
          from: markFrom,
          to: markTo,
        });
      }
    }

    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, getContainer, clearDismissTimer]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!linkInfo || !editor) return null;

  function handleEdit() {
    if (!linkInfo) return;
    setEditValue(linkInfo.type === "link" ? linkInfo.href || "" : linkInfo.title || "");
    setEditing(true);
  }

  function handleSave() {
    if (!linkInfo || !editor) return;

    if (linkInfo.type === "link") {
      const { tr } = editor.state;
      const linkType = editor.schema.marks.link;
      tr.removeMark(linkInfo.from, linkInfo.to, linkType);
      tr.addMark(linkInfo.from, linkInfo.to, linkType.create({ href: editValue.trim() }));
      editor.view.dispatch(tr);
    } else {
      const newTitle = editValue.trim();
      if (newTitle) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: linkInfo.from, to: linkInfo.to })
          .insertContentAt(linkInfo.from, {
            type: "wikiLink",
            attrs: { title: newTitle, label: linkInfo.label },
          })
          .run();
      }
    }
    setEditing(false);
    setLinkInfo(null);
  }

  function handleRemove() {
    if (!linkInfo || !editor) return;

    if (linkInfo.type === "link") {
      // Select the link range first so unsetLink knows what to target
      editor
        .chain()
        .focus()
        .setTextSelection({ from: linkInfo.from, to: linkInfo.to })
        .unsetLink()
        .run();
    } else {
      const text = linkInfo.label || linkInfo.title || "";
      const { tr } = editor.state;
      tr.replaceWith(linkInfo.from, linkInfo.to, editor.state.schema.text(text));
      editor.view.dispatch(tr);
    }
    setLinkInfo(null);
    setEditing(false);
  }

  const container = getContainer();
  if (!container) return null;

  return createPortal(
    <div
      className="absolute z-50 border border-border bg-surface shadow-sm text-[12px]"
      style={{ top: position.top, left: position.left, minWidth: "200px" }}
      onMouseEnter={() => {
        bubbleHoveredRef.current = true;
        clearDismissTimer();
      }}
      onMouseLeave={() => {
        bubbleHoveredRef.current = false;
        startDismissTimer();
      }}
    >
      {editing ? (
        <div className="flex items-center gap-1 p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditing(false);
                editor?.commands.focus();
              }
            }}
            className="flex-1 border border-border bg-surface px-2 py-0.5 text-[12px] text-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-0.5 text-[11px] font-bold bg-accent text-accent-foreground hover:bg-accent-hover"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-muted truncate max-w-[200px]">
            {linkInfo.type === "link" ? linkInfo.href : `[[${linkInfo.title}]]`}
          </span>
          <button
            type="button"
            onClick={handleEdit}
            className="text-wiki-link hover:underline whitespace-nowrap"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="text-danger hover:underline whitespace-nowrap"
          >
            Remove
          </button>
        </div>
      )}
    </div>,
    container
  );
}
