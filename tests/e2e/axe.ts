// tests/e2e/axe.ts
// Serious and critical axe violations on a page, with its chrome checked on its
// own. What floats or sticks over the content by design — the site header and
// the phone's dock (D-056), the admin's bars, section index and save bar
// (D-057) and the consent card, each marked data-chrome — covers whatever axe brings into view under
// it, and axe then measures that text against the chrome's glass instead of the
// band it sits on. So each piece of chrome is checked first, then all of it is
// set aside (hidden, not removed) while the page is checked.

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const CHROME = "[data-chrome]";

function serious(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}${v.nodes[0]?.any[0]?.message ? ` — ${v.nodes[0].any[0].message}` : ""}`);
}

/** Scroll through the page once, as a reader does, so every section has risen into place (Reveal) before axe measures it. */
async function settleSections(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 800)); // the rise is 700 ms
  });
}

export async function seriousViolations(page: Page, tags: string[] = AXE_TAGS): Promise<string[]> {
  // The site scrolls smoothly (globals.css). Axe scrolls each element into view and samples what is under it at
  // once — mid-glide, that's whichever band is passing (night, night-deep), not the element's own. Scrolling is
  // made instant while axe measures; it's an animation, not a colour.
  const instant = await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  await settleSections(page);
  const found: string[] = [];
  const chrome = (await page.locator(CHROME).count()) > 0;
  if (chrome) found.push(...serious((await new AxeBuilder({ page }).withTags(tags).include(CHROME).analyze()).violations).map((v) => `chrome: ${v}`));
  const aside = chrome ? await page.addStyleTag({ content: `${CHROME} { visibility: hidden !important; }` }) : null;
  found.push(...serious((await new AxeBuilder({ page }).withTags(tags).analyze()).violations));
  await aside?.evaluate((el) => (el as Element).remove());
  await instant.evaluate((el) => (el as Element).remove());
  return found;
}
