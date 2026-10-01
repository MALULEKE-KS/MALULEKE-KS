// @vitest-environment node
// tests/integration/system-screenshots.test.ts
// BR-1.18 — every system's screenshot: captured from its live site (a fake
// screenshot service here) or uploaded by the owner, decoded and re-encoded,
// one current per system, the upload wins over automatic captures (the
// database refuses otherwise), versions never altered or deleted, served only
// for live non-NDA systems with a content-hash cache key.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { GET as getScreenshot } from "@/app/api/v1/systems/[slug]/screenshot/route";
import { POST as upload, GET as adminPreview } from "@/app/api/v1/admin/systems/[id]/screenshot/route";
import { POST as automatic } from "@/app/api/v1/admin/systems/[id]/screenshot/automatic/route";
import { db } from "@/lib/db";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getPublicSystemBySlug } from "@/lib/queries/systems";
import { runSystemScreenshots } from "@/lib/systems/screenshots";

const RUN = `ss${Date.now().toString(36)}`;
const DAY = 86_400_000;
let cookie: string;
let orgId: string;
let statusId: string;

// Screenshots are append-only, and the test database persists: each image carries a random mark.
const mark = () => ({ r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) });
async function png(width = 1440, height = 900) {
  const m = await sharp({ create: { width: 32, height: 32, channels: 3, background: mark() } }).png().toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#203040" } }).composite([{ input: m, left: 0, top: 0 }]).png().toBuffer();
}

/** A fake screenshot service: renders anything to a fresh PNG; records what it was asked. */
const asked: string[] = [];
const service = async (url: string) => {
  if (url.startsWith("https://api.microlink.io/")) {
    asked.push(new URL(url).searchParams.get("url")!);
    return new Response(JSON.stringify({ status: "success", data: { screenshot: { url: "https://shots.example/x.png" } } }), { status: 200 });
  }
  if (url === "https://shots.example/x.png") return new Response(new Uint8Array(await png()), { status: 200 });
  return new Response("{}", { status: 404 });
};

let seq = 0;
async function system(extra: Record<string, unknown> = {}, publish = true) {
  seq += 1;
  const s = await db.system.create({
    data: { name: `${RUN} ${seq}`, slug: `${RUN}-${seq}`, description: "Fixture", organizationId: orgId, statusId, liveUrl: `https://${RUN}-${seq}.example.com`, ...extra },
  });
  return publish ? db.system.update({ where: { id: s.id }, data: { contentStatus: "PUBLISHED" } }) : s;
}
const current = (systemId: string) => db.systemScreenshot.findFirst({ where: { systemId, supersededAt: null } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function uploadRequest(id: string, bytes: Uint8Array) {
  const form = new FormData();
  form.append("file", new File([bytes.slice()], "shot.png", { type: "image/png" }));
  return new NextRequest(`http://localhost/api/v1/admin/systems/${id}/screenshot`, { method: "POST", body: form, headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } });
}
const adminReq = (id: string, path = "", method = "POST") =>
  new NextRequest(`http://localhost/api/v1/admin/systems/${id}/screenshot${path}`, { method, headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } });

