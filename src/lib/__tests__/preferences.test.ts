import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, mergePreferences, type UserPreferences } from "../preferences";

function saved(value: Record<string, unknown>): Partial<UserPreferences> {
  return value as Partial<UserPreferences>;
}

describe("mergePreferences", () => {
  it("follows the site default skin when nothing is saved", () => {
    expect(DEFAULT_PREFERENCES.skin).toBe("");
    expect(mergePreferences({}).skin).toBe("");
  });

  it("keeps a valid saved skin", () => {
    expect(mergePreferences({ skin: "folio" }).skin).toBe("folio");
    expect(mergePreferences({ skin: "wiki" }).skin).toBe("wiki");
  });

  it("coerces unknown skins back to the site default", () => {
    expect(mergePreferences(saved({ skin: "neon" })).skin).toBe("");
    expect(mergePreferences(saved({ skin: "FOLIO" })).skin).toBe("");
    expect(mergePreferences(saved({ skin: 1 })).skin).toBe("");
    expect(mergePreferences(saved({ skin: null })).skin).toBe("");
  });

  it("drops keys that are no longer preferences", () => {
    expect(mergePreferences(saved({ skin: "wiki", editorMode: "markdown" }))).toEqual({ skin: "wiki" });
  });
});
