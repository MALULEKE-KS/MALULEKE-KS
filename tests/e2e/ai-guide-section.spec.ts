// tests/e2e/ai-guide-section.spec.ts
// The home page's AI guide band (D-043, the owner's choice "A"): its own band, the guide ready beside the
// introduction — the example questions in full (never cut off), the box to ask, the trust points; on a phone the
// guide comes straight after the introduction; asking on a phone gives the conversation the whole screen
// (position: fixed must mean the screen — a content-visibility wrapper once trapped it inside the band).

import { expect, test, type Page } from "@playwright/test";

async function settle(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {}
  });
}

for (const vp of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
]) {
  test(`the guide band on a ${vp.name}: ready, whole, and in a sensible order`, async ({ page }) => {
    test.setTimeout(120_000);
    await settle(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/", { waitUntil: "networkidle" });
    const band = page.locator("#ai-guide");
    test.skip((await band.count()) === 0, "the AI guide is switched off");
    await band.scrollIntoViewIfNeeded();

    // one heading, and nothing to open first: the questions and the box are there
    await expect(band.getByRole("heading", { level: 2 })).toBeVisible();
    const questions = band.locator("li button");
    expect(await questions.count()).toBeGreaterThan(0);
    await expect(band.locator("#guide-input-home")).toBeVisible();

    // each question is shown whole — no ellipsis, nothing clipped
    for (const q of await questions.all()) {
      const clipped = await q.evaluate((el) => [...el.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 1));
      expect(clipped, "a question is cut off").toBe(false);
    }

    // the guide wears its own face — the orb (D-060) — not the owner's K-S mark, and not an illustrated character
    await expect(band.locator("svg.guide-bot").first()).toBeVisible();
    expect(await band.locator(".ks-cube").count()).toBe(0);

    // phone first: the guide comes straight after the introduction, before the trust points
    if (vp.name === "phone") {
      const box = await band.locator("#guide-input-home").boundingBox();
      const points = band.locator(":scope > div dl").last();
      const pointsBox = await points.boundingBox();
      if (box && pointsBox) expect(box.y).toBeLessThan(pointsBox.y);
    }

    // kept as a picture: CI uploads hero-screenshots/ with every run, so the band can be looked at on the pull request
    await band.screenshot({ path: `hero-screenshots/guide-band-${vp.width}x${vp.height}-${vp.name}.png` });

    // nothing pushes the page sideways
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test("asking on a phone gives the conversation the whole screen", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const band = page.locator("#ai-guide");
  test.skip((await band.count()) === 0, "the AI guide is switched off");
  await band.scrollIntoViewIfNeeded();
  await band.locator("li button").first().click();

  const chat = page.getByRole("dialog");
  await expect(chat).toBeVisible({ timeout: 30_000 });
  const box = await chat.boundingBox();
  expect(box).not.toBeNull();
  // the whole screen, not a box inside the band
  expect(Math.round(box!.y)).toBe(0);
  expect(Math.round(box!.x)).toBe(0);
  expect(box!.width).toBeGreaterThanOrEqual(389);
  expect(box!.height).toBeGreaterThanOrEqual(800);
  // and nothing of the page shows through it
  const bg = await chat.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toMatch(/rgba\(.*,\s*0\.\d+\)$/);
  await page.screenshot({ path: "hero-screenshots/guide-band-asked-390x844-phone.png" });
});
