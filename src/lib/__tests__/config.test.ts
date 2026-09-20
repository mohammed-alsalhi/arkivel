import { describe, expect, it } from "vitest";
import { createConfig } from "../config";

describe("config", () => {
  it("uses focused defaults", () => {
    const config = createConfig({});

    expect(config.name).toBe("Arkivel");
    expect(config.logoMark).toBe("/brand/arkivel-logo.svg");
    expect(config.siteMode).toBe("wiki");
    expect(config.wikiSkin).toBe("folio");
  });

  it("reads Arkivel branding without legacy aliases", () => {
    const config = createConfig({
      ARKIVEL_SITE_MODE: "media",
      NEXT_PUBLIC_ARKIVEL_NAME: "my arkivel",
      NEXT_PUBLIC_ARKIVEL_LOGO_MARK: "/brand/custom.svg",
      NEXT_PUBLIC_ARKIVEL_SKIN: "wiki",
    });

    expect(config.name).toBe("my arkivel");
    expect(config.logoMark).toBe("/brand/custom.svg");
    expect(config.siteMode).toBe("media");
    expect(config.wikiSkin).toBe("wiki");
  });

  it("recognises the media site mode and rejects unknown modes", () => {
    expect(createConfig({ ARKIVEL_SITE_MODE: "media" }).siteMode).toBe("media");
    expect(() => createConfig({ ARKIVEL_SITE_MODE: "kiosk" })).toThrow();
  });

  it("falls back to the folio skin", () => {
    expect(createConfig({ NEXT_PUBLIC_ARKIVEL_SKIN: "unknown" }).wikiSkin).toBe("folio");
  });
});
