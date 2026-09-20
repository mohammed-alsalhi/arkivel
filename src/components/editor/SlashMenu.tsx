"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { filterSlashCommands, getSlashQuery, type SlashCommand, type SlashCommandId } from "./slashCommands";

export type SlashKeyHandler = (event: KeyboardEvent) => boolean;

type SlashState = {
  /** Document position of the `/` that opened the menu. */
  anchor: number;
  query: string;
};

type Position = { top: number; left: number; above: boolean };

type Props = {
  editor: Editor | null;
  /** The positioned wrapper the menu is absolutely placed inside. */
  containerRef: RefObject<HTMLElement | null>;
  /** The editor's keydown interceptor slot; the menu owns it while open. */
  keyHandlerRef: RefObject<SlashKeyHandler | null>;
  onRun: (id: SlashCommandId, range: { from: number; to: number }) => void;
};

const MENU_HEIGHT_GUESS = 300;

function textBeforeCursor(editor: Editor): { text: string; parentStart: number; pos: number; inCode: boolean } {
  const { $from } = editor.state.selection;
  return {
    text: $from.parent.textBetween(0, $from.parentOffset, undefined, "￼"),
    parentStart: $from.start(),
    pos: $from.pos,
    inCode: $from.parent.type.name === "codeBlock",
  };
}

/** Notion-style `/` menu: opens when a slash is typed at the start of a block
 *  or after a space, narrows as the user keeps typing, and replaces `/query`
 *  with the chosen block. Arrow keys, enter, tab, and escape are intercepted
 *  through `keyHandlerRef` so the editor never sees them while it is open. */
export default function SlashMenu({ editor, containerRef, keyHandlerRef, onRun }: Props) {
  const [state, setState] = useState<SlashState | null>(null);
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const items = state ? filterSlashCommands(state.query) : [];

  // The editor's keydown interceptor and transaction listener read the latest
  // state through refs so they never go stale between renders.
  const stateRef = useRef(state);
  const itemsRef = useRef(items);
  const indexRef = useRef(index);
  useLayoutEffect(() => {
    stateRef.current = state;
    itemsRef.current = items;
    indexRef.current = index;
  });

  const close = useCallback(() => setState(null), []);

  const run = useCallback((command: SlashCommand) => {
    const current = stateRef.current;
    if (!editor || !current) return;
    const to = editor.state.selection.from;
    setState(null);
    onRun(command.id, { from: current.anchor, to });
  }, [editor, onRun]);

  // Track the document: open on a freshly typed slash, follow the query, close
  // when the cursor leaves the `/query` span or the query stops matching.
  useEffect(() => {
    if (!editor) return;

    const update = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      const current = stateRef.current;
      const { empty } = editor.state.selection;
      if (!empty) {
        if (current) setState(null);
        return;
      }
      const before = textBeforeCursor(editor);
      if (before.inCode) {
        if (current) setState(null);
        return;
      }
      const slash = getSlashQuery(before.text);
      const anchor = slash ? before.parentStart + slash.slashOffset : null;

      if (current) {
        if (slash && anchor === current.anchor) {
          if (filterSlashCommands(slash.query).length === 0) setState(null);
          else if (slash.query !== current.query) {
            setState({ anchor: current.anchor, query: slash.query });
            setIndex(0);
          }
        } else {
          setState(null);
        }
        return;
      }

      if (slash && slash.query === "" && transaction.docChanged && anchor !== null) {
        setState({ anchor, query: "" });
        setIndex(0);
      }
    };

    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  // Place the menu under the slash, flipping above it near the bottom of the viewport.
  useLayoutEffect(() => {
    if (!editor || !state || !containerRef.current) {
      setPosition(null);
      return;
    }
    const coords = editor.view.coordsAtPos(state.anchor);
    const rect = containerRef.current.getBoundingClientRect();
    const above = coords.bottom + MENU_HEIGHT_GUESS > window.innerHeight && coords.top - rect.top > MENU_HEIGHT_GUESS;
    const menuWidth = menuRef.current?.offsetWidth ?? 280;
    const left = Math.max(0, Math.min(coords.left - rect.left, rect.width - menuWidth));
    setPosition({
      top: above ? coords.top - rect.top - 4 : coords.bottom - rect.top + 4,
      left,
      above,
    });
  }, [editor, state, containerRef]);

  // Own the editor's keydown slot while open.
  useEffect(() => {
    if (!state) {
      keyHandlerRef.current = null;
      return;
    }
    keyHandlerRef.current = (event) => {
      const list = itemsRef.current;
      if (event.key === "ArrowDown") {
        setIndex((value) => (value + 1) % Math.max(list.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((value) => (value - 1 + list.length) % Math.max(list.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const command = list[indexRef.current];
        if (command) run(command);
        else close();
        return true;
      }
      if (event.key === "Escape") {
        close();
        return true;
      }
      return false;
    };
    return () => {
      keyHandlerRef.current = null;
    };
  }, [state, keyHandlerRef, run, close]);

  useEffect(() => {
    if (!state) return;
    const selected = menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [index, state]);

  if (!state || !position || items.length === 0) return null;

  const groups = [
    { key: "basic", label: "blocks", items: items.filter((item) => item.group === "basic") },
    { key: "media", label: "insert", items: items.filter((item) => item.group === "media") },
  ].filter((group) => group.items.length > 0);

  return (
    <div
      ref={menuRef}
      className="editor-slash-menu"
      role="listbox"
      aria-label="Insert block"
      data-testid="editor-slash-menu"
      style={{
        top: position.top,
        left: position.left,
        transform: position.above ? "translateY(-100%)" : undefined,
      }}
      // Keep the editor focused while pointing at the menu.
      onMouseDown={(event) => event.preventDefault()}
    >
      {groups.map((group) => (
        <div key={group.key} className="editor-slash-group">
          <div className="editor-slash-group-label">{group.label}</div>
          {group.items.map((command) => {
            const commandIndex = items.indexOf(command);
            return (
              <button
                key={command.id}
                type="button"
                role="option"
                aria-selected={commandIndex === index}
                className="editor-slash-item"
                onMouseEnter={() => setIndex(commandIndex)}
                onClick={() => run(command)}
              >
                <span className="editor-slash-item-label">{command.label}</span>
                <span className="editor-slash-item-hint">{command.hint}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
