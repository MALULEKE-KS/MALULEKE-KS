// tests/e2e/axe.ts
// Serious and critical axe violations on a page, with the phone's bottom dock
// (D-056) checked on its own. The dock floats over the page by design, so
// wherever axe brings an element into view under it, it measures that text
// against the dock's glass instead of the band the text sits on; the dock is
// checked first, then set aside (hidden, not removed) while the page is checked.

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const DOCK = "nav[data-dock]";

function serious(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

export async function seriousViolations(page: Page, tags: string[] = AXE_TAGS): Promise<string[]> {
  const found: string[] = [];
  const dockShown = await page.locator(DOCK).isVisible().catch(() => false);
  if (dockShown) found.push(...serious((await new AxeBuilder({ page }).withTags(tags).include(DOCK).analyze()).violations).map((v) => `dock: ${v}`));
  const aside = dockShown ? await page.addStyleTag({ content: `${DOCK} { visibility: hidden !important; }` }) : null;
  found.push(...serious((await new AxeBuilder({ page }).withTags(tags).analyze()).violations));
  await aside?.evaluate((el) => (el as Element).remove());
  return found;
}
