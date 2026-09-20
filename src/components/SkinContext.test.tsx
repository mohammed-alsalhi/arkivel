import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkinProvider, useSkin } from "./SkinContext";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  return <output data-testid="skin">{useSkin()}</output>;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.removeAttribute("data-skin");
});

describe("useSkin", () => {
  it("reads the live data-skin attribute", () => {
    document.documentElement.setAttribute("data-skin", "wiki");
    act(() => root.render(<SkinProvider skin="folio"><Probe /></SkinProvider>));
    expect(container.textContent).toBe("wiki");
  });

  it("falls back to folio when the attribute is missing", () => {
    act(() => root.render(<SkinProvider skin="wiki"><Probe /></SkinProvider>));
    expect(container.textContent).toBe("folio");
  });

  it("re-renders when the skin is switched on the document", async () => {
    document.documentElement.setAttribute("data-skin", "folio");
    act(() => root.render(<SkinProvider skin="folio"><Probe /></SkinProvider>));
    expect(container.textContent).toBe("folio");

    await act(async () => {
      document.documentElement.setAttribute("data-skin", "wiki");
      // MutationObserver callbacks run as microtasks.
      await Promise.resolve();
    });
    expect(container.textContent).toBe("wiki");
  });
});
