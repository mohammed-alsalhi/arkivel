import { expect, test } from "@playwright/test";

const smokeAdminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "arkivel-smoke-admin";

test.describe("seeded article paths", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "seeded article flows run once on desktop");
  });

  test("reads the seeded article", async ({ page }) => {
    const response = await page.goto("/articles/architecture-decisions");

    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: "architecture decisions" })).toBeVisible();
    await expect(page.getByRole("main").locator("#article-content")).toContainText("adr-001");
    await expect(page.getByRole("tab", { name: "graph" })).toBeVisible();
  });

  test("opens the seeded article history", async ({ page }) => {
    const response = await page.goto("/articles/architecture-decisions/history");

    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { level: 1, name: /revision history of.*architecture decisions/i }),
    ).toBeVisible();
    await expect(page.getByText("No previous revisions.")).toBeVisible();
  });

  test("opens the seeded article editor for the smoke admin", async ({ page }) => {
    const login = await page.request.post("/api/auth/login", {
      data: {
        password: smokeAdminPassword,
        username: "smoke-admin",
      },
    });
    expect(login.ok()).toBe(true);

    const auth = await page.request.get("/api/auth/check");
    expect(auth.ok()).toBe(true);
    expect(await auth.json()).toMatchObject({
      admin: true,
      user: { username: "smoke-admin" },
    });

    const response = await page.goto("/articles/architecture-decisions/edit");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("textbox", { name: /^(page )?title$/i })).toHaveValue("architecture decisions");
    await expect(page.getByRole("combobox", { name: /^status$/i })).toHaveValue("published");
    await expect(page.locator(".tiptap")).toContainText("adr-001");
    await expect(page.getByRole("button", { name: /^save changes$/i })).toBeVisible();
  });
});
