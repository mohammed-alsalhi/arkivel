import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { label: "home", path: "/" },
  { label: "search", path: "/search" },
  { label: "help", path: "/help" },
];

test.describe("focused core accessibility", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "accessibility runs once on desktop");
  });

  for (const route of routes) {
    test(`${route.label} has no serious or critical WCAG violations`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("#main-content")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const blocking = results.violations
        .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
        }));

      expect(blocking).toEqual([]);
    });
  }
});
