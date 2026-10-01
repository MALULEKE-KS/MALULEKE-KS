// playwright.config.ts
// Drives npm run test:e2e — the 10% in the 70/20/10 split
// (docs/PLATFORM-CONSTITUTION-v1.md §2).

import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL runs the suite against a deployed site instead (after a
// release: PLAYWRIGHT_BASE_URL=https://maluleke-ks.vercel.app npm run test:e2e) —
// no local server, no fixtures: real data, read-only.
const remote = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  // Realistic hostile content for the layout tests (tests/e2e/global-setup.ts) — local and CI only.
  ...(remote ? {} : { globalSetup: "./tests/e2e/global-setup.ts" }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: remote ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: remote ? undefined : {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
