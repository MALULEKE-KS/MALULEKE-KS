// @vitest-environment node
// tests/integration/profile-photos.test.ts
// F5c (D6), BR-1.17: the owner's photos — decoded images only, re-encoded
// without metadata (location!), one current per purpose, versions never
// altered or deleted, served publicly with a content-hash cache key.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { GET as getPhoto } from "@/app/api/v1/profile/photo/[purpose]/route";
import { GET as getProfile } from "@/app/api/v1/profile/route";
import { POST as uploadPhoto } from "@/app/api/v1/admin/profile/photos/route";
import { PATCH as patchPhoto } from "@/app/api/v1/admin/profile/photos/[id]/route";
import { POST as restorePhoto } from "@/app/api/v1/admin/profile/photos/[id]/restore/route";
import { db } from "@/lib/db";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";

let cookie: string;
let previousCurrentId: string | null = null;

// Photos are append-only (BR-1.17) and the test database persists between
// runs, so every run's images must be new: a small square of a random colour
// in one corner gives each a hash no earlier run has stored.
const RUN_MARK = { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) };

async function jpegWithGps(color: string) {
  const mark = await sharp({ create: { width: 24, height: 24, channels: 3, background: RUN_MARK } }).png().toBuffer();
  return sharp({ create: { width: 2400, height: 1600, channels: 3, background: color } })
    .composite([{ input: mark, left: 0, top: 0 }])
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", Model: "Secret Model" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 1/1 0/1" } })
    .toBuffer();
}

function uploadRequest(bytes: Uint8Array | null, fields: Record<string, string>, session: string | null = cookie) {
  const form = new FormData();
  if (bytes) form.append("file", new File([bytes.slice()], "photo.jpg", { type: "image/jpeg" }));
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/v1/admin/profile/photos", {
    method: "POST",
    body: form,
    headers: session ? { cookie: `${SESSION_COOKIE_NAME}=${session}` } : {},
  });
}

beforeAll(async () => {
  const admin = await db.adminUser.create({ data: { email: `test-photos-${Date.now().toString(36)}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, admin.sessionVersion);
  previousCurrentId = (await db.profilePhoto.findFirst({ where: { purpose: "about", supersededAt: null } }))?.id ?? null;
});

afterAll(async () => {
  // Photos are never deleted (BR-1.17): put back whatever was current before.
  if (previousCurrentId) {
    await db.profilePhoto.updateMany({ where: { purpose: "about", supersededAt: null }, data: { supersededAt: new Date() } });
    await db.profilePhoto.update({ where: { id: previousCurrentId }, data: { supersededAt: null } });
  }
});

describe("BR-1.17 — uploading a photo", () => {
  let firstId: string;

  it("stores a WebP, resized, with every piece of metadata — GPS included — dropped", async () => {
    const res = await uploadPhoto(uploadRequest(await jpegWithGps("#c2410c"), { purpose: "about", altText: "A test portrait" }));
    expect(res.status).toBe(201);
    const version = await res.json();
    firstId = version.id;
    expect(Math.max(version.width, version.height)).toBeLessThanOrEqual(1600);

    const row = await db.profilePhoto.findUniqueOrThrow({ where: { id: version.id } });
    expect(row.mimeType).toBe("image/webp");
    const meta = await sharp(row.fileData).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("serves the current photo publicly, cached by its content hash", async () => {
    const profile = await (await getProfile()).json();
    expect(profile.photos.about.alt).toBe("A test portrait");
    const url = new URL(profile.photos.about.url, "http://localhost");
    const res = await getPhoto(new NextRequest(url), { params: Promise.resolve({ purpose: "about" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("immutable");
    const etag = res.headers.get("etag")!;
    const again = await getPhoto(new NextRequest(url, { headers: { "if-none-match": etag } }), { params: Promise.resolve({ purpose: "about" }) });
    expect(again.status).toBe(304);
  });

  it("a new upload supersedes the old one; the old one can be made current again", async () => {
    const second = await (await uploadPhoto(uploadRequest(await jpegWithGps("#0f7a4b"), { purpose: "about", altText: "Another" }))).json();
    expect(second.current).toBe(true);
    expect((await db.profilePhoto.findUniqueOrThrow({ where: { id: firstId } })).supersededAt).not.toBeNull();
    const restored = await (await restorePhoto(new NextRequest(`http://localhost/api/v1/admin/profile/photos/${firstId}/restore`, { method: "POST", headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } }), { params: Promise.resolve({ id: firstId }) })).json();
    expect(restored.current).toBe(true);
  });

  it("only the alt text of a version can change — never its image, never deleted", async () => {
    const res = await patchPhoto(
      new NextRequest(`http://localhost/api/v1/admin/profile/photos/${firstId}`, { method: "PATCH", body: JSON.stringify({ altText: "Renamed" }), headers: { "Content-Type": "application/json", cookie: `${SESSION_COOKIE_NAME}=${cookie}` } }),
      { params: Promise.resolve({ id: firstId }) },
    );
    expect((await res.json()).altText).toBe("Renamed");
    await expect(db.profilePhoto.update({ where: { id: firstId }, data: { width: 1 } })).rejects.toThrow(/BR-1\.17/);
    await expect(db.profilePhoto.delete({ where: { id: firstId } })).rejects.toThrow(/BR-1\.17/);
  });

  it("refuses a file that isn't an image, an unknown purpose, a missing description, and a request without a session", async () => {
    expect((await uploadPhoto(uploadRequest(new TextEncoder().encode("not an image"), { purpose: "about", altText: "x" }))).status).toBe(415);
    expect((await uploadPhoto(uploadRequest(await jpegWithGps("#000"), { purpose: "nope", altText: "x" }))).status).toBe(400);
    expect((await uploadPhoto(uploadRequest(await jpegWithGps("#000"), { purpose: "about", altText: "" }))).status).toBe(400);
    expect((await uploadPhoto(uploadRequest(await jpegWithGps("#000"), { purpose: "about", altText: "x" }, null))).status).toBe(401);
  });
});
