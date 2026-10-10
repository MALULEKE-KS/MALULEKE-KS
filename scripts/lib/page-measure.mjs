// scripts/lib/page-measure.mjs — how a page is measured, shared by the baseline
// (scripts/baseline.mjs, WP-001) and the budget check (scripts/check-budgets.mjs, WP-102),
// so the two can never disagree about what "page weight" or "LCP" means.

import AxeBuilder from "@axe-core/playwright";

export const ROUTES = ["/", "/systems", "/systems/xkimi-xa-mali", "/about", "/journey", "/contact"];
export const DEVICES = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
export const DEBUG_PORT = 9341;
export const META = ["description", "robots", "og:title", "og:description", "og:type", "og:url", "og:site_name", "og:locale", "og:image", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"];

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

/** Requests, bytes by resource type, and every image — from what the page actually downloaded. */
export async function measureWeight(page, url, settle) {
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
export async function readMetadata(page) {
  return page.evaluate((names) => {
    const meta = {};
    for (const n of names) {
      const el = document.querySelector(`meta[name="${n}"], meta[property="${n}"]`);
      meta[n] = el?.getAttribute("content") ?? null;
    }
    return { title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null, lang: document.documentElement.lang || null, meta };
  }, META);
}

export async function runAxe(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of result.violations) byImpact[v.impact ?? "minor"] += 1;
  return { violations: result.violations.length, byImpact, rules: result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: result.passes.length, incomplete: result.incomplete.length };
}

export async function runLighthouse(url, device, lighthouse, desktopConfig) {
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

