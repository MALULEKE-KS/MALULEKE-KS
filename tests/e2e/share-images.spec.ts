// tests/e2e/share-images.spec.ts
// Every page's share image is real: the og:image and twitter:image a page
// names answer 200 with an image. A case study's card is file-based and lives
// inside the (public) route group, so Next serves it under a hashed name
// (opengraph-image-<hash>) — a hand-built URL 404'd on every system until
// 2026-10-03. Runs in CI with the other browser checks.

import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/systems", "/journey", "/about", "/contact"];

async function shareImages(page: Page): Promise<string[]> {
  const og = await page.locator('meta[property="og:image"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
  const tw = await page.locator('meta[name="twitter:image"]').evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? ""));
  return [...new Set([...og, ...tw].filter(Boolean))];
}

async function expectServed(page: Page, path: string) {
  await page.goto(path);
  const urls = await shareImages(page);
  expect(urls.length, `${path} names a share image`).toBeGreaterThan(0);
  for (const url of urls) {
    // Same host as the page under test, whatever the configured site URL says.
    const local = new URL(new URL(url).pathname + new URL(url).search, page.url()).toString();
    const res = await page.request.get(local);
    expect(res.status(), `${path} → ${url}`).toBe(200);
    expect(res.headers()["content-type"], `${path} → ${url}`).toMatch(/^image\//);
  }
}

for (const path of PAGES) {
  test(`share image on ${path} is served`, async ({ page }) => {
    await expectServed(page, path);
  });
}

test("a case study's own share image is served", async ({ page }) => {
  await page.goto("/systems");
  const href = await page.locator('a[href^="/systems/"]').first().getAttribute("href");
  test.skip(!href, "no published system to check");
  await expectServed(page, href!);
});
