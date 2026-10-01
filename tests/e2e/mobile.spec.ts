// tests/e2e/mobile.spec.ts
// Mobile by default (owner, 2026-10-01: "mobile responsiveness should be default
// by design"; PAGE-BUILD-PLAYBOOK §1). Every public page, on two real phone
// widths, must fit the screen — nothing pushes the page sideways — and the
// phone menu must open, hold focus, and close. A page that breaks on a phone
// fails the build here instead of reaching a visitor.

import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/systems", "/journey", "/cv", "/method", "/about", "/contact"];
const PHONES = [
  { name: "small phone", width: 360, height: 760 },
  { name: "phone", width: 390, height: 844 },
];

async function settle(page: Page) {
  // Consent answered, so its banner doesn't sit over the page under test.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {}
  });
}

/** Scroll the whole page so every section that reveals on scroll has rendered, then measure. */
async function overflow(page: Page) {
  return page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    const vw = document.documentElement.clientWidth;
    const clipped = (e: Element) => {
      for (let p = e.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.position === "fixed" || ["hidden", "clip", "auto", "scroll"].includes(s.overflowX)) return true;
      }
      return false;
    };
    const offenders = [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !clipped(e);
      })
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).slice(0, 80)}`);
    return { scrollWidth: document.documentElement.scrollWidth, width: vw, offenders };
  });
}

for (const phone of PHONES) {
  test.describe(`on a ${phone.name} (${phone.width}px)`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true });

    for (const path of PAGES) {
      test(`${path} fits the screen`, async ({ page }) => {
        await settle(page);
        await page.goto(path, { waitUntil: "networkidle" });
        const { scrollWidth, width, offenders } = await overflow(page);
        expect(offenders, `elements wider than the screen on ${path}`).toEqual([]);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });
    }
  });
}

test.describe("the phone menu", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("opens full screen, marks the current page, holds focus, and closes", async ({ page }) => {
    test.setTimeout(90_000);
    await settle(page);
    await page.goto("/systems", { waitUntil: "networkidle" });
    const open = page.getByRole("button", { name: "Menu", exact: true });
    const sheet = page.getByRole("dialog", { name: "Menu" });
    // A tap that lands before hydration does nothing — tap until the page is listening.
    await expect(async () => {
      if (!(await sheet.isVisible())) await open.tap();
      await expect(sheet).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 30_000 });
    await expect(sheet.getByRole("link", { name: /Systems/ })).toHaveAttribute("aria-current", "page");
    // The page behind doesn't scroll while it's open.
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    // Focus is inside the sheet.
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(open).toBeFocused();

    // Following a link closes it.
    await open.tap();
    await sheet.getByRole("link", { name: /Journey/ }).tap();
    await expect(page).toHaveURL(/\/journey$/, { timeout: 30_000 });
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden({ timeout: 10_000 });
  });
});
