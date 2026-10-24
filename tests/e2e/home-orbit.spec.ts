// tests/e2e/home-orbit.spec.ts
// The home hero's Orbit (D-069): every published system around the platform's core. It is drawn
// from the first paint (the server's still), it never pushes the page sideways, every system can be
// opened without the live scene (keyboard, a phone, a browser without WebGL), its panel names the
// system and links its case study, steps to the next one and closes on Escape, a shared link opens
// its system, and the words keep their own column. Screenshots of each width, closed and open, are
// kept with the run (hero-screenshots/) so the owner can look without running anything.

import { expect, test, type Page } from "@playwright/test";

async function arrive(page: Page, path = "/") {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {}
  });
  await page.goto(path, { waitUntil: "networkidle" });
  const orbit = page.locator("section[aria-labelledby='hero-title'] .ks-orbit");
  test.skip((await orbit.count()) === 0, "the Orbit is switched off (flag home.orbit)");
  // on a phone the live scene starts on the first scroll or touch — scroll a little, as a visitor would
  await page.evaluate(() => window.scrollBy(0, 2));
  // give the live scene its chance (WebGL2 in this browser); the still stays if it can't
  await page.waitForFunction(() => document.querySelector(".ks-orbit[data-live]") !== null, null, { timeout: 15_000 }).catch(() => undefined);
  return orbit;
}

for (const vp of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const) {
  test.describe(`the Orbit on a ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("draws from the first paint, keeps its own space, and opens, steps through and closes a system", async ({ page }) => {
      test.setTimeout(150_000);
      const orbit = await arrive(page);
      await expect(orbit.locator(".orbit-poster")).toBeAttached();

      // nothing pushes the page sideways
      const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);

      // on a desktop the words keep their column: the stage's visible plates never cover them
      if (vp.width >= 1024) {
        const overlaps = await page.evaluate(() => {
          const copy = document.querySelector("[data-orbit-copy]")!.getBoundingClientRect();
          return [...document.querySelectorAll<HTMLElement>(".orbit-plate")]
            .filter((p) => getComputedStyle(p).opacity !== "0")
            .some((p) => { const r = p.getBoundingClientRect(); return r.left < copy.right - 16 && r.right > copy.left && r.top < copy.bottom && r.bottom > copy.top; });
        });
        expect(overlaps, "no name plate over the hero's words").toBe(false);
      }
      // the line under the stage, its timeline included, ends inside the hero (owner: it ran past the hero's foot)
      const inside = await page.evaluate(() => {
        const hero = document.querySelector("section[aria-labelledby='hero-title']")!.getBoundingClientRect();
        const bars = document.querySelector(".orbit-bars")!.getBoundingClientRect();
        return bars.bottom <= hero.bottom + 0.5;
      });
      expect(inside, "the timeline ends inside the hero").toBe(true);
      await page.screenshot({ path: `hero-screenshots/orbit-${vp.width}x${vp.height}-${vp.name}.png` });

      // open the first system with the explore button (there for keyboards, phones and browsers without WebGL)
      const explore = orbit.locator(".orbit-explore-inline");
      await explore.scrollIntoViewIfNeeded();
      await explore.click();
      const panel = orbit.getByRole("dialog");
      await expect(panel).toBeVisible();
      const first = (await panel.getByRole("heading", { level: 3 }).innerText()).trim();
      expect(first.length).toBeGreaterThan(1);
      await expect(panel.getByRole("link")).toHaveAttribute("href", /^\/systems\/[a-z0-9-]+$/);
      expect(page.url()).toMatch(/[?&]system=[a-z0-9-]+/);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `hero-screenshots/orbit-${vp.width}x${vp.height}-${vp.name}-open.png` });

      // the panel walks to the next system
      const step = panel.locator(".orbit-step button").last();
      // the close button works (it sits above the panel's lines)
      const closeBox = await panel.locator(".orbit-x").boundingBox();
      const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest(".orbit-x") !== null, [closeBox!.x + closeBox!.width / 2, closeBox!.y + closeBox!.height / 2]);
      expect(onTop, "the close button is the topmost thing at its centre").toBe(true);
      if (await step.count()) {
        await step.click();
        await expect(panel.getByRole("heading", { level: 3 })).not.toHaveText(first);
      }

      // the card takes you inside the world, and Escape brings you back out (D-072)
      const goIn = panel.locator(".orbit-enter");
      if (await goIn.count()) {
        await goIn.click();
        const insideView = orbit.locator(".orbit-inside");
        await expect(insideView).toBeVisible();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `hero-screenshots/orbit-${vp.width}x${vp.height}-${vp.name}-inside.png` });
        await page.keyboard.press("Escape");
        await expect(insideView).toHaveCount(0);
        await explore.click();
        await expect(panel).toBeVisible();
      }

      // its close button closes it, and the address forgets it; Escape closes one too
      await panel.locator(".orbit-x").click();
      await expect(orbit.getByRole("dialog")).toHaveCount(0);
      expect(page.url()).not.toMatch(/system=/);
      await explore.click();
      await expect(orbit.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(orbit.getByRole("dialog")).toHaveCount(0);
    });
  });
}

test("a shared link opens its system", async ({ page }) => {
  test.setTimeout(120_000);
  const orbit = await arrive(page);
  const slug = await orbit.evaluate(async () => {
    const res = await fetch("/api/v1/systems?limit=1");
    const body = (await res.json()) as { data: { slug: string }[] };
    return body.data[0]?.slug ?? null;
  });
  test.skip(!slug, "no published system");
  await page.goto(`/?system=${slug}`, { waitUntil: "networkidle" });
  await expect(page.locator(".ks-orbit").getByRole("dialog")).toBeVisible();
  await expect(page.locator(".ks-orbit").getByRole("dialog").getByRole("link")).toHaveAttribute("href", `/systems/${slug}`);
});
