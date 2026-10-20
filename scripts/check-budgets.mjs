// scripts/check-budgets.mjs — fail when a core page has got heavier than its budget (spec WP-102).
//
// usage: node scripts/check-budgets.mjs <base-url> [--budgets <file>] [--lighthouse none|mobile|both] [--only <route>] [--repeats <n>]
//
// Measures what each core route downloads on a phone and a desktop (always), and optionally runs
// Lighthouse, then judges the numbers against perf-budgets.json. Weight breaches fail (exit 1);
// lab-metric breaches warn unless the budgets file says `lab.mode: "fail"`. The measuring code is
// shared with scripts/baseline.mjs (scripts/lib/page-measure.mjs), so the two agree on every number.

import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { DEBUG_PORT, DEVICES, ROUTES, measureWeight, runLighthouse } from "./lib/page-measure.mjs";
import { evaluate } from "./lib/budgets.mjs";

function args(argv) {
  const out = { base: null, budgets: "perf-budgets.json", lighthouse: "mobile", only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--budgets") out.budgets = argv[++i];
    else if (a === "--lighthouse") out.lighthouse = argv[++i];
    else if (a === "--only") out.only = argv[++i];
    else if (a === "--repeats") out.repeats = Number(argv[++i]);
    else if (!out.base) out.base = a;
  }
  return out;
}

// Ends by setting the exit code, not process.exit(): that can crash Node on Windows with sockets still open.
async function main() {
  const opts = args(process.argv.slice(2));
  if (!opts.base || !["none", "mobile", "both"].includes(opts.lighthouse)) {
    console.error("usage: node scripts/check-budgets.mjs <base-url> [--budgets <file>] [--lighthouse none|mobile|both] [--only <route>]");
    return 2;
  }
  const base = opts.base.replace(/\/$/, "");
  const budgets = JSON.parse(await readFile(opts.budgets, "utf8"));
  const routes = opts.only ? ROUTES.filter((r) => r === opts.only) : ROUTES;

  let lighthouse = null;
  let desktopConfig = null;
  if (opts.lighthouse !== "none") {
    lighthouse = (await import("lighthouse")).default;
    desktopConfig = (await import("lighthouse/core/config/desktop-config.js")).default;
  }

  const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
  const measurements = [];
  try {
    for (const route of routes) {
      for (const [device, profile] of Object.entries(DEVICES)) {
        // The page is measured a few times, each in a fresh browser context, and the lightest run counts: on identical code the
        // same page has measured up to ~117 KB apart (an extra image caught by one run's timing), so a single reading made the
        // check fail at random. A real regression is in every run; a one-off extra download is not (D-040).
        let weight = null;
        for (let run = 0; run < (opts.repeats ?? 3); run++) {
          const context = await browser.newContext(profile);
          const page = await context.newPage();
          const w = await measureWeight(page, `${base}${route}`, 2500);
          await context.close();
          if (!weight || w.totalKb < weight.totalKb) weight = w;
        }
        const wantsLighthouse = lighthouse && (opts.lighthouse === "both" || device === "mobile");
        const lh = wantsLighthouse ? await runLighthouse(`${base}${route}`, device, lighthouse, desktopConfig) : null;
        measurements.push({ route, device, weight, lighthouse: lh });
        console.log(`${route.padEnd(24)} ${device.padEnd(8)} ${weight.totalKb} KB · ${weight.imageKb} KB images · ${weight.requests} requests${lh ? ` · LCP ${lh.metrics.lcpMs} ms · CLS ${lh.metrics.cls} · perf ${lh.scores.performance}` : ""}`);
      }
    }
  } finally {
    await browser.close();
  }

  const { failures, warnings } = evaluate(measurements, budgets);
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const f of failures) console.error(`FAIL  ${f}`);
  console.log(failures.length ? `${failures.length} budget(s) broken.` : `Every weight is within its budget${warnings.length ? ` (${warnings.length} lab target(s) not met yet)` : ""}.`);
  return failures.length ? 1 : 0;
}

process.exitCode = await main();
