// tests/e2e/hero-shape.spec.ts
// The shape every inner page's hero shares (D-046, owner-approved 2026-10-22): a plain label (no pill), the
// headline, one or two lines, then the record as one hairline row of live figures — no icon tiles, no glowing
// borders. On a phone the Journey, About and Let's talk heroes fit about one screen; About keeps only the first
// sentence of the owner's introduction, the rest opening the story below, word for word; the Systems spotlight's
// front card takes most of a phone's width.

import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "systems", path: "/systems", title: "#page-title" },
  { name: "journey", path: "/journey", title: "#journey-title" },
  { name: "about", path: "/about", title: "#about-title" },
  { name: "contact", path: "/contact", title: "#talk-title" },
];

for (const pg of PAGES) {
  test(`${pg.name} hero has the shared shape`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pg.path, { waitUntil: "networkidle" });
    const hero = page.locator("section", { has: page.locator(pg.title) }).first();
    await expect(hero.locator(pg.title)).toBeVisible();

    // the label is plain words beside an ember hairline — no capsule
    const label = hero.locator("p", { has: page.locator("span.bg-ember.h-px") }).first();
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");

    // no glowing borders or icon tiles in the hero
    expect(await hero.locator('[style*="--border-width"], .shadow-glow-ember, svg.lucide-calendar-range, svg.lucide-hammer').count()).toBe(0);

    // the record is one hairline row (Let's talk: its steps), every figure a number from data
    if (pg.name === "contact") {
      await expect(hero.locator("ol > li")).toHaveCount(4);
    } else {
      const figures = hero.locator("dl dd");
      expect(await figures.count()).toBeGreaterThan(0);
      for (const v of await figures.allTextContents()) expect(Number(v)).toBeGreaterThan(0);
    }

    if (pg.name !== "systems") {
      const height = await hero.evaluate((el) => el.getBoundingClientRect().height);
      expect(height, "the phone hero fits about one screen").toBeLessThanOrEqual(844 * 1.1);
    }
  });
}

test("about hero keeps the first sentence; the story opens with the rest", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/about", { waitUntil: "networkidle" });
  const lead = page.locator("section", { has: page.locator("#about-title") }).locator("p.type-lede");
  test.skip((await lead.count()) === 0, "no biography");
  const text = (await lead.textContent())!.trim();
  expect(text.match(/[.!?](\s|$)/g)?.length, "one sentence").toBe(1);
  const story = page.locator('section[aria-labelledby="story-title"] article p').first();
  if ((await story.count()) > 0) expect((await story.textContent())!.trim()).not.toBe(text);
});

test("systems spotlight front card takes most of a phone's width", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/systems", { waitUntil: "networkidle" });
  const front = page.locator('[aria-roledescription="slide"][aria-current="true"]');
  test.skip((await front.count()) === 0, "fewer than three published systems");
  const box = (await front.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(390 * 0.7);
  await page.screenshot({ path: "hero-screenshots/systems-spotlight-390.png", fullPage: false });
});