beforeAll(async () => {
  const admin = await db.adminUser.create({ data: { email: `test-shots-${RUN}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, admin.sessionVersion);
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "finished" } })).id;
});

afterAll(async () => {
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("BR-1.18 — automatic captures", () => {
  it("captures a live system's site, stores it as WebP, and serves it with a content-hash link", async () => {
    const s = await system();
    const summary = await runSystemScreenshots({ systemId: s.id, fetch: service });
    expect(summary.captured).toEqual([s.slug]);
    expect(asked).toContain(s.liveUrl);

    const shot = await current(s.id);
    expect(shot).toMatchObject({ source: "auto", sourceUrl: s.liveUrl, mimeType: "image/webp" });
    expect(Math.max(shot!.width, shot!.height)).toBeLessThanOrEqual(1600);

    // The public pages link to it by hash…
    const page = await getPublicSystemBySlug(s.slug);
    expect(page!.screenshotUrl).toBe(`/api/v1/systems/${s.slug}/screenshot?v=${shot!.sha256.slice(0, 12)}`);
    // …and the route serves the image, immutable under that link.
    const res = await getScreenshot(new Request(`http://localhost${page!.screenshotUrl}`), { params: Promise.resolve({ slug: s.slug }) });
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("never captures or serves an unpublished or NDA system", async () => {
    const draft = await system({}, false);
    const nda = await system({ clientVisibility: "NDA_RESTRICTED", clientApproved: true });
    const summary = await runSystemScreenshots({ fetch: service, systemId: draft.id });
    expect(summary.candidates).toBe(0);
    expect((await runSystemScreenshots({ fetch: service, systemId: nda.id })).candidates).toBe(0);
    // Even a screenshot stored for them stays private.
    await db.systemScreenshot.create({ data: { systemId: nda.id, source: "upload", mimeType: "image/webp", width: 1, height: 1, byteSize: 1, sha256: "a".repeat(64), fileData: Buffer.from([1]) } });
    const res = await getScreenshot(new Request("http://localhost/x"), { params: Promise.resolve({ slug: nda.slug }) });
    expect(res.status).toBe(404);
  });

  it("retakes only when the capture is old or the address changed", async () => {
    const s = await system();
    const now = new Date();
    await runSystemScreenshots({ systemId: s.id, fetch: service, now });
    const first = (await current(s.id))!.id;
    expect((await runSystemScreenshots({ systemId: s.id, fetch: service, now: new Date(now.getTime() + 5 * DAY) })).candidates).toBe(0);
    await db.system.update({ where: { id: s.id }, data: { liveUrl: `https://${RUN}-moved.example.com` } });
    expect((await runSystemScreenshots({ systemId: s.id, fetch: service, now: new Date(now.getTime() + 5 * DAY) })).captured).toEqual([s.slug]);
    expect((await current(s.id))!.id).not.toBe(first);
  });
});

describe("BR-1.18 — the owner's upload wins", () => {
  it("an upload becomes current; the job leaves it alone; the database refuses an automatic version over it", async () => {
    const s = await system();
    await runSystemScreenshots({ systemId: s.id, fetch: service });
    const res = await upload(uploadRequest(s.id, new Uint8Array(await png(3000, 2000))), params(s.id));
    expect(res.status).toBe(201);
    expect(await current(s.id)).toMatchObject({ source: "upload", sourceUrl: null });

    expect((await runSystemScreenshots({ systemId: s.id, fetch: service, force: true })).candidates).toBe(0);
    await expect(
      db.systemScreenshot.create({ data: { systemId: s.id, source: "auto", sourceUrl: "https://x.example", mimeType: "image/webp", width: 1, height: 1, byteSize: 1, sha256: "b".repeat(64), fileData: Buffer.from([1]) } }),
    ).rejects.toThrow(/BR-1\.18/);

    // The admin previews it whatever its state.
    expect((await adminPreview(adminReq(s.id, "", "GET"), params(s.id))).headers.get("content-type")).toBe("image/webp");

    // Back to automatic: the upload is retired, the next run captures again.
    const back = await automatic(adminReq(s.id, "/automatic"), params(s.id));
    expect((await back.json()).retired).toBe(true);
    expect((await runSystemScreenshots({ systemId: s.id, fetch: service })).captured).toEqual([s.slug]);
    expect(await current(s.id)).toMatchObject({ source: "auto" });
  });

  it("refuses a file that isn't an image", async () => {
    const s = await system();
    const res = await upload(uploadRequest(s.id, new TextEncoder().encode("<svg onload=alert(1)>")), params(s.id));
    expect(res.status).toBe(415);
  });

  it("versions are never altered or deleted", async () => {
    const s = await system();
    await runSystemScreenshots({ systemId: s.id, fetch: service });
    const shot = (await current(s.id))!;
    await expect(db.systemScreenshot.delete({ where: { id: shot.id } })).rejects.toThrow(/BR-1\.18/);
    await expect(db.systemScreenshot.update({ where: { id: shot.id }, data: { width: 2 } })).rejects.toThrow(/BR-1\.18/);
  });
});
