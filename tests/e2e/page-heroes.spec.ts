// tests/e2e/page-heroes.spec.ts
// The images behind the top of Systems, Journey, About and Let's talk (docs/improvements/HOME-HERO-PLAN.md §20,
// D-041): each page's hero shows its own image (the page's slot), the image covers the whole band, nothing pushes
// the page sideways, and the first view is kept as a picture in hero-screenshots/ (uploaded by CI) so it can be
// looked at on the pull request. A page whose slot has no image yet keeps its graphite field — the check skips it.

import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "systems", path: "/systems", slot: "hero-systems" },
  { name: "journey", path: "/journey", slot: "hero-journey" },
  { name: "about", path: "/about", slot: "hero-about" },
  { name: "contact", path: "/contact", slot: "hero-contact" },
];
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

for (const pg of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${pg.name} hero on a ${vp.name}: its own image covers the band`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pg.path, { waitUntil: "networkidle" });

      const img = page.locator(`main section picture img[src*="${pg.slot}"], section picture img[src*="${pg.slot}"]`).first();
      const present = (await img.count()) > 0;
      test.skip(!present, `${pg.slot} has no image yet`);
      await expect(img).toBeVisible();

      // it covers the whole band of its own section
      const covers = await img.evaluate((el) => {
        const section = el.closest("section")!.getBoundingClientRect();
        const image = el.getBoundingClientRect();
        return { top: image.top - section.top, left: image.left - section.left, bottom: section.bottom - image.bottom, right: section.right - image.right };
      });
      for (const side of Object.values(covers)) expect(side).toBeLessThanOrEqual(1);

      // nothing pushes the page sideways
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      await page.screenshot({ path: `hero-screenshots/page-${pg.name}-${vp.width}x${vp.height}.png` });
    });
  }
}
