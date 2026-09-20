import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

test.describe("private instance", () => {
  test.skip(process.env.ARKIVEL_ACCESS !== "private", "private deployment only");
  test("anonymous content, RSC, feeds, shares and API access fail closed without leaking navigation", async ({ page, request }) => {
    for (const route of ["/articles/architecture-decisions", "/search", "/feed.xml", "/sitemap.xml", "/share/anything", "/?test_rsc=1"]) {
      const response = await request.get(route, { maxRedirects: 0, headers: { RSC: "1" } });
      expect(response.status()).toBe(307);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers().location).toContain("/login?next=");
    }
    expect((await request.get("/api/search?q=architecture")).status()).toBe(401);
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    expect(await health.json()).not.toHaveProperty("articleCount");
    await page.goto("/articles/architecture-decisions");
    await expect(page.getByRole("heading", { name: "log in", exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Wiki navigation" })).toHaveCount(0);
    expect(await page.content()).not.toContain("docs-v2.0-start");
    expect(await page.content()).not.toContain("categories/engineering");
    await page.getByLabel("username", { exact: true }).fill("smoke-admin");
    await page.getByLabel("password", { exact: true }).fill(process.env.SMOKE_ADMIN_PASSWORD || "arkivel-smoke-admin");
    await page.getByRole("button", { name: "log in", exact: true }).click();
    await expect(page).toHaveURL(/\/articles\/architecture-decisions$/);
    await expect(page.getByRole("heading", { name: "architecture decisions", exact: true })).toBeVisible();
  });

  test("sessions, oauth session references, API tokens, and private files revoke correctly", async ({ playwright, request }) => {
    const baseURL = process.env.BASE_URL || "http://localhost:3000";
    const anonymous = await playwright.request.newContext({ baseURL });
    const login = await request.post("/api/auth/login", { data: { username: "smoke-admin", password: process.env.SMOKE_ADMIN_PASSWORD || "arkivel-smoke-admin" } });
    expect(login.status()).toBe(200);
    expect((await request.get("/feed.xml")).headers()["cache-control"]).toContain("no-store");
    const upload = await request.post("/api/assets", { multipart: { file: { name: "test.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") } } });
    expect(upload.status()).toBe(201);
    const { url } = await upload.json();
    expect(url).toMatch(/^\/api\/files\/assets\//);
    expect((await anonymous.get(url)).status()).toBe(401);
    const file = await request.get(url);
    expect(await file.text()).toBe("<svg/>");
    expect(file.headers()["content-disposition"]).toContain("attachment");
    const created = await request.post("/api/tokens", { data: { name: "private e2e", expiresInDays: 1 } });
    expect(created.status()).toBe(201);
    const token = await created.json();
    expect((await anonymous.get("/api/search?q=architecture", { headers: { Authorization: `Bearer ${token.token}` } })).status()).toBe(200);
    await request.delete(`/api/tokens/${token.id}`);
    expect((await anonymous.get("/api/search", { headers: { Authorization: `Bearer ${token.token}` } })).status()).toBe(401);
    const state = await request.storageState();
    const session = state.cookies.find(cookie => cookie.name === "session_token")!.value;
    const jwt = await encode({ token: { arkivelSessionToken: session }, secret: process.env.NEXTAUTH_SECRET! });
    const oauth = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Cookie: `next-auth.session-token=${jwt}` } });
    expect((await oauth.get("/api/search")).status()).toBe(200);
    await request.post("/api/auth/logout");
    expect((await request.get(url)).status()).toBe(401);
    expect((await oauth.get("/api/search")).status()).toBe(401);
    await oauth.dispose(); await anonymous.dispose();
  });
});
