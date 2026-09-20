import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("documentation reading", () => {
  test.skip(process.env.ARKIVEL_SITE_MODE !== "docs", "documentation deployment only");
  test("versions preserve topics and reading order excludes hidden articles", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.locator(".docs-hero")).toContainText("v2.0 / 2 published pages");
    await page.getByRole("link", { name: /Start reading/ }).click();
    await expect(page).toHaveURL(/docs-v2.0-start$/);
    await page.getByRole("link", { name: /Next · v2.0 Publishing/ }).click();
    await expect(page).toHaveURL(/docs-v2.0-publish$/);
    if (isMobile) await page.getByRole("button", { name: /open.*navigation/i }).click();
    await expect(page.locator("#documentation-version option")).toHaveText(["v2.0", "v1.0"]);
    await page.getByLabel("documentation version", { exact: true }).selectOption("v1.0");
    await expect(page).toHaveURL(/docs-v1.0-publish$/);
    await expect(page.locator("#article-content")).toContainText("v1.0");
    await page.getByRole("link", { name: /Previous · v1.0 Getting/ }).click();
    await expect(page).toHaveURL(/docs-v1.0-start$/);
    expect((await page.goto("/handbook/missing"))?.status()).toBe(404);
  });

  for (const skin of ["editorial", "compact"]) {
    test(`${skin} persists and works in light and dark`, async ({ page }) => {
      await page.goto("/settings");
      await page.locator(`input[name="skin"][value="${skin}"]`).check();
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-skin", skin);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(theme => localStorage.setItem("theme", theme), theme);
        await page.goto("/");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(results.violations.filter(v => ["serious", "critical"].includes(v.impact || ""))).toEqual([]);
        await page.screenshot({ path: `test-results/docs-${skin}-${theme}-${test.info().project.name}.png` });
      }
    });
  }
});
