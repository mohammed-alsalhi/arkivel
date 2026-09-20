import { expect, it } from "vitest";
import { documentationIndex, documentationTarget, type DocumentationPage } from "./index";
it("orders versions naturally and preserves topics across versions without inventing a page", () => {
  const page = (slug: string, version: string, order: number, key = "start"): DocumentationPage => ({ slug, version, order, key, title: slug, excerpt: null, section: "Guide" });
  const current = page("old start", "v2", 0);
  const index = documentationIndex([page("later", "v10", 2, "later"), page("new start", "v10", 0), current]);
  expect(index.versions).toEqual(["v10", "v2"]);
  expect(index.pages.at(-1)?.slug).toBe("later");
  expect(documentationTarget(index, "v10", current)).toBe("/articles/new%20start");
  expect(documentationTarget(index, "v1", current)).toBe("/handbook/v1");
  expect(documentationTarget(index, "v10")).toBe("/handbook/v10");
  expect(documentationIndex([])).toEqual({ versions: [], pages: [] });
});
