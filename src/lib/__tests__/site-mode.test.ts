import { describe, expect, it } from "vitest";
import { resolveSiteMode } from "../site-mode";
describe("resolveSiteMode", () => {
  it("selects application modes", () => {
    expect(resolveSiteMode(undefined)).toBe("wiki");
    expect(resolveSiteMode("wiki")).toBe("wiki");
    expect(resolveSiteMode("media")).toBe("media");
    expect(resolveSiteMode("docs")).toBe("docs");
  });
  it.each(["product", "kiosk"])("rejects %s instead of exposing a wiki from a misconfigured deployment", mode => {
    expect(() => resolveSiteMode(mode)).toThrow("Deploy the marketing website separately");
  });
});
