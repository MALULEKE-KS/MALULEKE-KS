// scripts/readme-clip.mjs
// The owner's GitHub profile README shows the live home page's Orbit as a short clip (owner, 2026-10-25). This
// films production's home page in a headless browser and leaves a video for the workflow to turn into a GIF:
//   node scripts/readme-clip.mjs https://maluleke-ks.vercel.app out-dir
// Read-only: it only loads the public home page.

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [base = "https://maluleke-ks.vercel.app", out = "readme-clip"] = process.argv.slice(2);
const size = { width: 1280, height: 640 };
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: out, size } });
await context.addInitScript(() => {
  try {
    localStorage.setItem("mks.consent.v1", "denied");
  } catch {}
});
const t0 = Date.now(); // the video starts with the page
const page = await context.newPage();
await page.goto(base, { waitUntil: "load" });
// The scene is up once the stage says it's live; then let it play.
await page.waitForSelector(".ks-orbit[data-live]", { timeout: 60_000 }).catch(() => console.warn("the Orbit never reported live — filming anyway"));
// The clip starts a moment after that (the workflow trims to it), so it never shows the page loading.
writeFileSync(join(out, "start.txt"), ((Date.now() - t0) / 1000 + 1.5).toFixed(1));
await page.waitForTimeout(12_000);
await context.close();
await browser.close();

const video = readdirSync(out).find((f) => f.endsWith(".webm"));
if (!video) throw new Error("no video was recorded");
renameSync(join(out, video), join(out, "home.webm"));
console.log(`recorded ${join(out, "home.webm")}`);
