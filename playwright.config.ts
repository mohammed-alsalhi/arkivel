import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:3000";
const skin = process.env.NEXT_PUBLIC_ARKIVEL_SKIN;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    storageState: skin === "folio" || skin === "wiki" ? {
      cookies: [{ name: "arkivel-skin", value: skin, domain: new URL(baseURL).hostname, path: "/", expires: -1, httpOnly: false, secure: baseURL.startsWith("https:"), sameSite: "Lax" }],
      origins: [],
    } : undefined,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.CI || process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
      },
});
