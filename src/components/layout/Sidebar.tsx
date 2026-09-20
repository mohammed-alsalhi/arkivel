"use client";

import DocumentationNavigation from "@/components/documentation/DocumentationNavigation";
import type { DocumentationIndex } from "@/documentation";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useAdmin, useLoggedIn } from "@/components/AdminContext";
import BrandMark from "@/components/brand/BrandMark";
import { FolderIcon, NavIcon, SearchIcon } from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette, { openCommandPalette } from "@/components/layout/CommandPalette";
import UserMenu from "@/components/layout/UserMenu";
import { config } from "@/lib/config";
import { currentSkin } from "@/lib/skin";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { generateSlug } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";
import { useEnabledModules } from "@/modules/client";
import { composeNav } from "@/modules/navigation";

export type SidebarCollection = { id: string; name: string; slug: string; categoryId: string | null };
import type { NavEntry } from "@/modules/types";

type Category = {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
};

/** localStorage key for the desktop collapse state (folio skin only). */
const COLLAPSED_STORAGE_KEY = "sidebar:collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";
const TOOLTIP_ID = "wiki-sidebar-tooltip";
const COLLAPSE_LABEL = "collapse sidebar";
const EXPAND_LABEL = "expand sidebar";

function safePathSegment(value: string | null | undefined, fallback: string, id: string): string {
  const raw = (value?.trim() || generateSlug(fallback) || id).replace(/^\/+|\/+$/g, "");
  return encodeURIComponent(raw);
}

function categoryPath(category: Category): string {
  return `/categories/${safePathSegment(category.slug, category.name, category.id)}`;
}

function isPathActive(pathname: string, href: string): boolean {
  try {
    const current = decodeURIComponent(pathname);
    const target = decodeURIComponent(href);
    return current === target || current.startsWith(`${target}/`);
  } catch {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
}

/** Whether a nav row is the current page; "all pages" also covers article pages but not the editor. */
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/articles") {
    return pathname === "/articles" || (pathname.startsWith("/articles/") && pathname !== "/articles/new");
  }
  return isPathActive(pathname, href);
}

