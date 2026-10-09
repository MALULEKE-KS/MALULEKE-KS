// scripts/baseline.mjs — the V2 baseline (spec WP-001): what the six core routes
// weigh, score and say today, measured the same way every time so a later change
// can be compared with a number, not a feeling.
//
// For every route and for a phone (390×844, DPR 3) and a desktop (1280×800, DPR 1):
//   • Lighthouse — performance, accessibility, best practices, SEO, and the lab metrics
//   • axe (WCAG 2.2 AA) — violations by impact, with rule ids
//   • weight — requests and bytes by type, every image request with its width and bytes
//   • metadata — title, description, canonical, Open Graph and Twitter tags
//   • build — the commit each page's footer reports, next to the platform's own pulse
//
// usage: node scripts/baseline.mjs <base-url> [--out <path-without-extension>] [--settle <ms>] [--only <route>] [--skip-lighthouse]
//
// Writes <out>.json and <out>.md (default docs/improvements/baseline-<today>). Lighthouse
// runs on the Playwright Chromium (remote-debugging port), so no separate Chrome is needed.
// Scores move a few points between runs; compare a re-run within that variance, not exactly.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = ["/", "/systems", "/systems/xkimi-xa-mali", "/about", "/journey", "/contact"];
const DEVICES = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const DEBUG_PORT = 9341;
const META = ["description", "robots", "og:title", "og:description", "og:type", "og:url", "og:site_name", "og:locale", "og:image", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"];

function args(argv) {
  const out = { base: null, out: null, settle: 2500, only: null, lighthouse: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.out = argv[++i];
    else if (a === "--settle") out.settle = Number(argv[++i]);
    else if (a === "--only") out.only = argv[++i];
    else if (a === "--skip-lighthouse") out.lighthouse = false;
    else if (!out.base) out.base = a;
  }
  return out;
}

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

/** Requests, bytes by resource type, and every image — from what the page actually downloaded. */
async function measureWeight(page, url, settle) {
  const requests = [];
  page.on("requestfinished", async (request) => {
    try {
      const sizes = await request.sizes();
      const response = await request.response();
      requests.push({ url: request.url(), type: request.resourceType(), status: response?.status() ?? 0, bytes: sizes.responseBodySize + sizes.responseHeadersSize });
    } catch {
      /* a request closed with the page — not counted */
    }
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(settle);
  const byType = {};
  for (const r of requests) {
    byType[r.type] ??= { requests: 0, bytes: 0 };
    byType[r.type].requests += 1;
    byType[r.type].bytes += r.bytes;
  }
  for (const t of Object.values(byType)) t.kb = kb(t.bytes);
  const images = requests
    .filter((r) => r.type === "image")
    .map((r) => {
      const u = new URL(r.url);
      const source = u.pathname === "/_next/image" ? u.searchParams.get("url") : u.pathname;
      return { source, width: u.pathname === "/_next/image" ? Number(u.searchParams.get("w")) : null, kb: kb(r.bytes) };
    })
    .sort((a, b) => b.kb - a.kb);
  return {
    requests: requests.length,
    totalKb: kb(requests.reduce((n, r) => n + r.bytes, 0)),
    byType,
    imageRequests: images.length,
    imageKb: kb(images.reduce((n, i) => n + i.kb * 1024, 0)),
    images,
  };
}

/** Title, canonical and the share tags the page declares. */
async function readMetadata(page) {
  return page.evaluate((names) => {
    const meta = {};
    for (const n of names) {
      const el = document.querySelector(`meta[name="${n}"], meta[property="${n}"]`);
      meta[n] = el?.getAttribute("content") ?? null;
    }
    return { title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null, lang: document.documentElement.lang || null, meta };
  }, META);
}

async function runAxe(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of result.violations) byImpact[v.impact ?? "minor"] += 1;
  return { violations: result.violations.length, byImpact, rules: result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: result.passes.length, incomplete: result.incomplete.length };
}

async function runLighthouse(url, device, lighthouse, desktopConfig) {
  const flags = { port: DEBUG_PORT, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] };
  const run = await lighthouse(url, flags, device === "desktop" ? desktopConfig : undefined);
  const lhr = run.lhr;
  const num = (id) => lhr.audits[id]?.numericValue ?? null;
  const round = (v, d = 0) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);
  return {
    scores: Object.fromEntries(Object.entries(lhr.categories).map(([k, c]) => [k, Math.round((c.score ?? 0) * 100)])),
    metrics: {
      fcpMs: round(num("first-contentful-paint")),
      lcpMs: round(num("largest-contentful-paint")),
      tbtMs: round(num("total-blocking-time")),
      cls: round(num("cumulative-layout-shift"), 3),
      speedIndexMs: round(num("speed-index")),
      totalByteWeightKb: round((num("total-byte-weight") ?? 0) / 1024, 1),
    },
    lcpElement: lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? null,
    warnings: lhr.runWarnings ?? [],
  };
}

