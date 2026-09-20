import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CourseSyncImport } from "./CourseSyncImport";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

it("requires a successful preview before applying, and invalidates it when the file changes", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const report = { dryRun: true, created: 1, updated: 0, unchanged: 0, skipped: 0, coursesCreated: 1, preview: [], warnings: [] };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => report });
  vi.stubGlobal("fetch", fetchMock);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const button = (text: string) => Array.from(container.querySelectorAll("button")).find((node) => node.textContent === text);
  try {
    await act(async () => root.render(<CourseSyncImport collectionId="coursework" />));
    expect(button("preview changes")?.disabled).toBe(true);
    expect(button("import changes")).toBeUndefined();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [{ size: 2, text: async () => "{}" }] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => button("preview changes")!.click());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ source: {}, dryRun: true });
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(button("import changes")).toBeUndefined();
    await act(async () => button("preview changes")!.click());
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ...report, dryRun: false }) });
    await act(async () => button("import changes")!.click());
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).dryRun).toBe(false);
    expect(refresh).toHaveBeenCalledOnce();
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(button("import changes")).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
