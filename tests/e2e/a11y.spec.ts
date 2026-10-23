// tests/e2e/a11y.spec.ts
// Accessibility on every public page (spec WP-204, WCAG 2.2 AA): axe finds no
// serious or critical violations — on a phone and on a desktop, and on a case
// study read from the site's own list. Runs in CI with the phone checks.

import { expect, test, type Page } from "@playwright/test";
import { seriousViolations } from "./axe";

const PAGES = ["/", "/systems", "/journey", "/about", "/contact"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function settle(page: Page) {
  // Decline analytics, as a privacy-minded visitor would, so the banner isn't under test.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {
      // storage blocked — the banner stays; axe still checks it
    }
  });
}

// The phone's dock is checked on its own, then set aside while the page is (tests/e2e/axe.ts).
const serious = (page: Page) => seriousViolations(page, TAGS);

for (const [name, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
] as const) {
  test.describe(`accessibility on a ${name}`, () => {
    test.use({ viewport });
    for (const path of PAGES) {
      test(`${path} has no serious or critical violations`, async ({ page }) => {
        test.setTimeout(120_000);
        await settle(page);
        await page.goto(path, { waitUntil: "networkidle" });
        expect(await serious(page)).toEqual([]);
      });
    }
  });
}

test("a case study has no serious or critical violations", async ({ page, request }) => {
  test.setTimeout(120_000);
  const res = await request.get("/api/v1/systems?pageSize=1");
  const { data } = (await res.json()) as { data: { slug: string }[] };
  test.skip(data.length === 0, "no published systems");
  await settle(page);
  await page.goto(`/systems/${data[0]!.slug}`, { waitUntil: "networkidle" });
  expect(await serious(page)).toEqual([]);
});
