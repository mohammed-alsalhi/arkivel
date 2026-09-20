import { test, expect } from "@playwright/test";

test("closed registration rejects signup and explains the policy", async ({ page }) => {
  const registration = await page.request.post("/api/auth/register", {
    data: { username: "uninvited", email: "uninvited@example.test", password: "test-only-password" },
  });
  expect(registration.status()).toBe(403);
  await page.goto("/register");
  await expect(page.getByText("Registration is closed. Contact your administrator for an account.")).toBeVisible();
  await expect(page.getByRole("button", { name: "create account" })).toHaveCount(0);
  await page.goto("/login");
  await expect(page.getByText("New accounts are managed by your administrator.")).toBeVisible();
  await expect(page.getByRole("link", { name: "register", exact: true })).toHaveCount(0);
});

test("password login reaches shared admin authorization and logout revokes it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("username", { exact: true }).fill("smoke-admin");
  await page.getByLabel("password", { exact: true }).fill(process.env.SMOKE_ADMIN_PASSWORD || "arkivel-smoke-admin");
  await page.getByRole("button", { name: "log in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/api/users")).status()).toBe(200);
  const check = await (await page.request.get("/api/auth/check")).json();
  expect(check).toMatchObject({ admin: true, user: { username: "smoke-admin", role: "admin" } });
  await page.request.post("/api/auth/logout");
  expect((await page.request.get("/api/users")).status()).toBe(401);
  expect(await (await page.request.get("/api/auth/check")).json()).toMatchObject({ admin: false, user: null });
});
