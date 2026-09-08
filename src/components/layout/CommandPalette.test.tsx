import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, refresh }),
}));

// An administrator sees every "go to" destination, member and admin rows included.
vi.mock("@/components/AdminContext", () => ({
  useAdmin: () => true,
  useLoggedIn: () => true,
}));

import CommandPalette, { openCommandPalette } from "@/components/layout/CommandPalette";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = vi.fn();

let container: HTMLDivElement;
let root: Root;

function dialog() {
  return document.querySelector<HTMLElement>('[role="dialog"][aria-label="Command palette"]');
}

function input() {
  return document.querySelector<HTMLInputElement>(".command-palette-input");
}

function options() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
}

function selectedOption() {
  return document.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
}

function key(target: EventTarget, init: KeyboardEventInit) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  });
}

function openWithShortcut(init: KeyboardEventInit = { key: "k", metaKey: true }) {
  key(window, init);
}

function typeQuery(value: string) {
  const element = input();
  if (!element) throw new Error("palette input is not mounted");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function flush(ms: number) {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
}

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: "a1", title: "Architecture decisions", slug: "architecture-decisions", category: { name: "Engineering" } },
          { id: "a2", title: "Archive policy", slug: "archive-policy", category: null },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    document.documentElement.setAttribute("data-skin", "folio");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<CommandPalette />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("stays closed until ⌘K / Ctrl+K and then exposes a modal dialog", () => {
    expect(dialog()).toBeNull();

    openWithShortcut();

    const panel = dialog();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(input());
    expect(input()?.getAttribute("placeholder")).toBe("search pages, jump to, or run a command…");
    // Core destinations first, then the enabled modules' commands in registry order.
    expect(options().map((option) => option.textContent)).toEqual([
      "all pages",
      "inbox",
      "tags",
      "search",
      "new page",
      "settings",
      "admin",
      "collections",
      "new collection",
      "graph",
      "assets",
      "import",
      "export",
      "api reference",
      "api tokens",
      "toggle dark mode",
      "use wiki skin",
      "copy page link",
    ]);
  });

  it("opens with Ctrl+K and ignores Ctrl+K while typing in a field, but not ⌘K", () => {
    const field = document.createElement("textarea");
    document.body.appendChild(field);
    field.focus();

    key(field, { key: "k", ctrlKey: true });
    expect(dialog()).toBeNull();

    key(field, { key: "k", metaKey: true });
    expect(dialog()).not.toBeNull();
    key(dialog()!, { key: "Escape" });

    field.focus();
    field.remove();
    openWithShortcut({ key: "k", ctrlKey: true });
    expect(dialog()).not.toBeNull();
  });

  it("opens from the custom event helper", () => {
    act(() => {
      openCommandPalette();
    });
    expect(dialog()).not.toBeNull();
  });

  it("closes on Escape and restores focus to the previous element", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    openWithShortcut();
    expect(dialog()).not.toBeNull();

    key(input()!, { key: "Escape" });

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes when the backdrop is clicked", () => {
    openWithShortcut();
    act(() => {
      document.querySelector<HTMLElement>(".command-palette-backdrop")?.click();
    });
    expect(dialog()).toBeNull();
  });

  it("moves the highlight with arrow keys, wrapping at both ends", () => {
    openWithShortcut();
    const field = input()!;
    const first = options()[0];
    const last = options()[options().length - 1];

    expect(selectedOption()?.textContent).toBe("all pages");
    expect(field.getAttribute("aria-activedescendant")).toBe(first.id);

    key(field, { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toBe("inbox");
    expect(field.getAttribute("aria-activedescendant")).toBe(options()[1].id);

    key(field, { key: "ArrowUp" });
    key(field, { key: "ArrowUp" });
    expect(selectedOption()?.textContent).toBe("copy page link");
    expect(field.getAttribute("aria-activedescendant")).toBe(last.id);

    key(field, { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toBe("all pages");

    key(field, { key: "End" });
    expect(selectedOption()?.textContent).toBe("copy page link");
    key(field, { key: "Home" });
    expect(selectedOption()?.textContent).toBe("all pages");
  });

  it("navigates with router.push when Enter activates a go-to item", () => {
    openWithShortcut();
    const field = input()!;

    key(field, { key: "ArrowDown" });
    key(field, { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toBe("tags");

    key(field, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/tags");
    expect(dialog()).toBeNull();
  });

  it("filters go-to and actions by label or keyword", () => {
    openWithShortcut();
    typeQuery("g");
    expect(options().map((option) => option.textContent)).toEqual([
      "search all pages for 'g' →",
      "all pages",
      "inbox",
      "tags",
      "new page",
      "settings",
      "admin",
      "graph",
      "assets",
      "toggle dark mode",
      "copy page link",
    ]);

    typeQuery("theme");
    const labels = options().map((option) => option.textContent);
    expect(labels).toContain("toggle dark mode");
    expect(labels).toContain("use wiki skin");
    expect(labels).not.toContain("inbox");
  });

  it("searches pages after a debounce and offers the full search page", async () => {
    openWithShortcut();
    typeQuery("arch");

    expect(document.querySelector(".command-palette-status")?.textContent).toBe("searching…");
    expect(fetchMock).not.toHaveBeenCalled();

    await flush(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/search?q=arch&limit=8");

    const labels = options().map((option) => option.textContent);
    expect(labels.slice(0, 3)).toEqual([
      "Architecture decisionsEngineering",
      "Archive policy",
      "search all pages for 'arch' →",
    ]);
    expect(selectedOption()?.textContent).toBe("Architecture decisionsEngineering");

    key(input()!, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/articles/architecture-decisions");
  });

  it("sends the query to /search from the search-all item", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    openWithShortcut();
    typeQuery("zz top");
    await flush(200);

    expect(document.querySelector(".command-palette-status")?.textContent).toBe("no pages match");
    expect(selectedOption()?.textContent).toBe("search all pages for 'zz top' →");

    key(input()!, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/search?q=zz%20top");
  });

  it("aborts the stale request when the query keeps changing", async () => {
    openWithShortcut();
    typeQuery("ar");
    await flush(50);
    typeQuery("arc");
    await flush(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/search?q=arc&limit=8");
  });

  it("offers the skin that is not current and refreshes after switching", () => {
    document.documentElement.setAttribute("data-skin", "wiki");
    openWithShortcut();
    typeQuery("skin");

    expect(options().map((option) => option.textContent)).toEqual(["search all pages for 'skin' →", "use folio skin"]);

    key(input()!, { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toBe("use folio skin");
    key(input()!, { key: "Enter" });

    expect(document.documentElement.getAttribute("data-skin")).toBe("folio");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
