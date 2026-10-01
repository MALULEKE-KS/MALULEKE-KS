// lib/systems/screenshots.ts
// Every system's screenshot (BR-1.18; owner, 2026-10-01). Two sources:
//   auto    — captured from the system's live site: by the daily
//             systems.screenshots job (new sites, and sites whose capture is
//             older than screenshots.refreshDays or whose address changed),
//             or by the admin's "Capture now"
//   upload  — the owner's own image, from the admin
// The owner's upload wins: the job never captures over it, and the database
// refuses an automatic version while an upload is current. "Back to automatic"
// retires the upload. Every image — captured or uploaded — goes through the
// photo pipeline (lib/profile/photos.ts: decoded as an image or refused,
// re-encoded to WebP, metadata stripped, resized), and versions are superseded,
// never altered or deleted.
//
// Capturing needs a browser, which a Vercel function doesn't have, so a
// screenshot service renders the page (SCREENSHOT_SERVICE_URL; Microlink's free
// tier by default — public addresses only, which is all a live site is).

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { liveSite } from "@/lib/jobs/github-sync";
import { processPhoto } from "@/lib/profile/photos";
import { getSetting } from "@/lib/settings";
import type { Tx } from "@/lib/audit";

const DAY = 86_400_000;
// "off" switches capturing off (the test suites set it, so a test run never
// spends the service's free daily allowance).
const SERVICE_ENV = process.env.SCREENSHOT_SERVICE_URL?.trim();
const SERVICE_OFF = SERVICE_ENV === "off";
const SERVICE = SERVICE_ENV && !SERVICE_OFF ? SERVICE_ENV : "https://api.microlink.io/";
// The page as a visitor first sees it on a laptop.
const VIEWPORT = { width: 1440, height: 900 };

export class ScreenshotFailed extends Error {}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type Processed = Awaited<ReturnType<typeof processPhoto>>;

/** The service's address for one capture of `url` (above the fold, after the page settles). */
export function captureRequestUrl(url: string) {
  const q = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    "viewport.width": String(VIEWPORT.width),
    "viewport.height": String(VIEWPORT.height),
    "viewport.deviceScaleFactor": "1",
    waitForTimeout: "2500",
    type: "png",
  });
  return `${SERVICE}?${q}`;
}

/** Render a live site and return its processed image. */
export async function captureSite(url: string, fetchImpl?: FetchLike): Promise<Processed> {
  if (!liveSite(url)) throw new ScreenshotFailed("Only a live site's public address can be captured.");
  if (SERVICE_OFF && !fetchImpl) throw new ScreenshotFailed("Screenshot capture is switched off here (SCREENSHOT_SERVICE_URL=off).");
  fetchImpl ??= fetch;
  const res = await fetchImpl(captureRequestUrl(url), { headers: { accept: "application/json" } });
  if (!res.ok) throw new ScreenshotFailed(`The screenshot service answered ${res.status}.`);
  const body = (await res.json().catch(() => null)) as { status?: string; data?: { screenshot?: { url?: string } } } | null;
  const imageUrl = body?.data?.screenshot?.url;
  if (body?.status !== "success" || !imageUrl) throw new ScreenshotFailed("The screenshot service couldn't render that site.");
  const image = await fetchImpl(imageUrl);
  if (!image.ok) throw new ScreenshotFailed(`Fetching the screenshot answered ${image.status}.`);
  const maxEdge = await getSetting("screenshots.maxEdgePixels");
  return processPhoto(new Uint8Array(await image.arrayBuffer()), maxEdge);
}

