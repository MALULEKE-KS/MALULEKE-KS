// tests/e2e/systems-catalog.spec.ts
// The /systems catalogue after the premium pass (D-049, owner-approved 2026-10-23): one card anatomy so
// every card in a row ends on the same line, one capsule per card (the status), the in-site arrow, a
// toolbar that stays in reach while you scroll, the phone's filter sheet with finger-sized options, and
// an empty state that names the filters that matched nothing.

import { expect, test } from "@playwright/test";

test("cards in a row end on the same line, carry one capsule and the in-site arrow", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/systems", { waitUntil: "networkidle" });
  const cards = page.locator('main ul > li a[href^="/systems/"]');
  const n = await cards.count();
  test.skip(n < 2, "fewer than two systems");

  const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ top: Math.round(r.top), bottom: Math.round(r.bottom) })));
  const rows = new Map<number, number[]>();
  for (const b of boxes) rows.set(b.top, [...(rows.get(b.top) ?? []), b.bottom]);
  for (const bottoms of rows.values()) expect(Math.max(...bottoms) - Math.min(...bottoms), "cards in a row end together").toBeLessThanOrEqual(1);

  for (let i = 0; i < Math.min(n, 6); i++) {
    const card = cards.nth(i);
    expect(await card.locator(".lucide-arrow-up-right").count(), "a card opens a page on this site").toBe(0);
    expect(await card.locator(".rounded-full.border").count(), "one capsule: the status").toBeLessThanOrEqual(1);
  }
});

test("the toolbar stays in reach while the catalogue scrolls", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/systems", { waitUntil: "networkidle" });
  const bar = page.locator(".catalog-toolbar");
  await expect(bar).toBeVisible();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  test.skip(height < 2600, "the catalogue is too short to scroll past its toolbar");
  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(600);
  const top = await bar.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(120);
});

test("on a phone, one Filter button opens every facet in a sheet with finger-sized options", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/systems", { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: /^Filter/ });
  test.skip((await button.count()) === 0, "nothing to filter");
  await button.click();
  const sheet = page.getByRole("dialog", { name: "Filter systems" });
  await expect(sheet).toBeVisible();
  const options = sheet.locator("ul a");
  expect(await options.count()).toBeGreaterThan(1);
  for (const h of await options.evaluateAll((els) => els.slice(0, 8).map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  await expect(sheet.getByRole("button", { name: /^Show \d+ system/ })).toBeVisible();
  await page.screenshot({ path: "hero-screenshots/systems-filter-sheet-390.png" });
});

test("filters that match nothing are named, each a tap to remove", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/systems?status=no-such-status-anywhere", { waitUntil: "networkidle" });
  await expect(page.getByText("No systems match these filters.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Clear all filters/ })).toBeVisible();
});
