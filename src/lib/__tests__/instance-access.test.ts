// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/auth", () => ({ getSession: vi.fn(), requireRole: (user: { role: string } | null) => !user || !["viewer", "editor", "admin"].includes(user.role) }));
import { getSession } from "../auth";
import { proxy } from "@/proxy";
import { isPrivateInstance, loginDestination } from "../instance-access";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("ARKIVEL_ACCESS", "private"); });
afterEach(() => vi.unstubAllEnvs());
it("preserves public defaults and fails closed on typos", () => {
  vi.stubEnv("ARKIVEL_ACCESS", undefined); expect(isPrivateInstance()).toBe(false);
  vi.stubEnv("ARKIVEL_ACCESS", "public"); expect(isPrivateInstance()).toBe(false);
  vi.stubEnv("ARKIVEL_ACCESS", "publci"); expect(isPrivateInstance()).toBe(true);
});
it("gates every content surface, including files, optimizer and RSC requests", async () => {
  for (const route of ["/articles/secret", "/feed.xml", "/sitemap.xml", "/share/token", "/_next/image?url=/uploads/secret.png", "/api/search?q=secret", "/api/files/uploads/a.png", "/?_rsc=1"]) {
    const response = await proxy(new NextRequest(`https://wiki.test${route}`, { headers: { RSC: "1", "x-middleware-subrequest": "proxy" } }));
    expect([307, 401]).toContain(response.status);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
});
it("allows only entry points and rechecks authorization for every content request", async () => {
  for (const path of ["/login", "/register", "/api/auth/login", "/api/health", "/brand/arkivel-logo.svg", "/_next/static/chunk.js"]) {
    expect((await proxy(new NextRequest(`https://wiki.test${path}`))).status).toBe(200);
  }
  expect(getSession).not.toHaveBeenCalled();
  vi.mocked(getSession).mockResolvedValue({ role: "viewer" } as never);
  expect((await proxy(new NextRequest("https://wiki.test/articles/secret"))).status).toBe(200);
  vi.mocked(getSession).mockResolvedValue(null);
  expect((await proxy(new NextRequest("https://wiki.test/api/search"))).status).toBe(401);
  vi.mocked(getSession).mockRejectedValue(new Error("database unavailable"));
  expect((await proxy(new NextRequest("https://wiki.test/articles/secret"))).status).toBe(503);
});
it("keeps login destinations local", () => {
  for (const value of ["https://evil.test", "//evil.test", "/%2f/evil.test", "/\\evil.test", "/%5cevil.test", "/%0aevil", "%"]) expect(loginDestination(value)).toBe("/");
  expect(loginDestination("/articles/example?q=1")).toBe("/articles/example?q=1");
});
