// tests/unit/perf-budgets.test.ts
// Performance budgets (spec WP-102): the file covers every core route, and the evaluator
// fails a page that got heavier, fails a score under its floor (D-064), and only warns about the
// noisy lab targets.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error — plain ESM scripts, no types
import { evaluate } from "../../scripts/lib/budgets.mjs";
// @ts-expect-error — plain ESM scripts, no types
import { ROUTES } from "../../scripts/lib/page-measure.mjs";

const budgets = JSON.parse(readFileSync("perf-budgets.json", "utf8"));

const measurement = (over: Record<string, unknown> = {}) => ({
  route: "/contact",
  device: "mobile",
  weight: { totalKb: 600, imageKb: 90, requests: 30, images: [{ kb: 80 }] },
  lighthouse: { scores: { performance: 88, accessibility: 100 }, metrics: { lcpMs: 3000, cls: 0 } },
  ...over,
});

describe("perf-budgets.json", () => {
  it("has a weight budget for every core route and no stray ones", () => {
    expect(Object.keys(budgets.weights).sort()).toEqual([...ROUTES].sort());
  });

  it("only ratchets down: never looser than the WP-001 baseline plus 20% (plus the pages' own hero images, each named and owner-approved)", () => {
    // D-041 (owner, 2026-10-20): Systems, Journey, About and Let's talk each open on their own hero image. Their weight is the only
    // thing allowed above the ratchet, listed here by page in KB (the encoded images are 39, 35, 37 and 22 KiB).
    const heroImageKb: Record<string, number> = { "/systems": 45, "/journey": 40, "/about": 42, "/contact": 30 };
    // And the home page: the "Now building" card shows the current system's screenshot when it has one (one image, ≤ 80 KB, data-driven).
    const nowBuildingScreenshotKb = 80;
    const baseline = JSON.parse(readFileSync("docs/improvements/baseline-2026-10-10.json", "utf8"));
    type Weight = { totalKb: number; imageKb: number; requests: number };
    for (const r of baseline.routes) {
      // A budget covers both devices, so it is judged against the heavier of the two.
      const weights = (Object.values(r.devices) as { weight: Weight }[]).map((d) => d.weight);
      const most = (f: (w: Weight) => number) => Math.max(...weights.map(f));
      const b = budgets.weights[r.route];
      const own = (heroImageKb[r.route] ?? 0) + (r.route === "/" ? nowBuildingScreenshotKb : 0);
      expect(b.totalKb).toBeLessThanOrEqual(most((w) => w.totalKb) * 1.2 + own);
      expect(b.imageKb).toBeLessThanOrEqual(most((w) => w.imageKb) * 1.2 + own);
      expect(b.requests).toBeLessThanOrEqual(most((w) => w.requests) + 12);
    }
  });
});

describe("evaluate", () => {
  it("passes a page at its baseline", () => {
    expect(evaluate([measurement({ lighthouse: null })], budgets)).toEqual({ failures: [], warnings: [] });
  });

  it("fails a page that got heavier", () => {
    const heavy = measurement({ weight: { totalKb: 5000, imageKb: 90, requests: 30, images: [{ kb: 80 }] } });
    const { failures } = evaluate([heavy], budgets);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/\/contact \(mobile\): total weight 5000 KB is over its budget of/);
  });

  it("fails on one huge image, and on a route with no budget", () => {
    const image = measurement({ weight: { totalKb: 600, imageKb: 90, requests: 30, images: [{ kb: 900 }] } });
    expect(evaluate([image], budgets).failures[0]).toMatch(/largest image/);
    expect(evaluate([measurement({ route: "/new-page" })], budgets).failures[0]).toMatch(/no weight budget/);
  });

  it("only warns about the lab targets while the budgets say warn, and fails when they say fail", () => {
    const slow = measurement({ lighthouse: { scores: { performance: 88, accessibility: 100 }, metrics: { lcpMs: 6000, cls: 0 } } });
    const warned = evaluate([slow], budgets);
    expect(warned.failures).toEqual([]);
    expect(warned.warnings).toHaveLength(1);
    const strict = evaluate([slow], { ...budgets, lab: { ...budgets.lab, mode: "fail" } });
    expect(strict.failures).toHaveLength(1);
    expect(strict.warnings).toEqual([]);
  });

  it("fails a score under its floor, and CLS over it, whatever the lab mode (D-064)", () => {
    const worse = measurement({ lighthouse: { scores: { performance: 60, accessibility: 80 }, metrics: { lcpMs: 2000, cls: 0.3 } } });
    const { failures } = evaluate([worse], budgets);
    expect(failures.some((f: string) => /performance 60 is under its floor of 78/.test(f))).toBe(true);
    expect(failures.some((f: string) => /accessibility 80 is under its floor of 90/.test(f))).toBe(true);
    expect(failures.some((f: string) => /CLS 0.3 is over its floor/.test(f))).toBe(true);
  });

  it("checks floors only when a budgets file has no weights (CI's own build)", () => {
    const ci = JSON.parse(readFileSync("perf-budgets.ci.json", "utf8"));
    expect(evaluate([measurement({ route: "/anything", weight: { totalKb: 99999, imageKb: 9999, requests: 999, images: [{ kb: 9999 }] } })], ci)).toEqual({ failures: [], warnings: [] });
    expect(evaluate([measurement({ lighthouse: { scores: { performance: 50, accessibility: 100 }, metrics: { lcpMs: 2000, cls: 0 } } })], ci).failures).toHaveLength(1);
  });
});
