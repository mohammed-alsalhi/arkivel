"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Chip } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import type { PropertyTone } from "@/modules/collections/properties";

export type Choice = { id: string; label: string; tone?: PropertyTone };

type Props = {
  id?: string;
  label: string;
  options?: Choice[];
  selected: string[];
  onPick: (option: Choice | null) => void;
  loadOptions?: (query: string) => Promise<Choice[]>;
  children?: ReactNode;
  selection?: ReactNode;
  placeholder?: string;
  compact?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
};

/** One label-aware picker for collection values. Native popovers handle clipping and outside dismissal. */
export function ChoicePicker({ id, label, options = [], selected, onPick, loadOptions, children, selection, placeholder = "empty", compact, multiple, clearable = true, disabled, className }: Props) {
  const uid = useId();
  const panelId = `${uid}-picker`;
  const listId = `${uid}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const [remote, setRemote] = useState<{ query: string; options: Choice[]; loading: boolean; error: boolean } | null>(null);
  const loading = Boolean(loadOptions && (!remote || remote.query !== query || remote.loading));
  const error = Boolean(loadOptions && remote?.query === query && remote.error);
  const matches = loadOptions
    ? loading || error ? [] : remote?.options ?? []
    : options.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const activeIndex = matches.length ? Math.max(0, Math.min(active, matches.length - 1)) : -1;
  const chosen = options.filter((option) => selected.includes(option.id));

  const close = (restoreFocus = false) => {
    panel.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus();
  };
  const pick = (option: Choice | null) => {
    if (disabled) return;
    if (multiple || !option || !selected.includes(option.id)) onPick(option);
    if (!multiple) close(true);
    else { setQuery(""); setActive(0); input.current?.focus(); }
  };

  useEffect(() => {
    if (!open || !loadOptions) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRemote({ query, options: [], loading: true, error: false });
      try {
        const found = await loadOptions(query);
        if (!cancelled) setRemote({ query, options: found, loading: false, error: false });
      } catch {
        if (!cancelled) setRemote({ query, options: [], loading: false, error: true });
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, loadOptions, retry]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const popup = panel.current;
      if (!anchor || !popup) return;
      const width = Math.min(Math.max(anchor.width, 264), window.innerWidth - 16);
      const below = window.innerHeight - anchor.bottom - 12;
      const above = anchor.top - 12;
      const useBelow = below >= 280 || below >= above;
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${Math.max(96, Math.min(360, useBelow ? below : above))}px`;
      popup.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))}px`;
      popup.style.top = `${useBelow ? anchor.bottom + 4 : Math.max(8, anchor.top - popup.offsetHeight - 4)}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    if (panel.current) observer.observe(panel.current);
    input.current?.focus({ preventScroll: true });
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      panel.current?.hidePopover();
    };
    window.addEventListener("resize", position);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const option = document.getElementById(`${uid}-option-${activeIndex}`);
    const list = option?.parentElement;
    if (!option || !list) return;
    const itemRect = option.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    // Scroll only the menu: a top-layer popover still has the table as a DOM ancestor.
    if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
    else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
  }, [open, activeIndex, uid]);

  return (
    <div className={clsx("collections-choice", compact && "collections-choice-compact", className)} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="collections-choice-trigger"
        aria-label={compact ? `edit ${label}` : label}
        aria-describedby={`${uid}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-disabled={disabled || undefined}
        popoverTarget={panelId}
        onClick={(event) => {
          if (disabled) { event.preventDefault(); return; }
          setQuery("");
          setActive(Math.max(0, options.findIndex((option) => selected.includes(option.id))));
        }}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !disabled) {
            event.preventDefault();
            if (!open) event.currentTarget.click();
            else input.current?.focus();
          }
        }}
      >
        <span id={`${uid}-value`} className="collections-choice-value">
          {children ?? (chosen.length ? chosen.map((option) => option.tone !== undefined
            ? <Chip key={option.id} tone={option.tone}>{option.label}</Chip>
            : <span key={option.id}>{option.label}</span>) : <span className="collections-choice-placeholder">{placeholder}</span>)}
        </span>
        <svg className="collections-choice-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 6 3 3 3-3" /></svg>
      </button>
      <div
        ref={panel}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label={`choose ${label}`}
        className="collections-choice-popover"
        style={open ? undefined : { visibility: "hidden" }}
        onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
        }}
      >
        <div className="collections-choice-search">
          <SearchIcon />
          <input
            ref={input}
            role="combobox"
            aria-label={`search ${label}`}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? `${uid}-option-${activeIndex}` : undefined}
            placeholder={`search ${label}…`}
            autoComplete="off"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (matches[activeIndex]) pick(matches[activeIndex]);
              } else if ((event.key === "Home" || event.key === "End") && !query) {
                event.preventDefault();
                setActive(event.key === "Home" ? 0 : matches.length - 1);
              }
            }}
          />
        </div>
        {selection && (
          <div
            className="collections-choice-selection"
            role="group"
            aria-label={`selected ${label}`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => input.current?.focus({ preventScroll: true })}
          >
            {selection}
          </div>
        )}
        <div className="collections-choice-list" id={listId} role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} aria-busy={loading}>
          {matches.map((option, index) => (
            <div
              key={option.id}
              id={`${uid}-option-${index}`}
              role="option"
              aria-selected={selected.includes(option.id)}
              aria-disabled={disabled || undefined}
              className={clsx("collections-choice-option", index === activeIndex && "collections-choice-option-active")}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
            >
              {option.tone !== undefined ? <Chip tone={option.tone}>{option.label}</Chip> : <span>{option.label}</span>}
              {selected.includes(option.id) && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3.5 8 3 3 6-6" /></svg>}
            </div>
          ))}
        </div>
        {(loading || error || matches.length === 0) && <div className="collections-choice-message" role="status">
          {loading ? "searching…" : error ? <>could not load options. <button type="button" onClick={() => setRetry((value) => value + 1)}>retry</button></> : "no matching options"}
        </div>}
        {clearable && selected.length > 0 && <button className="collections-choice-clear" type="button" disabled={disabled} onClick={() => pick(null)}>{multiple ? "clear selection" : "clear value"}</button>}
      </div>
    </div>
  );
}
