// tests/e2e/home-hero-v2.spec.ts
// The rebuilt home hero (docs/improvements/HOME-HERO-PLAN.md, Sprint 1), seen
// through the preview switch /?hero=v2 (outside production the flag is not needed):
// it fits a phone, reads in order, shows the right crop of the owner's photograph
// for the screen, carries no character or canvas, doesn't repeat the control
// room's figures, holds still for visitors who ask for reduced motion, and has no
// serious accessibility violations. Runs in CI with the phone and axe checks.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/?hero=v2";
const VIEWPORTS = [
  { name: "small phone", width: 360, height: 760, crop: /hero-mobile/ },
  { name: "phone", width: 390, height: 844, crop: /hero-mobile/ },
  { name: "desktop", width: 1280, height: 900, crop: /hero-desktop/ },
] as const;

async function settle(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {}
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`the rebuilt hero on a ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("fits the screen, reads in order and shows the right crop of the photograph", async ({ page }) => {
      test.setTimeout(120_000);
      await settle(page);
      await page.goto(URL, { waitUntil: "networkidle" });
      const hero = page.locator('section[aria-labelledby="hero-title"]');

      // the name is the one h1, and it has words in it
      const h1 = hero.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
      expect((await h1.innerText()).trim().length).toBeGreaterThan(2);

      // the record is computed: at least one figure, each a number with a label
      const items = hero.getByRole("list").last().getByRole("listitem");
      expect(await items.count()).toBeGreaterThan(0);
      expect(await items.first().innerText()).toMatch(/^\d+\s+\S+/);

      // the photograph: the phone crop on phones, the wide crop on larger screens
      const img = hero.locator("figure img");
      await expect(img).toBeVisible();
      expect(await img.evaluate((e) => (e as HTMLImageElement).currentSrc)).toMatch(vp.crop);

      // no character, rig or canvas in the hero
      await expect(hero.locator("canvas")).toHaveCount(0);

      // nothing pushes the page sideways
      const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    });
  });
}

test("the control room doesn't repeat the hero's record", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.goto(URL, { waitUntil: "networkidle" });
  // The hero's ledger shows (and evidences) the pulse's figures; the control room keeps only what is new.
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  await expect(hero.getByText(/rules the database enforces/i).first()).toBeVisible();
  const controlRoom = page.locator('section[aria-labelledby="control-title"]');
  await expect(controlRoom).toBeAttached();
  await expect(controlRoom.getByText(/rules the database enforces|business rules enforced|changes audited/i)).toHaveCount(0);
});

test("without the switch the previous hero shows, so production is unchanged until the flag is on", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('section[aria-labelledby="hero-title"] figure img')).toHaveCount(0);
});

test("reduced motion: the hero holds still", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(URL, { waitUntil: "networkidle" });
  const name = await page.locator("#hero-title").evaluate((e) => getComputedStyle(e).animationName);
  expect(name).toBe("none");
});

test("with motion allowed, each part settles in", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(URL, { waitUntil: "networkidle" });
  const name = await page.locator("#hero-title").evaluate((e) => getComputedStyle(e).animationName);
  expect(name).toBe("hero-rise");
});

for (const [name, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
] as const) {
  test(`no serious or critical accessibility violations on a ${name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await settle(page);
    await page.goto(URL, { waitUntil: "networkidle" });
    // Axe measures what is on screen: let the entrance finish so it never samples a part mid-fade.
    // (The live dot's ping loops forever by design, so only finite animations are awaited.)
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(serious).toEqual([]);
  });
}
