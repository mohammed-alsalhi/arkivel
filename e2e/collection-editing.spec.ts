import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const smokeAdminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "arkivel-smoke-admin";

async function expectAccessible(page: Page, selector: string) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map(({ id, impact, nodes }) => ({
      id,
      impact,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
  expect(blocking).toEqual([]);
}

test.describe("collection label pickers", () => {
  test.describe.configure({ mode: "serial" });

  let api: APIRequestContext;
  let collection: { id: string; slug: string } | undefined;
  let item: { id: string; title: string };

  test.beforeAll(async ({ playwright }, testInfo) => {
    api = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL });
    const login = await api.post("/api/auth/login", {
      data: { username: "smoke-admin", password: smokeAdminPassword },
    });
    await expect(login).toBeOK();

    const suffix = `${testInfo.project.name}-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;
    const response = await api.post("/api/collections", {
      data: {
        name: `Picker e2e ${suffix}`,
        schema: [
          { id: "title", name: "Task", type: "title" },
          {
            id: "stage",
            name: "Stage",
            type: "select",
            options: [
              { id: "stage_review_v1", label: "Needs review", tone: "warning" },
              { id: "stage_ready_v1", label: "Ready to ship", tone: "success" },
            ],
          },
          {
            id: "labels",
            name: "Labels",
            type: "multi_select",
            options: [
              { id: "tag_research_v1", label: "Research", tone: "info" },
              { id: "tag_writing_v1", label: "Writing", tone: "warning" },
            ],
          },
          { id: "reference", name: "Reference", type: "page" },
        ],
        views: [{
          name: "table",
          slug: "table",
          kind: "table",
          isDefault: true,
          config: { visible: ["title", "stage", "labels", "reference"], filters: [], sorts: [] },
        }],
      },
    });
    expect(response.status()).toBe(201);
    collection = await response.json();
  });

  test.beforeEach(async ({ page }, testInfo) => {
    await page.context().addCookies((await api.storageState()).cookies);
    const response = await api.post(`/api/collections/${collection!.id}/items`, {
      data: { title: testInfo.title, properties: { stage: null, labels: [], reference: null } },
    });
    expect(response.status()).toBe(201);
    item = await response.json();
    await page.goto(`/collections/${collection!.slug}`);
    if (process.env.NEXT_PUBLIC_ARKIVEL_SKIN) {
      await expect(page.locator("html")).toHaveAttribute("data-skin", process.env.NEXT_PUBLIC_ARKIVEL_SKIN);
    }
  });

  test.afterAll(async () => {
    try {
      if (collection) await expect(await api.delete(`/api/collections/${collection.id}`)).toBeOK();
    } finally {
      await api?.dispose();
    }
  });

  const taskRow = (page: Page) => page.getByRole("row").filter({
    has: page.getByRole("link", { name: item.title, exact: true }),
  });

  const savedChange = (page: Page) => page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/collections/${collection!.id}/items/${item.id}` &&
    response.request().method() === "PATCH",
  );

  const storedProperties = async () => {
    const response = await api.get(`/api/collections/${collection!.id}/items/${item.id}`);
    await expect(response).toBeOK();
    return (await response.json()).properties;
  };

  test("chooses a colored label in one click and preserves its storage ID", async ({ page }) => {
    const row = taskRow(page);
    const trigger = row.getByRole("button", { name: "edit Stage", exact: true });
    await trigger.click();
    const picker = page.getByRole("dialog", { name: "choose Stage", exact: true });
    await expect(picker).toBeVisible();
    const search = picker.getByRole("combobox", { name: "search Stage", exact: true });
    await expect(search).toBeFocused();
    await expect(row.locator("select, datalist")).toHaveCount(0);

    const review = picker.getByRole("option", { name: "Needs review", exact: true });
    const ready = picker.getByRole("option", { name: "Ready to ship", exact: true });
    const reviewColor = await review.locator(".ui-chip").evaluate((node) => getComputedStyle(node).backgroundColor);
    const readyColor = await ready.locator(".ui-chip").evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(readyColor).not.toBe(reviewColor);
    await expectAccessible(page, ".collections-choice-popover:popover-open");

    await search.fill("Ready");
    await expect(picker.getByRole("option")).toHaveCount(1);
    const save = savedChange(page);
    await search.press("Enter");
    expect((await save).ok()).toBe(true);
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
    expect((await storedProperties()).stage).toBe("stage_ready_v1");

    await trigger.click();
    await search.fill("review");
    await search.press("Escape");
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
    expect((await storedProperties()).stage).toBe("stage_ready_v1");
    await page.reload();
    await expect(taskRow(page).getByRole("button", { name: "edit Stage", exact: true })).toContainText("Ready to ship");
    await expectAccessible(page, ".collections-table");
  });

  test("toggles multiple labels without closing the picker", async ({ page }) => {
    const trigger = taskRow(page).getByRole("button", { name: "edit Labels", exact: true });
    await trigger.click();
    const picker = page.getByRole("dialog", { name: "choose Labels", exact: true });
    const research = picker.getByRole("option", { name: /^Research(?: selected)?$/ });
    const writing = picker.getByRole("option", { name: /^Writing(?: selected)?$/ });
    await expect(picker.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");

    let save = savedChange(page);
    await research.click();
    expect((await save).ok()).toBe(true);
    await expect(picker).toBeVisible();
    await expect(research).toHaveAttribute("aria-selected", "true");

    save = savedChange(page);
    await writing.click();
    expect((await save).ok()).toBe(true);
    await expect(picker).toBeVisible();
    expect((await storedProperties()).labels).toEqual(["tag_research_v1", "tag_writing_v1"]);

    save = savedChange(page);
    await research.click();
    expect((await save).ok()).toBe(true);
    await expect(picker).toBeVisible();
    await expect(research).toHaveAttribute("aria-selected", "false");
    await expect(writing).toHaveAttribute("aria-selected", "true");
    expect((await storedProperties()).labels).toEqual(["tag_writing_v1"]);

    await picker.getByRole("combobox").press("Escape");
    await expect(trigger).toBeFocused();
    await page.reload();
    const savedTrigger = taskRow(page).getByRole("button", { name: "edit Labels", exact: true });
    await expect(savedTrigger).toContainText("Writing");
    await expect(savedTrigger).not.toContainText("Research");
  });

  test("distinguishes a failed page search from an empty result and supports retry", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/search?**", async (route) => {
      if (new URL(route.request().url()).searchParams.get("q") !== "unavailable reference") {
        await route.continue();
        return;
      }
      attempts += 1;
      await route.fulfill({
        status: attempts === 1 ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(attempts === 1 ? { error: "Synthetic search failure" } : { results: [] }),
      });
    });

    const trigger = taskRow(page).getByRole("button", { name: "edit Reference", exact: true });
    await trigger.click();
    const picker = page.getByRole("dialog", { name: "choose Reference", exact: true });
    const search = picker.getByRole("combobox", { name: "search Reference", exact: true });
    await search.fill("unavailable reference");
    await expect(picker.getByRole("status")).toContainText("could not load options.");
    await expect(picker.getByRole("option")).toHaveCount(0);
    await search.press("Enter");
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "retry", exact: true }).click();
    await expect(picker.getByRole("status")).toHaveText("no matching options");
    expect(attempts).toBe(2);
    expect((await storedProperties()).reference).toBeNull();

    await search.press("Escape");
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
