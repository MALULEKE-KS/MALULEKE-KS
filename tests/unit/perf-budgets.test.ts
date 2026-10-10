// tests/unit/perf-budgets.test.ts
// Performance budgets (spec WP-102): the file covers every core route, and the evaluator
// fails a page that got heavier while only warning about noisy lab numbers.

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
  weight: { totalKb: 880, imageKb: 190, requests: 40, images: [{ kb: 116 }] },
  lighthouse: { scores: { performance: 68 }, metrics: { lcpMs: 3000, cls: 0 } },
  ...over,
});

describe("perf-budgets.json", () => {
  it("has a weight budget for every core route and no stray ones", () => {
    expect(Object.keys(budgets.weights).sort()).toEqual([...ROUTES].sort());
  });

  it("holds the WP-001 baseline with headroom, not below it", () => {
    const baseline = JSON.parse(readFileSync("docs/improvements/baseline-2026-10-10.json", "utf8"));
    for (const r of baseline.routes) {
      for (const d of Object.values(r.devices) as { weight: { totalKb: number; imageKb: number; requests: number } }[]) {
        const b = budgets.weights[r.route];
        expect(b.totalKb).toBeGreaterThanOrEqual(d.weight.totalKb);
        expect(b.imageKb).toBeGreaterThanOrEqual(d.weight.imageKb);
        expect(b.requests).toBeGreaterThanOrEqual(d.weight.requests);
      }
    }
  });
});

describe("evaluate", () => {
  it("passes a page at its baseline", () => {
    expect(evaluate([measurement({ lighthouse: null })], budgets)).toEqual({ failures: [], warnings: [] });
  });

  it("fails a page that got heavier", () => {
    const heavy = measurement({ weight: { totalKb: 5000, imageKb: 190, requests: 40, images: [{ kb: 116 }] } });
    const { failures } = evaluate([heavy], budgets);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/\/contact \(mobile\): total weight 5000 KB is over its budget of/);
  });

  it("fails on one huge image, and on a route with no budget", () => {
    const image = measurement({ weight: { totalKb: 880, imageKb: 190, requests: 40, images: [{ kb: 900 }] } });
    expect(evaluate([image], budgets).failures[0]).toMatch(/largest image/);
    expect(evaluate([measurement({ route: "/new-page" })], budgets).failures[0]).toMatch(/no weight budget/);
  });

  it("only warns about lab numbers while the budgets say warn, and fails when they say fail", () => {
    const slow = measurement({ lighthouse: { scores: { performance: 40 }, metrics: { lcpMs: 6000, cls: 0.4 } } });
    const warned = evaluate([slow], budgets);
    expect(warned.failures).toEqual([]);
    expect(warned.warnings).toHaveLength(3);
    const strict = evaluate([slow], { ...budgets, lab: { ...budgets.lab, mode: "fail" } });
    expect(strict.failures).toHaveLength(3);
    expect(strict.warnings).toEqual([]);
  });
});
