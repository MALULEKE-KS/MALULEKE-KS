// tests/e2e/journey.spec.ts
// Journey after the premium pass (D-050, on the owner's advance approval 2026-10-23): one editorial
// column — no chapter's paragraph is set to the right, the moments are a ruled list rather than boxes,
// no shining borders — a chapter index that stays in reach while you read, and on a phone an index that
// scrolls inside itself and never pushes the page sideways.

import { expect, test } from "@playwright/test";

test("chapters read in one column: left-aligned, moments ruled, no shining borders", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/journey", { waitUntil: "networkidle" });
  const chapters = page.locator('section[aria-label="The chapters"] article');
  test.skip((await chapters.count()) === 0, "no chapters");
  for (const align of await chapters.locator("p").evaluateAll((els) => els.map((e) => getComputedStyle(e).textAlign))) expect(["left", "start"]).toContain(align);
  // The moments: rows under hairlines, not rounded boxes.
  for (const radius of await page.locator('ul[aria-label^="Moments"] li').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)))) expect(radius).toBe(0);
  expect(await page.locator('[style*="--border-width"]').count(), "no shine borders").toBe(0);
});

test("the chapter index stays in reach while you read", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/journey", { waitUntil: "networkidle" });
  const index = page.getByRole("navigation", { name: "Chapters" });
  await expect(index).toBeVisible();
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(600);
  const top = await index.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(120);
});

test("on a phone the index scrolls inside itself and the page never sideways", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/journey", { waitUntil: "networkidle" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const links = page.getByRole("navigation", { name: "Chapters" }).getByRole("link");
  for (const h of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "hero-screenshots/journey-chapters-360.png", fullPage: false });
});
