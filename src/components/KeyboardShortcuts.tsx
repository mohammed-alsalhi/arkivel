"use client";

import { useState, useEffect } from "react";
import {
  loadShortcuts,
  SHORTCUT_LABELS,
  SHORTCUT_DESTINATIONS,
  type ShortcutMap,
} from "@/lib/shortcuts";
import { Button, DataTable } from "@/components/ui";
import { useScrollLock } from "@/lib/useScrollLock";

function buildNavMap(shortcuts: ShortcutMap): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of Object.keys(shortcuts) as (keyof ShortcutMap)[]) {
    map[shortcuts[key]] = SHORTCUT_DESTINATIONS[key];
  }
  return map;
}

function buildShortcutGroups(shortcuts: ShortcutMap) {
  return [
    {
      category: "Navigation",
      items: [
        ...(Object.keys(shortcuts) as (keyof ShortcutMap)[]).map((k) => ({
          keys: shortcuts[k].split("").map((c, i) => (i === 0 && shortcuts[k].length > 1 ? c : c)),
          description: SHORTCUT_LABELS[k],
        })),
        { keys: ["/"], description: "Focus search bar" },
      ],
    },
    {
      category: "Article Page",
      items: [
        { keys: ["R"], description: "Toggle reading mode" },
        { keys: ["E"], description: "Edit article (admin/editor)" },
      ],
    },
    {
      category: "Editor",
      items: [
        { keys: ["Ctrl+B"], description: "Bold" },
        { keys: ["Ctrl+I"], description: "Italic" },
        { keys: ["Ctrl+K"], description: "Insert link" },
        { keys: ["Ctrl+Z"], description: "Undo" },
        { keys: ["Ctrl+Shift+Z"], description: "Redo" },
        { keys: ["Ctrl+S"], description: "Save article" },
        { keys: ["/"], description: "Slash command menu" },
      ],
    },
    {
      category: "General",
      items: [
        { keys: ["?"], description: "Show this dialog" },
        { keys: ["Esc"], description: "Close dialog / blur input" },
      ],
    },
  ];
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(loadShortcuts);

  useScrollLock(open);

  useEffect(() => {
    setShortcuts(loadShortcuts());
  }, []);

  const SHORTCUT_GROUPS = buildShortcutGroups(shortcuts);

  useEffect(() => {
    let pending = "";
    let timer: ReturnType<typeof setTimeout>;
    const nav = buildNavMap(shortcuts);

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
        search?.focus();
        return;
      }

      clearTimeout(timer);
      pending += e.key.toLowerCase();
      timer = setTimeout(() => { pending = ""; }, 500);

      if (nav[pending]) {
        window.location.href = nav[pending];
        pending = "";
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="modal-header">Keyboard Shortcuts</div>
        <div className="modal-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SHORTCUT_GROUPS.map(({ category, items }) => (
              <div key={category}>
                <h3 className="text-[10px] font-semibold uppercasest text-muted mb-2">
                  {category}
                </h3>
                <DataTable className="text-[12px]">
                  <tbody>
                    {items.map((s, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap">
                          {s.keys.map((k, j) => (
                            <span key={j}>
                              {j > 0 && <span className="text-muted mx-1">then</span>}
                              <kbd>{k}</kbd>
                            </span>
                          ))}
                        </td>
                        <td className="text-muted">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <span className="text-[11px] text-muted mr-auto">Press <kbd>?</kbd> again to close</span>
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
