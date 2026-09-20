import { expect, test, type Page } from "@playwright/test";

const coreRoutes = [
  "/",
  "/search",
  "/articles",
  "/categories",
  "/tags",
  "/recent-changes",
  "/help",
  "/articles/architecture-decisions",
];

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  const overflow = Math.max(metrics.body, metrics.document) - metrics.client;

  expect(overflow, `${route} has ${overflow}px of horizontal overflow`).toBeLessThanOrEqual(2);
}

test("core routes stay inside the phone and desktop viewport", async ({ page }) => {
  for (const route of coreRoutes) {
    await test.step(route, async () => {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("#main-content")).toBeVisible();
      await expectNoHorizontalOverflow(page, route);
    });
  }
});