/** Make an image the system's current screenshot (unless it's already current). */
export async function storeScreenshot(tx: Tx, systemId: string, source: "auto" | "upload", sourceUrl: string | null, img: Processed) {
  const sha256 = createHash("sha256").update(img.data).digest("hex");
  const current = await tx.systemScreenshot.findFirst({ where: { systemId, supersededAt: null }, select: { id: true, sha256: true, source: true } });
  if (current?.sha256 === sha256 && current.source === source) return { created: false };
  if (current) await tx.systemScreenshot.update({ where: { id: current.id }, data: { supersededAt: new Date() } });
  await tx.systemScreenshot.create({
    data: { systemId, source, sourceUrl, mimeType: img.mimeType, width: img.width, height: img.height, byteSize: img.data.length, sha256, fileData: Buffer.from(img.data) },
  });
  return { created: true };
}

/** Retire the owner's upload, so automatic captures take over again. */
export async function backToAutomatic(tx: Tx, systemId: string) {
  const { count } = await tx.systemScreenshot.updateMany({ where: { systemId, supersededAt: null, source: "upload" }, data: { supersededAt: new Date() } });
  return count > 0;
}

/** The current screenshot's facts (no bytes), for the admin. */
export async function currentScreenshot(systemId: string) {
  const s = await db.systemScreenshot.findFirst({
    where: { systemId, supersededAt: null },
    select: { source: true, sourceUrl: true, width: true, height: true, byteSize: true, sha256: true, createdAt: true },
  });
  return s ? { ...s, createdAt: s.createdAt.toISOString() } : null;
}

export interface ScreenshotSummary {
  [key: string]: string | string[] | number | { slug: string; error: string }[];
  captured: string[];
  unchanged: string[];
  errors: { slug: string; error: string }[];
  candidates: number;
}

/** The job: capture the live sites whose screenshot is missing, old, or of another address. */
export async function runSystemScreenshots(deps: { fetch?: FetchLike; now?: Date; systemId?: string; force?: boolean } = {}): Promise<ScreenshotSummary> {
  const now = deps.now ?? new Date();
  const [maxPerRun, refreshDays] = await Promise.all([getSetting("screenshots.maxPerRun"), getSetting("screenshots.refreshDays")]);
  const systems = await db.system.findMany({
    where: {
      ...(deps.systemId ? { id: deps.systemId } : {}),
      contentStatus: "PUBLISHED",
      liveUrl: { not: null },
      NOT: { clientVisibility: "NDA_RESTRICTED" },
    },
    select: {
      id: true, slug: true, liveUrl: true, publishAt: true,
      screenshots: { where: { supersededAt: null }, select: { source: true, sourceUrl: true, createdAt: true }, take: 1 },
    },
    orderBy: { slug: "asc" },
  });
  const due = systems.filter((s) => {
    if (s.publishAt && s.publishAt > now) return false;
    if (!liveSite(s.liveUrl)) return false;
    const cur = s.screenshots[0];
    if (cur?.source === "upload") return false; // the owner's choice stands
    if (deps.force || !cur) return true;
    return cur.sourceUrl !== s.liveUrl || now.getTime() - cur.createdAt.getTime() >= refreshDays * DAY;
  });
  // Never captured first, then the oldest.
  due.sort((a, b) => (a.screenshots[0]?.createdAt.getTime() ?? 0) - (b.screenshots[0]?.createdAt.getTime() ?? 0));

  const summary: ScreenshotSummary = { captured: [], unchanged: [], errors: [], candidates: due.length, skipped: "" };
  if (SERVICE_OFF && !deps.fetch) return { ...summary, skipped: "screenshot capture is switched off (SCREENSHOT_SERVICE_URL=off)" };
  for (const s of due.slice(0, maxPerRun)) {
    try {
      const img = await captureSite(s.liveUrl!, deps.fetch);
      const { created } = await db.$transaction((tx) => storeScreenshot(tx as Tx, s.id, "auto", s.liveUrl, img));
      (created ? summary.captured : summary.unchanged).push(s.slug);
    } catch (err) {
      summary.errors.push({ slug: s.slug, error: err instanceof Error ? err.message.slice(0, 300) : String(err) });
    }
  }
  return summary;
}