/** localStorage key for a space's open/closed state. */
function openStateKey(id: string): string {
  return `sidebar:open:${id}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

const navIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ChevronIcon() {
  return (
    <svg {...navIconProps} width={14} height={14} strokeWidth={2}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ChevronsLeftIcon() {
  return (
    <svg {...navIconProps}>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon() {
  return (
    <svg {...navIconProps}>
      <path d="m13 17 5-5-5-5" />
      <path d="m6 17 5-5-5-5" />
    </svg>
  );
}

const subscribeToNothing = () => () => {};
const isApplePlatform = () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
const isFolioSkin = () => currentSkin() === "folio";

function subscribeToDesktop(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isDesktopViewport = () =>
  typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;

/**
 * Desktop collapse state, persisted under `sidebar:collapsed`. The server
 * always renders expanded; the stored value is read only after mount so the
 * first client paint matches the markup and hydration never mismatches.
 */
function usePersistedCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      // Storage may be unavailable (private mode, blocked); keep expanded.
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore quota or availability errors; the state still toggles.
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}

type Tooltip = { label: string; top: number; left: number };

/** Hover/focus handlers that show the collapsed-mode tooltip for one control. */
type TooltipHandlers = {
  "aria-describedby"?: string;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: () => void;
};

export default function Sidebar({
  brandName,
  categories,
  collections = [],
  articleCount = 0,
  documentation,
  logoMark,
}: {
  brandName: string;
  categories: Category[];
  collections?: SidebarCollection[];
  articleCount?: number;
  documentation?: DocumentationIndex;
  logoMark: string;
}) {
  const pathname = usePathname();
  const loggedIn = useLoggedIn();
  const admin = useAdmin();
  const enabledModules = useEnabledModules();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  // null on the server and during hydration, so the kbd hint never mismatches.
  const isMac = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => null);
  // Collapse mode exists only in the folio skin at desktop widths; the mobile
  // drawer and the wiki skin always render the full tree.
  const isFolio = useSyncExternalStore(subscribeToNothing, isFolioSkin, () => false);
  const isDesktop = useSyncExternalStore(subscribeToDesktop, isDesktopViewport, () => false);
  const [storedCollapsed, toggleCollapsed] = usePersistedCollapsed();
  const canCollapse = isFolio && isDesktop;
  const collapsed = canCollapse && storedCollapsed;

  // Navigating from the palette bypasses the link onClick handlers, so close
  // the drawer whenever the route changes (adjusting state during render).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setTooltip(null);
  }

  useScrollLock(mobileOpen);
  useFocusTrap(asideRef, mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const showTooltip = useCallback((element: HTMLElement, label: string) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  // ⌘B / Ctrl+B toggles the desktop sidebar, the same chord editors use for
  // their sidebars and the one advertised on the footer button. Typing wins:
  // inside a field the chord keeps its editing meaning (bold).
  useEffect(() => {
    if (!canCollapse) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "b") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      hideTooltip();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canCollapse, hideTooltip, toggleCollapsed]);

  const close = () => setMobileOpen(false);

  // Navigation composes from the core list plus the enabled modules' entries,
  // filtered by what the reader may see (member / admin rows).
  const auth = { admin, loggedIn };
  const topEntries = composeNav("top", enabledModules, auth);
  const libraryEntries = composeNav("library", enabledModules, auth);
  const spaceEntries = composeNav("spaces", enabledModules, auth);
  const footerEntries = composeNav("footer", enabledModules, auth);

  /** Collapsed rows have no visible label, so they describe themselves on hover/focus. */
  const tooltipProps = (label: string): TooltipHandlers => {
    if (!collapsed) return {};
    return {
      "aria-describedby": TOOLTIP_ID,
      onMouseEnter: (event) => showTooltip(event.currentTarget, label),
      onMouseLeave: hideTooltip,
      onFocus: (event) => showTooltip(event.currentTarget, label),
      onBlur: hideTooltip,
    };
  };

  const renderEntry = (entry: NavEntry) => (
    <SidebarLink
      key={entry.href}
      href={entry.href}
      active={isNavActive(pathname, entry.href)}
      onClick={close}
      icon={<NavIcon name={entry.icon} />}
      collapsed={collapsed}
      tooltip={tooltipProps(entry.label)}
    >
      {entry.label}
    </SidebarLink>
  );

  const onToggleCollapse = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const nextCollapsed = !collapsed;
    toggleCollapsed();
    if (!nextCollapsed) {
      hideTooltip();
      return;
    }
    // The rail animates to its collapsed width; anchor the tooltip once it
    // has settled (or straight away when nothing transitions).
    const aside = asideRef.current;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      aside?.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timer);
      showTooltip(button, EXPAND_LABEL);
    };
    const onTransitionEnd = (transition: TransitionEvent) => {
      if (transition.target === aside && transition.propertyName === "width") settle();
    };
    aside?.addEventListener("transitionend", onTransitionEnd);
    const timer = window.setTimeout(settle, 200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        aria-controls="wiki-navigation"
        className="wiki-main-menu-button"
      >
        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="wiki-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={close}
        />
      )}

      <aside
        ref={asideRef}
        id="wiki-navigation"
        className={clsx("wiki-sidebar", mobileOpen && "wiki-sidebar-open", collapsed && "wiki-sidebar-collapsed")}
        aria-label="Wiki navigation"
        // As a mobile drawer this covers the page, so it becomes a modal dialog.
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
      >
        {/* Workspace row: mark + name, like a workspace switcher without the menu. */}
        <Link
          href="/"
          className="wiki-sidebar-brand"
          aria-label={`${brandName} home`}
          onClick={close}
          {...tooltipProps(brandName)}
        >
          <BrandMark className="wiki-sidebar-brand-mark" imageSize={42} logoMark={logoMark} priority />
          <span className={clsx("wiki-sidebar-brand-name", collapsed && "ui-sr-only")}>{brandName}</span>
        </Link>

        <div className="wiki-sidebar-scroll" data-overlay-scrollbar={collapsed ? "off" : undefined}>
          <nav className="wiki-sidebar-navigation">
            {/* Top group: search, inbox, new page (no section header). */}
            <div className="wiki-sidebar-section-links wiki-sidebar-top-group">
              <button
                type="button"
                className="wiki-sidebar-link wiki-sidebar-search-trigger"
                aria-label={`Search ${brandName}`}
                aria-keyshortcuts="Meta+K Control+K"
                onClick={openCommandPalette}
                {...tooltipProps("search")}
              >
                <span className="wiki-sidebar-link-icon">
                  <SearchIcon />
                </span>
                <span className={clsx("wiki-sidebar-link-label", collapsed && "ui-sr-only")}>search</span>
                {!collapsed && isMac !== null && <kbd aria-hidden="true">{isMac ? "⌘K" : "ctrl K"}</kbd>}
              </button>
              {topEntries.map(renderEntry)}
            </div>

            {documentation && !collapsed && <DocumentationNavigation index={documentation} onNavigate={close} />}

            <SidebarSection title="library" collapsed={collapsed}>
              {libraryEntries.map(renderEntry)}
            </SidebarSection>

            {/* Collapsed, the spaces tree has no icon-only form: only its
                divider remains, like the reference's collapsed section labels. */}
            <SidebarSection title="spaces" collapsed={collapsed}>
              {spaceEntries.map(renderEntry)}
              {collapsed ? null : categories.length > 0 ? (
                categories.map((category) => (
                  <SidebarCategory
                    key={category.id}
                    category={category}
                    collections={collections}
                    pathname={pathname}
                    onNavigate={close}
                  />
                ))
              ) : (
                <p className="wiki-sidebar-empty">no spaces yet</p>
              )}
              {!collapsed &&
                collections
                  .filter((collection) => collection.categoryId === null)
                  .map((collection) => (
                    <SidebarCollectionRow
                      key={collection.id}
                      collection={collection}
                      pathname={pathname}
                      onNavigate={close}
                    />
                  ))}
            </SidebarSection>
          </nav>
        </div>

        <div className="wiki-sidebar-footer">
          {footerEntries.map(renderEntry)}
          <div className="wiki-sidebar-footer-row">
            {!collapsed && (
              <div className="wiki-sidebar-footer-copy">
                <span>{articleCount.toLocaleString()} pages</span>
                <span aria-hidden="true">·</span>
                <span>v{config.version}</span>
              </div>
            )}
            <div className="wiki-sidebar-footer-actions">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          <button
            type="button"
            className="wiki-sidebar-link wiki-sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? EXPAND_LABEL : COLLAPSE_LABEL}
            aria-keyshortcuts="Meta+B Control+B"
            {...tooltipProps(EXPAND_LABEL)}
          >
            <span className="wiki-sidebar-link-icon">
              {collapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
            </span>
            <span className={clsx("wiki-sidebar-link-label", collapsed && "ui-sr-only")}>
              {collapsed ? EXPAND_LABEL : COLLAPSE_LABEL}
            </span>
          </button>
        </div>
      </aside>

      {collapsed &&
        tooltip &&
        createPortal(
          <div
            id={TOOLTIP_ID}
            role="tooltip"
            className="wiki-sidebar-tooltip"
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}

      <CommandPalette />
    </>
  );
}

function SidebarSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const id = `sidebar-${title}`;
  return (
    <section className="wiki-sidebar-section" aria-labelledby={id}>
      <div className="wiki-sidebar-section-header">
        <h2 id={id} className={clsx("wiki-sidebar-section-title", collapsed && "ui-sr-only")}>
          {title}
        </h2>
        {collapsed && <span className="wiki-sidebar-section-divider" aria-hidden="true" />}
      </div>
      {children != null && <div className="wiki-sidebar-section-links">{children}</div>}
    </section>
  );
}

/**
 * Open/closed state for a space, persisted per category id. The default is
 * rendered on the server (top level open, deeper levels closed); the stored
 * value is read only after mount so hydration never mismatches.
 */
function usePersistedOpen(id: string, defaultOpen: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(defaultOpen);
  const key = openStateKey(id);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === "1") setOpen(true);
      else if (stored === "0") setOpen(false);
    } catch {
      // Storage may be unavailable (private mode, blocked); keep the default.
    }
  }, [key]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Ignore quota or availability errors; the state still toggles.
      }
      return next;
    });
  };

  return [open, toggle];
}

/** A collection row inside the spaces tree, aligned with the category rows. */
function SidebarCollectionRow({
  collection,
  pathname,
  onNavigate,
  depth = 0,
}: {
  collection: SidebarCollection;
  pathname: string;
  onNavigate: () => void;
  depth?: number;
}) {
  const href = `/collections/${encodeURIComponent(collection.slug)}`;
  const active = isPathActive(pathname, href);
  return (
    <div
      className={clsx("wiki-sidebar-row", active && "wiki-sidebar-row-active")}
      style={{ "--depth": depth } as CSSProperties}
    >
      <span className="wiki-sidebar-chevron-spacer" aria-hidden="true" />
      <SidebarLink href={href} active={active} onClick={onNavigate} icon={<NavIcon name="table" />}>
        {collection.name}
      </SidebarLink>
    </div>
  );
}

function SidebarCategory({
  category,
  collections = [],
  pathname,
  onNavigate,
  depth = 0,
}: {
  category: Category;
  collections?: SidebarCollection[];
  pathname: string;
  onNavigate: () => void;
  depth?: number;
}) {
  const href = categoryPath(category);
  const children = category.children ?? [];
  const ownCollections = collections.filter((collection) => collection.categoryId === category.id);
  const hasChildren = children.length > 0 || ownCollections.length > 0;
  const [open, toggle] = usePersistedOpen(category.id, depth === 0);
  const childrenId = `sidebar-space-${category.id}-children`;
  const active = isPathActive(pathname, href);

  return (
    <div className="wiki-sidebar-category">
      <div
        className={clsx("wiki-sidebar-row", active && "wiki-sidebar-row-active")}
        style={{ "--depth": depth } as CSSProperties}
      >
        {hasChildren ? (
          <button
            type="button"
            className={clsx("wiki-sidebar-chevron", open && "wiki-sidebar-chevron-open")}
            aria-expanded={open}
            aria-controls={childrenId}
            aria-label={`${open ? "collapse" : "expand"} ${category.name}`}
            onClick={toggle}
          >
            <ChevronIcon />
          </button>
        ) : (
          <span className="wiki-sidebar-chevron-spacer" aria-hidden="true" />
        )}
        <SidebarLink href={href} active={active} onClick={onNavigate} icon={<FolderIcon />}>
          {category.name}
        </SidebarLink>
      </div>
      {hasChildren && open && (
        <div id={childrenId} className="wiki-sidebar-category-children">
          {children.map((child) => (
            <SidebarCategory
              key={child.id}
              category={child}
              collections={collections}
              pathname={pathname}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
          {ownCollections.map((collection) => (
            <SidebarCollectionRow
              key={collection.id}
              collection={collection}
              pathname={pathname}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  href,
  active,
  onClick,
  children,
  icon,
  collapsed = false,
  tooltip,
}: {
  href: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  collapsed?: boolean;
  tooltip?: TooltipHandlers;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={clsx("wiki-sidebar-link", active && "wiki-sidebar-link-active")}
      title={!collapsed && typeof children === "string" ? children : undefined}
      {...tooltip}
    >
      {icon && <span className="wiki-sidebar-link-icon">{icon}</span>}
      <span className={clsx("wiki-sidebar-link-label", collapsed && "ui-sr-only")}>{children}</span>
    </Link>
  );
}
