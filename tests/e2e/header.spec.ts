// tests/e2e/header.spec.ts
// The public header (docs/improvements/HOME-HERO-PLAN.md §17): the Systems preview
// opens when Systems is pointed at or focused, lists the owner's real systems with
// their status, closes with Escape, and never traps the keyboard; the skip link
// works; the header has no serious accessibility violations with the preview open.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

async function settle(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mks.consent.v1", "denied");
    } catch {}
  });
}

async function hasSystems(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get("/api/v1/systems?pageSize=1");
  const { data } = (await res.json()) as { data: { slug: string }[] };
  return data.length > 0;
}

test("pointing at Systems shows the owner's real systems, and Escape closes it", async ({ page, request }) => {
  test.setTimeout(120_000);
  test.skip(!(await hasSystems(request)), "no published systems");
  await settle(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Primary" });
  const preview = nav.locator('a[href^="/systems/"]');
  await expect(preview.first()).toBeHidden(); // closed until pointed at

  await nav.getByRole("link", { name: "Systems", exact: true }).hover();
  await expect(preview.first()).toBeVisible();
  // each shows a status, read from its lookup row
  expect((await preview.first().innerText()).trim().split("\n").length).toBeGreaterThan(1);

  await page.keyboard.press("Escape");
  await expect(preview.first()).toBeHidden();
});

test("keyboard: focusing Systems opens the preview and Tab moves into it without trapping", async ({ page, request }) => {
  test.setTimeout(120_000);
  test.skip(!(await hasSystems(request)), "no published systems");
  await settle(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Primary" });
  const systems = nav.getByRole("link", { name: "Systems", exact: true });
  await systems.focus();
  const preview = nav.locator('a[href^="/systems/"]');
  await expect(preview.first()).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(preview.first()).toBeFocused();
  // and the keyboard can leave: tabbing on goes past the preview, which closes
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  await expect(preview.first()).toBeHidden();
});

test("the skip link is the first thing a keyboard user reaches, and it works", async ({ page }) => {
  test.setTimeout(120_000);
  await settle(page);
  await page.goto("/about", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const skip = page.locator('a[href="#main"]');
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("the header has no serious or critical accessibility violations with the preview open", async ({ page, request }) => {
  test.setTimeout(120_000);
  test.skip(!(await hasSystems(request)), "no published systems");
  await settle(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Systems", exact: true }).hover();
  await expect(page.getByRole("navigation", { name: "Primary" }).locator('a[href^="/systems/"]').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).include("header").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(serious).toEqual([]);
});
