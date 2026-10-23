// tests/e2e/case-study.spec.ts
// A system's page after the premium pass (D-053, on the owner's advance approval 2026-10-23): the hero names
// what it's built with as marks (no pill wall, eight then a count), the latest commits are ruled rows rather
// than boxes, and "What it proves" is a list of proof rows that open the systems using each skill.

import { expect, test } from "@playwright/test";

test("a case study: marks in the hero, ruled commits, proof rows", async ({ page, request }) => {
  test.setTimeout(120_000);
  const res = await request.get("/api/v1/systems?pageSize=50");
  const body = (await res.json()) as { data?: { slug: string }[]; items?: { slug: string }[] };
  const slug = (body.data ?? body.items ?? [])[0]?.slug;
  test.skip(!slug, "no published system");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/systems/${slug}`, { waitUntil: "networkidle" });

  const built = page.locator('section[aria-labelledby="system-title"] ul[aria-label="Built with"]');
  if ((await built.count()) > 0) {
    expect(await built.locator("li").count(), "at most eight marks").toBeLessThanOrEqual(8);
    expect(await built.locator(".rounded-full.border").count(), "marks, not pills").toBe(0);
  }

  const commits = page.locator('section[aria-labelledby="activity-title"] ol > li');
  for (const radius of await commits.evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)))) expect(radius).toBe(0);

  const proofs = page.locator('section[aria-labelledby="proves-title"] a[href^="/systems?tech="]');
  for (const h of await proofs.evaluateAll((els) => els.slice(0, 6).map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "hero-screenshots/case-study-1280.png" });
});
