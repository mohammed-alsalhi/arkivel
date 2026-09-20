"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAdmin, useLoggedIn } from "@/components/AdminContext";
import { applySkin, currentSkin } from "@/lib/skin";
import { toggleTheme } from "@/lib/theme";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useScrollLock } from "@/lib/useScrollLock";
import type { WikiSkin } from "@/lib/config";
import { useEnabledModules } from "@/modules/client";
import { composeCommands } from "@/modules/navigation";

export const OPEN_PALETTE_EVENT = "arkivel:open-palette";

/** Ask the mounted palette to open (from any element, without prop drilling). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
}

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  category?: { name: string } | null;
};

type Section = "pages" | "go to" | "actions";

type PaletteItem = {
  id: string;
  section: Section;
  label: string;
  detail?: string;
  run: () => void;
};

const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

function matches(query: string, label: string, keywords: string[]): boolean {
  if (!query) return true;
  return label.toLowerCase().includes(query) || keywords.some((keyword) => keyword.toLowerCase().includes(query));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function optionId(index: number) {
  return `command-palette-option-${index}`;
}

export default function CommandPalette() {
  const router = useRouter();
  const admin = useAdmin();
  const loggedIn = useLoggedIn();
  const enabledModules = useEnabledModules();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [skin, setSkin] = useState<WikiSkin>("folio");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useScrollLock(open);
  useFocusTrap(panelRef, open);

  const close = useCallback(() => setOpen(false), []);

  const openPalette = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearching(false);
    setActiveIndex(0);
    setSkin(currentSkin());
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K anywhere, plus the custom event any trigger can dispatch.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || event.altKey || event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;
      // While typing, only the universal ⌘K wins; Ctrl+K keeps its editing
      // meaning. Inside the open palette either chord toggles it closed.
      if (!open && isEditableTarget(event.target) && !event.metaKey) return;
      event.preventDefault();
      if (open) close();
      else openPalette();
    }
    function onOpenRequest() {
      openPalette();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    };
  }, [open, close, openPalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Live page search: debounced, and stale responses are aborted.
  const trimmedQuery = query.trim();
  useEffect(() => {
    if (!open || trimmedQuery.length < MIN_QUERY_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=${SEARCH_LIMIT}`,
          { signal: controller.signal },
        );
        const data = response.ok ? await response.json() : { results: [] };
        if (controller.signal.aborted) return;
        setResults(Array.isArray(data.results) ? data.results : []);
        setSearching(false);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmedQuery]);

  // "go to" composes from the core destinations plus the enabled modules'
  // commands, filtered by what this reader may open.
  const goTo = useMemo(
    () => composeCommands(enabledModules, { admin, loggedIn }),
    [admin, enabledModules, loggedIn],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const q = trimmedQuery.toLowerCase();
    const list: PaletteItem[] = [];

    for (const result of results) {
      list.push({
        id: `page:${result.id}`,
        section: "pages",
        label: result.title,
        detail: result.category?.name ?? undefined,
        run: () => router.push(`/articles/${encodeURIComponent(result.slug)}`),
      });
    }
    if (trimmedQuery) {
      list.push({
        id: "page:search-all",
        section: "pages",
        label: `search all pages for '${trimmedQuery}' →`,
        run: () => router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`),
      });
    }

    for (const entry of goTo) {
      if (!matches(q, entry.label, entry.keywords)) continue;
      list.push({
        id: `goto:${entry.href}`,
        section: "go to",
        label: entry.label,
        run: () => router.push(entry.href),
      });
    }

    const otherSkin: WikiSkin = skin === "folio" ? "wiki" : "folio";
    const actions: Array<{ id: string; label: string; keywords: string[]; run: () => void }> = [
      {
        id: "action:toggle-theme",
        label: "toggle dark mode",
        keywords: ["theme", "light", "dark", "appearance"],
        run: () => {
          toggleTheme();
        },
      },
      {
        id: `action:skin-${otherSkin}`,
        label: `use ${otherSkin} skin`,
        keywords: ["skin", "layout", "appearance", "theme", otherSkin],
        run: () => {
          applySkin(otherSkin);
          router.refresh();
        },
      },
      {
        id: "action:copy-link",
        label: "copy page link",
        keywords: ["url", "share", "clipboard", "address"],
        run: () => {
          void navigator.clipboard?.writeText(window.location.href);
        },
      },
    ];
    for (const action of actions) {
      if (!matches(q, action.label, action.keywords)) continue;
      list.push({ id: action.id, section: "actions", label: action.label, run: action.run });
    }

    return list;
  }, [goTo, results, router, skin, trimmedQuery]);

  const highlighted = items.length === 0 ? -1 : Math.min(activeIndex, items.length - 1);

  useEffect(() => {
    if (!open || highlighted < 0) return;
    const element = document.getElementById(optionId(highlighted));
    if (element && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlighted]);

  function activate(index: number) {
    const item = items[index];
    if (!item) return;
    close();
    item.run();
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
    const ready = value.trim().length >= MIN_QUERY_LENGTH;
    setSearching(ready);
    if (!ready) setResults([]);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        // Keep the mobile navigation drawer (which also listens for Escape) open.
        event.stopPropagation();
        close();
        return;
      case "ArrowDown":
        event.preventDefault();
        if (items.length) setActiveIndex((highlighted + 1) % items.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (items.length) setActiveIndex((highlighted - 1 + items.length) % items.length);
        return;
      case "Home":
        if (isEditableTarget(event.target) && query) return;
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        if (isEditableTarget(event.target) && query) return;
        event.preventDefault();
        setActiveIndex(Math.max(items.length - 1, 0));
        return;
      case "Enter":
        event.preventDefault();
        activate(highlighted);
        return;
      default:
        return;
    }
  }

  if (!open || typeof document === "undefined") return null;

  const sections: Section[] = ["pages", "go to", "actions"];
  const showPages = trimmedQuery.length >= MIN_QUERY_LENGTH;
  let runningIndex = -1;

  return createPortal(
    <div className="command-palette-overlay" onKeyDown={onKeyDown}>
      <div className="command-palette-backdrop" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="search pages, jump to, or run a command…"
          aria-label="Search pages, jump to, or run a command"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-autocomplete="list"
          aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        <div id="command-palette-list" className="command-palette-list" role="listbox" aria-label="Results">
          {sections.map((section) => {
            const sectionItems = items.filter((item) => item.section === section);
            const isPages = section === "pages";
            if (!sectionItems.length && !(isPages && showPages)) return null;
            const headingId = `command-palette-section-${section.replace(/\s+/g, "-")}`;
            const pageHits = isPages ? sectionItems.filter((item) => item.id !== "page:search-all").length : 0;
            return (
              <div key={section} role="group" aria-labelledby={headingId} className="command-palette-section">
                <div id={headingId} className="command-palette-section-title" role="presentation">
                  {section}
                </div>
                {isPages && showPages && searching && (
                  <div className="command-palette-status" aria-live="polite">
                    searching…
                  </div>
                )}
                {isPages && showPages && !searching && pageHits === 0 && (
                  <div className="command-palette-status" aria-live="polite">
                    no pages match
                  </div>
                )}
                {sectionItems.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const selected = index === highlighted;
                  return (
                    <div
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      className="command-palette-option"
                      onMouseMove={() => {
                        if (activeIndex !== index) setActiveIndex(index);
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => activate(index)}
                    >
                      <span className="command-palette-option-label">{item.label}</span>
                      {item.detail && <span className="command-palette-option-detail">{item.detail}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {items.length === 0 && !showPages && (
            <div className="command-palette-status">nothing matches</div>
          )}
        </div>

        <div className="command-palette-footer" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
