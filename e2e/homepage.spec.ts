import { expect, test } from "@playwright/test";
import { DEFAULT_PREFERENCES } from "../src/lib/preferences";

test.describe("focused core navigation", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "core navigation runs once on desktop");
  });

  test("home renders the wiki shell and Arkivel SVG mark", async ({ page }) => {
    await page.goto("/");
    if (process.env.NEXT_PUBLIC_ARKIVEL_SKIN) {
      await expect(page.locator("html")).toHaveAttribute("data-skin", process.env.NEXT_PUBLIC_ARKIVEL_SKIN);
    }

    await expect(page.getByRole("heading", { level: 1, name: "home", exact: true })).toBeVisible();

    const navigation = page.getByRole("complementary", { name: "Wiki navigation" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Arkivel home" })).toBeVisible();

    const mark = navigation.locator('img[src*="arkivel-logo.svg"]');
    await expect(mark).toHaveCount(1);
    await expect(mark).toBeVisible();

    const asset = await page.request.get("/brand/arkivel-logo.svg");
    expect(asset.ok()).toBe(true);
    expect(await asset.text()).toContain("<title>Arkivel logo</title>");
  });

  test("search finds the seeded article", async ({ page }) => {
    await page.goto("/search");

    const query = page.locator("#search-page-query");
    await expect(query).toBeFocused();
    await query.fill("architecture decisions");
    await query.press("Enter");

    await expect(page).toHaveURL(/\/search\?q=architecture(?:\+|%20)decisions$/);
    await expect(page.getByRole("link", { name: "architecture decisions", exact: true })).toBeVisible();
  });

  test("hydrated settings restores the built site skin and public branding", async ({ page, context }) => {
    const expectedSkin = process.env.NEXT_PUBLIC_ARKIVEL_SKIN === "wiki" ? "wiki" : "folio";
    const otherSkin = expectedSkin === "wiki" ? "folio" : "wiki";
    const expectedName = process.env.NEXT_PUBLIC_ARKIVEL_NAME?.trim() || "Arkivel";
    const expectedBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
    const expectedLogo = process.env.NEXT_PUBLIC_ARKIVEL_LOGO?.trim() || "/brand/arkivel-logo.png";
    // Exercise the hydrated controls without a saved account skin overriding the site default.
    await page.route("**/api/preferences", async (route) => {
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: DEFAULT_PREFERENCES });
    });
    await context.clearCookies({ name: "arkivel-skin" });
    await page.goto("/settings");
    const siteDefault = page.getByRole("radio", { name: /^site default \(/ });
    await expect(siteDefault).toHaveAccessibleName(new RegExp(`^site default \\(${expectedSkin}\\)`));
    await page.locator(`input[name="skin"][value="${otherSkin}"]`).check();
    await expect(page.locator("html")).toHaveAttribute("data-skin", otherSkin);
    await siteDefault.check();
    await expect(siteDefault).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-skin", expectedSkin);
    await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "arkivel-skin")).toBe(false);
    await page.reload();
    await expect(siteDefault).toHaveAccessibleName(new RegExp(`^site default \\(${expectedSkin}\\)`));
    await expect(page.locator("html")).toHaveAttribute("data-skin", expectedSkin);

    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    expect(await manifestResponse.json()).toMatchObject({ name: expectedName, start_url: "/", scope: "/" });
    const navigation = page.getByRole("complementary", { name: "Wiki navigation" });
    await expect(navigation.getByRole("link", { name: `${expectedName} home`, exact: true })).toBeVisible();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new URL(expectedLogo, expectedBaseUrl).href);
  });

  test("core index and guide routes render their primary heading", async ({ page }) => {
    const routes = [
      { heading: /^all pages$/i, path: "/articles" },
      { heading: /^spaces$/i, path: "/categories" },
      { heading: /tags/i, path: "/tags" },
      { heading: /^inbox$/i, path: "/recent-changes" },
      { heading: /^help$/i, path: "/help" },
    ];

    for (const route of routes) {
      await test.step(route.path, async () => {
        const response = await page.goto(route.path);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      });
    }
  });
});
