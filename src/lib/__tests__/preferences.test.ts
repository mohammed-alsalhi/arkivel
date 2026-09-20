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

  it("fills missing keys and preserves other saved values", () => {
    const merged = mergePreferences({ editorMode: "markdown", skin: "wiki" });

    expect(merged.editorMode).toBe("markdown");
    expect(merged.skin).toBe("wiki");
    expect(merged.locale).toBe(DEFAULT_PREFERENCES.locale);
    expect(merged.dashboardWidgets).toEqual(DEFAULT_PREFERENCES.dashboardWidgets);
  });

  it("restores the default widgets when the saved list is malformed", () => {
    expect(mergePreferences(saved({ dashboardWidgets: "welcome" })).dashboardWidgets).toEqual(
      DEFAULT_PREFERENCES.dashboardWidgets,
    );
    expect(mergePreferences({ dashboardWidgets: [] }).dashboardWidgets).toEqual(
      DEFAULT_PREFERENCES.dashboardWidgets,
    );
  });
});
