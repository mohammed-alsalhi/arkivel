import { describe, expect, it, vi } from "vitest";
import { isProductRouteAllowed, resolveSiteMode } from "../site-mode";
import { proxy } from "../../proxy";
import { NextRequest } from "next/server";

describe("resolveSiteMode", () => {
  it("enables product mode explicitly and otherwise keeps the wiki", () => {
    expect(resolveSiteMode("product")).toBe("product");
    expect(resolveSiteMode("wiki")).toBe("wiki");
    expect(resolveSiteMode(undefined)).toBe("wiki");
  });

  it("keeps operational wiki routes out of the product deployment", () => {
    expect(isProductRouteAllowed("/docs")).toBe(true);
    expect(isProductRouteAllowed("/api/v1/contract")).toBe(true);
    expect(isProductRouteAllowed("/api/v1/openapi.json")).toBe(true);
    expect(isProductRouteAllowed("/api/v1/sdk")).toBe(true);
    expect(isProductRouteAllowed("/_next/static/app.js")).toBe(true);
    expect(isProductRouteAllowed("/features")).toBe(false);
    expect(isProductRouteAllowed("/admin")).toBe(false);
    expect(isProductRouteAllowed("/api/articles")).toBe(false);
  });

  it("returns 404 for an operational route at the product proxy boundary", () => {
    const previousMode = process.env.ARKIVEL_SITE_MODE;
    process.env.ARKIVEL_SITE_MODE = "product";
    try {
      expect(proxy(new NextRequest("https://example.com/admin")).status).toBe(404);
      expect(proxy(new NextRequest("https://example.com/docs")).status).toBe(200);
      expect(proxy(new NextRequest("https://example.com/api/v1/openapi.json")).status).toBe(200);
    } finally {
      if (previousMode === undefined) delete process.env.ARKIVEL_SITE_MODE;
      else process.env.ARKIVEL_SITE_MODE = previousMode;
    }
  });

  it("uses the self-host example server in the product OpenAPI document", async () => {
    const previousMode = process.env.ARKIVEL_SITE_MODE;
    process.env.ARKIVEL_SITE_MODE = "product";

    try {
      const { GET } = await import("../../app/api/v1/openapi.json/route");
      const response = await GET(new NextRequest("https://example.com/api/v1/openapi.json"));
      const spec = await response.json();
      expect(spec.servers).toEqual([{ url: "https://your-arkivel.example" }]);
    } finally {
      if (previousMode === undefined) delete process.env.ARKIVEL_SITE_MODE;
      else process.env.ARKIVEL_SITE_MODE = previousMode;
    }
  });

  it("loads the product homepage without evaluating Prisma", async () => {
    const previousMode = process.env.ARKIVEL_SITE_MODE;
    process.env.ARKIVEL_SITE_MODE = "product";
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => {
      throw new Error("Prisma loaded in product mode");
    });

    try {
      const { default: Home } = await import("../../app/page");
      expect(await Home()).toBeDefined();
    } finally {
      vi.doUnmock("@/lib/prisma");
      vi.resetModules();
      if (previousMode === undefined) delete process.env.ARKIVEL_SITE_MODE;
      else process.env.ARKIVEL_SITE_MODE = previousMode;
    }
  });
});
