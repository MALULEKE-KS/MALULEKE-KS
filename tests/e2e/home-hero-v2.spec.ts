// tests/e2e/home-hero-v2.spec.ts
// The home hero (docs/improvements/HOME-HERO-PLAN.md, Sprint 1; the only hero
// since D-038): it fits a phone, reads in order, shows the right crop of the owner's photograph
// for the screen (with the Orbit over it since D-069), doesn't repeat the control
// room's figures, holds still for visitors who ask for reduced motion, and has no
// serious accessibility violations. Runs in CI with the phone and axe checks.

import { seriousViolations } from "./axe";
import { expect, test, type Page } from "@playwright/test";

const URL = "/";
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

    test("fits the screen, reads in order and shows the Orbit (or the right crop of the photograph)", async ({ page }) => {
      test.setTimeout(120_000);
      await settle(page);
      await page.goto(URL, { waitUntil: "networkidle" });
      const hero = page.locator('section[aria-labelledby="hero-title"]');

      // the name is the one h1, and it has words in it
      const h1 = hero.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
      expect((await h1.innerText()).trim().length).toBeGreaterThan(2);

      // the record is computed — at least one entry, each a claim with its figure and label — and it opens How I build,
      // not the hero (D-065, the owner's plan: the first screen is who he is and what he builds)
      const record = page.locator('section[aria-labelledby="principles-title"] [data-record]');
      const items = record.getByRole("listitem");
      expect(await items.count()).toBeGreaterThan(0);
      expect(await items.first().textContent()).toMatch(/\d+/);
      await expect(hero.locator("[data-record]")).toHaveCount(0);

      // on a phone the hero ends with the CV (when one is switched on) and — with the Orbit — its play button, or else
      // Let's talk (the header carries Let's talk; owner, 2026-10-25); from a tablet up the header has them
      if (vp.width < 640) {
        const orbitOn = (await hero.locator(".ks-orbit").count()) > 0;
        if (orbitOn) await expect(hero.getByRole("button", { name: /Watch 26 weeks/ })).toBeVisible();
        else await expect(hero.getByRole("link", { name: /Let.s talk/ })).toBeVisible();
      }

      // the cover image: the phone crop on phones, the wide crop on larger screens — kept under the Orbit (D-069)
      const img = hero.locator("picture img");
      await expect(img).toBeVisible();
      expect(await img.evaluate((e) => (e as HTMLImageElement).currentSrc)).toMatch(vp.crop);
      const withOrbit = (await hero.locator(".ks-orbit").count()) > 0;
      if (withOrbit) await expect(hero.locator(".orbit-poster")).toBeAttached();

      // it covers the whole hero — with the Orbit too, on a phone as on a desktop — and the content sits on top of it
      const covers = await page.evaluate(() => {
        const section = document.querySelector('section[aria-labelledby="hero-title"]')!.getBoundingClientRect();
        const image = document.querySelector('section[aria-labelledby="hero-title"] picture img')!.getBoundingClientRect();
        return { top: image.top - section.top, left: image.left - section.left, bottom: section.bottom - image.bottom, right: section.right - image.right };
      });
      for (const side of Object.values(covers)) expect(side).toBeLessThanOrEqual(1);

      // keep the first view as a picture: CI uploads hero-screenshots/ with every run, so the owner can look at
      // the hero at each width on the pull request without running anything (docs/improvements/HOME-HERO-PLAN.md §19)
      await page.screenshot({ path: `hero-screenshots/hero-${vp.width}x${vp.height}-${vp.name.replace(/\s+/g, "-")}.png` });
      const onTop = await page.evaluate(() => {
        const h1 = document.querySelector("#hero-title")!.getBoundingClientRect();
        const hit = document.elementFromPoint(h1.left + h1.width / 2, h1.top + h1.height / 2);
        return hit?.closest("#hero-title") !== null;
      });
      expect(onTop, "the heading is the topmost thing at its own centre").toBe(true);

      // no character or rig in the hero; the only canvas is the Orbit's
      await expect(hero.locator("canvas:not(.orbit-canvas)")).toHaveCount(0);

      // the record is the proof of the method: each claim sits over its figure
      const claims = record.getByRole("listitem").filter({ hasText: /Runs in production|Enforces its own rules|Shows its proof/ });
      expect(await claims.count()).toBeGreaterThan(0);

      // nothing pushes the page sideways
      const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    });
  });
}

test("no floating guide button on the home page, which has the guide's own section (owner, 2026-10-25)", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(URL);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1200); // past the launcher's own second look
  await expect(page.getByRole("button", { name: "Ask my AI guide" })).toHaveCount(0);
});

test("the live status line doesn't repeat the record", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.goto(URL, { waitUntil: "networkidle" });
  // The record (in How I build since D-065) shows and evidences the pulse's figures; the status line above the map
  // (the control room, merged in — D-047) keeps only what is new.
  const record = page.locator('section[aria-labelledby="principles-title"] [data-record]');
  await expect(record.getByText(/rules the database enforces/i).first()).toBeAttached();
  const status = page.locator('section[aria-labelledby="map-title"] [aria-label="Live status"]');
  await expect(status).toBeAttached();
  await expect(status.getByText(/read-only database role/)).toHaveCount(1);
  await expect(status.getByText(/rules the database enforces|business rules enforced|changes audited/i)).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="control-title"]')).toHaveCount(0);
});

test("reduced motion: the hero holds still", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(URL, { waitUntil: "networkidle" });
  // the name never moves (it is the first paint); the parts that settle in hold still too
  const name = await page.locator("section[aria-labelledby='hero-title'] .hero-rise").first().evaluate((e) => getComputedStyle(e).animationName);
  expect(name).toBe("none");
});

test("with motion allowed, each part settles in", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(URL, { waitUntil: "networkidle" });
  // the parts around the name settle in; the name itself is there from the first frame (it is the largest paint)
  const part = await page.locator("section[aria-labelledby='hero-title'] .hero-rise").first().evaluate((e) => getComputedStyle(e).animationName);
  expect(part).toBe("hero-rise");
  expect(await page.locator("#hero-title").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
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
    // The phone's dock is checked on its own, then set aside while the page is (tests/e2e/axe.ts).
    expect(await seriousViolations(page)).toEqual([]);
  });
}