function summary(report) {
  const lines = [];
  lines.push(`# Baseline — ${report.takenAt.slice(0, 10)}`);
  lines.push("");
  lines.push(`Measured by \`scripts/baseline.mjs\` against ${report.base}. The platform reports build \`${report.platformBuild ?? "unknown"}\`. Lighthouse ${report.lighthouseVersion ?? "(skipped)"}, simulated throttling; phone = 390×844 at DPR 3, desktop = 1280×800 at DPR 1. Scores move a few points between runs: compare a re-run within that variance.`);
  lines.push("");
  lines.push("## Lighthouse");
  lines.push("");
  lines.push("| Route | Device | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of report.routes) {
    for (const [device, d] of Object.entries(r.devices)) {
      const l = d.lighthouse;
      if (!l) continue;
      const s = l.scores;
      lines.push(`| \`${r.route}\` | ${device} | ${s.performance} | ${s.accessibility} | ${s["best-practices"]} | ${s.seo} | ${l.metrics.fcpMs} ms | ${l.metrics.lcpMs} ms | ${l.metrics.tbtMs} ms | ${l.metrics.cls} |`);
    }
  }
  lines.push("");
  lines.push("## Weight (what the page downloaded, settled after load)");
  lines.push("");
  lines.push("| Route | Device | Requests | Total | Images | Image KB | Largest image |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of report.routes) {
    for (const [device, d] of Object.entries(r.devices)) {
      const w = d.weight;
      const top = w.images[0];
      lines.push(`| \`${r.route}\` | ${device} | ${w.requests} | ${w.totalKb} KB | ${w.imageRequests} | ${w.imageKb} KB | ${top ? `${top.source}${top.width ? ` @${top.width}w` : ""} (${top.kb} KB)` : "—"} |`);
    }
  }
  lines.push("");
  lines.push("## Accessibility (axe, WCAG 2.2 AA)");
  lines.push("");
  lines.push("| Route | Device | Violations | Critical | Serious | Moderate | Minor | Rules |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of report.routes) {
    for (const [device, d] of Object.entries(r.devices)) {
      const a = d.axe;
      lines.push(`| \`${r.route}\` | ${device} | ${a.violations} | ${a.byImpact.critical} | ${a.byImpact.serious} | ${a.byImpact.moderate} | ${a.byImpact.minor} | ${a.rules.map((x) => x.id).join(", ") || "—"} |`);
    }
  }
  lines.push("");
  lines.push("## Share metadata and build");
  lines.push("");
  lines.push("| Route | Build in footer | og:image | og:image:alt | twitter:card | Description length |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of report.routes) {
    const m = r.metadata.meta;
    lines.push(`| \`${r.route}\` | \`${r.footerBuild ?? "none"}\` | ${m["og:image"] ? "yes" : "**no**"} | ${m["og:image:alt"] ?? "—"} | ${m["twitter:card"] ?? "**none**"} | ${(m.description ?? "").length} |`);
  }
  lines.push("");
  lines.push("Every number above is in the JSON file beside this one, with the full image list and every axe rule.");
  return lines.join("\n") + "\n";
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (!opts.base) {
    console.error("usage: node scripts/baseline.mjs <base-url> [--out <path>] [--settle <ms>] [--only <route>] [--skip-lighthouse]");
    return 2;
  }
  const base = opts.base.replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const outBase = opts.out ?? `docs/improvements/baseline-${today}`;
  const routes = opts.only ? ROUTES.filter((r) => r === opts.only) : ROUTES;

  let lighthouse = null;
  let desktopConfig = null;
  let lighthouseVersion = null;
  if (opts.lighthouse) {
    const mod = await import("lighthouse");
    lighthouse = mod.default;
    desktopConfig = (await import("lighthouse/core/config/desktop-config.js")).default;
    lighthouseVersion = (await import("lighthouse/package.json", { with: { type: "json" } })).default.version;
  }

  const pulse = await fetch(`${base}/api/v1/platform/pulse`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
  const report = { takenAt: new Date().toISOString(), base, platformBuild: pulse?.deployment?.commit ?? null, lighthouseVersion, settleMs: opts.settle, routes: [] };
  try {
    for (const route of routes) {
      const url = `${base}${route}`;
      const entry = { route, footerBuild: null, metadata: null, devices: {} };
      for (const [device, profile] of Object.entries(DEVICES)) {
        console.log(`${route} · ${device}`);
        const context = await browser.newContext(profile);
        const page = await context.newPage();
        const weight = await measureWeight(page, url, opts.settle);
        const html = await page.content();
        entry.footerBuild ??= /build\s*(?:<!--[^>]*-->\s*)*([0-9a-f]{7})/.exec(html)?.[1] ?? null;
        entry.metadata ??= await readMetadata(page);
        const axe = await runAxe(page);
        await context.close();
        const lh = lighthouse ? await runLighthouse(url, device, lighthouse, desktopConfig) : null;
        entry.devices[device] = { weight, axe, lighthouse: lh };
      }
      report.routes.push(entry);
    }
  } finally {
    await browser.close();
  }

  await mkdir(dirname(outBase), { recursive: true });
  await writeFile(`${outBase}.json`, JSON.stringify(report, null, 2) + "\n");
  await writeFile(`${outBase}.md`, summary(report));
  console.log(`Wrote ${outBase}.json and ${outBase}.md`);
  return 0;
}

// Ends by setting the exit code, not process.exit(): that can crash Node on Windows with sockets still open.
process.exitCode = await main();
