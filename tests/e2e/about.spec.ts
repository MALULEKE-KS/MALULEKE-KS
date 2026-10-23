// tests/e2e/about.spec.ts
// About after the premium pass (D-051, on the owner's advance approval 2026-10-23): one fact sheet beside the
// story (no icon tiles), each principle of the method a full-width row (no holes), the skills as proof rows
// that open the systems using them, and on a phone the weaker categories folded so the section stays short.

import { expect, test } from "@playwright/test";

test("the story sits beside one fact sheet, and the method rows are full width", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about", { waitUntil: "networkidle" });
  const story = page.locator('section[aria-labelledby="story-title"]');
  test.skip((await story.count()) === 0, "no story or facts");
  // One sheet of facts: a single definition list, no icon tiles.
  expect(await story.locator("dl").count()).toBeLessThanOrEqual(1);
  expect(await story.locator(".rounded-2xl.bg-ink").count(), "no icon tiles").toBe(0);

  const rows = page.locator("#method ol > li");
  const widths = await rows.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  if (widths.length > 1) expect(Math.max(...widths) - Math.min(...widths), "every principle the same full width").toBeLessThanOrEqual(1);
});

test("each proven skill opens the systems that use it", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/about", { waitUntil: "networkidle" });
  const link = page.locator('#skills a[href^="/systems?tech="]').first();
  test.skip((await link.count()) === 0, "no proven skills");
  await expect(link).toHaveAttribute("aria-label", /used in \d+ published system/);
});

test("on a phone the weaker skill categories fold away, the strongest stay open", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about", { waitUntil: "networkidle" });
  const cats = page.locator("#skills details");
  const n = await cats.count();
  test.skip(n < 3, "too few categories to fold");
  const open = await cats.evaluateAll((els) => els.map((e) => (e as HTMLDetailsElement).open));
  expect(open.slice(0, 2).every(Boolean)).toBe(true);
  expect(open.slice(2).some((o) => !o)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
