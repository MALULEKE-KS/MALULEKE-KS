// scripts/lib/budgets.mjs — judge measurements against perf-budgets.json (spec WP-102).
// Pure: no browser, no network — tested in tests/unit/perf-budgets.test.ts.
//
// A measurement is { route, device, weight: { totalKb, imageKb, requests, images: [{ kb }] }, lighthouse?: { scores, metrics } }.
// Weights are exact, so a breach is a failure. Lab numbers are noisy: their `mode` ("warn" or "fail")
// is the owner's call, kept in the budgets file.

/** @returns {{ failures: string[], warnings: string[] }} */
export function evaluate(measurements, budgets) {
  const failures = [];
  const warnings = [];
  for (const m of measurements) {
    const w = budgets.weights?.[m.route];
    if (!w) {
      failures.push(`${m.route}: no weight budget — add it to perf-budgets.json`);
      continue;
    }
    const largest = m.weight.images[0]?.kb ?? 0;
    const checks = [
      ["total weight", m.weight.totalKb, w.totalKb, "KB"],
      ["image weight", m.weight.imageKb, w.imageKb, "KB"],
      ["requests", m.weight.requests, w.requests, ""],
      ["largest image", largest, w.largestImageKb, "KB"],
    ];
    for (const [what, got, max, unit] of checks) {
      if (max !== undefined && got > max) failures.push(`${m.route} (${m.device}): ${what} ${got}${unit && " " + unit} is over its budget of ${max}${unit && " " + unit}`);
    }
    const lab = budgets.lab?.[m.device];
    if (lab && m.lighthouse) {
      const sink = budgets.lab.mode === "fail" ? failures : warnings;
      const { metrics, scores } = m.lighthouse;
      if (lab.lcpMs !== undefined && metrics.lcpMs > lab.lcpMs) sink.push(`${m.route} (${m.device}): LCP ${metrics.lcpMs} ms is over the ${lab.lcpMs} ms target`);
      if (lab.cls !== undefined && metrics.cls > lab.cls) sink.push(`${m.route} (${m.device}): CLS ${metrics.cls} is over the ${lab.cls} target`);
      if (lab.performance !== undefined && scores.performance < lab.performance) sink.push(`${m.route} (${m.device}): performance ${scores.performance} is under ${lab.performance}`);
    }
  }
  return { failures, warnings };
}
