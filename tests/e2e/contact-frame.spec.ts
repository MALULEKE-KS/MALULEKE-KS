// tests/e2e/contact-frame.spec.ts
// Let's talk after the premium pass (D-052, on the owner's advance approval 2026-10-23): the topics stand on
// the page (no card around the cards), the form gets its working sheet once a topic is chosen, and the side
// notes are one sheet.

import { expect, test } from "@playwright/test";

test("the topics stand on the page; choosing one gives the form its sheet", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/contact", { waitUntil: "networkidle" });
  const topics = page.getByRole("button").filter({ hasText: /questions · about/ });
  test.skip((await topics.count()) === 0, "no inquiry types");
  // No sheet around the picker: its column has no border of its own.
  const column = page.locator("section.bg-paper > div > div > div").first();
  expect(await column.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
  // The side notes are one sheet.
  expect(await page.locator("aside > div.rounded-2xl").count()).toBe(1);

  await topics.first().click();
  await expect(page.locator("form#inquiry-form")).toBeVisible();
  expect(await column.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe("0px");
});
