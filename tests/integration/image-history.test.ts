// @vitest-environment node
// tests/integration/image-history.test.ts
// BR-1.17 / BR-1.18 as amended (D-054, the owner's instruction 2026-10-23): replacing an image keeps the
// old version; a version is permanently deleted only when the owner asks — never the current one, and the
// database itself refuses a delete that didn't come through the explicit path (app.version_delete).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { deletePhotoVersion, restorePhoto } from "@/lib/profile/photos";
import { deleteScreenshotVersion, listScreenshotVersions, restoreScreenshot } from "@/lib/systems/screenshots";

const RUN = `ih${Date.now().toString(36)}`;
const PURPOSE = `test-${RUN}`;

async function webp() {
  const colour = { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) };
  const data = await sharp({ create: { width: 16, height: 10, channels: 3, background: colour } }).webp().toBuffer();
  return { data, sha256: createHash("sha256").update(data).digest("hex"), width: 16, height: 10 };
}

async function addPhoto() {
  const img = await webp();
  await db.profilePhoto.updateMany({ where: { purpose: PURPOSE, supersededAt: null }, data: { supersededAt: new Date() } });
  return db.profilePhoto.create({
    data: { purpose: PURPOSE, altText: "Test image", mimeType: "image/webp", width: img.width, height: img.height, byteSize: img.data.length, sha256: img.sha256, fileData: img.data },
  });
}

let systemId: string;
async function addShot() {
  const img = await webp();
  await db.systemScreenshot.updateMany({ where: { systemId, supersededAt: null }, data: { supersededAt: new Date() } });
  return db.systemScreenshot.create({
    data: { systemId, source: "upload", sourceUrl: null, mimeType: "image/webp", width: img.width, height: img.height, byteSize: img.data.length, sha256: img.sha256, fileData: img.data },
  });
}

beforeAll(async () => {
  const org = await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } });
  const status = await db.status.findUniqueOrThrow({ where: { key: "finished" } });
  systemId = (await db.system.create({ data: { name: `${RUN} system`, slug: `${RUN}-system`, description: "Fixture", organizationId: org.id, statusId: status.id } })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("photo versions (BR-1.17 as amended)", () => {
  it("keeps the old version when a photo is replaced, and can make it current again", async () => {
    const first = await addPhoto();
    const second = await addPhoto();
    const rows = await db.profilePhoto.findMany({ where: { purpose: PURPOSE } });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === first.id)?.supersededAt).not.toBeNull();
    await db.$transaction((tx) => restorePhoto(tx, first.id));
    const current = await db.profilePhoto.findFirst({ where: { purpose: PURPOSE, supersededAt: null } });
    expect(current?.id).toBe(first.id);
    expect(second.id).not.toBe(first.id);
  });

  it("refuses to delete the current photo", async () => {
    const current = await db.profilePhoto.findFirstOrThrow({ where: { purpose: PURPOSE, supersededAt: null } });
    expect(await db.$transaction((tx) => deletePhotoVersion(tx, current.id))).toBe("current");
    expect(await db.profilePhoto.findUnique({ where: { id: current.id } })).not.toBeNull();
  });

  it("deletes an earlier version only through the explicit path — the database refuses any other delete", async () => {
    const earlier = await db.profilePhoto.findFirstOrThrow({ where: { purpose: PURPOSE, NOT: { supersededAt: null } } });
    await expect(db.profilePhoto.delete({ where: { id: earlier.id } })).rejects.toThrow(/deleted only when the owner asks/);
    expect(await db.$transaction((tx) => deletePhotoVersion(tx, earlier.id))).toBe("deleted");
    expect(await db.profilePhoto.findUnique({ where: { id: earlier.id } })).toBeNull();
  });
});

describe("screenshot versions (BR-1.18 as amended)", () => {
  it("lists every version, restores an earlier one, refuses the current, deletes an earlier one on request", async () => {
    const first = await addShot();
    const second = await addShot();
    const versions = await listScreenshotVersions(systemId);
    expect(versions.map((v) => v.id)).toEqual([second.id, first.id]);
    expect(versions[0]?.current).toBe(true);

    await db.$transaction((tx) => restoreScreenshot(tx, systemId, first.id));
    expect((await db.systemScreenshot.findFirst({ where: { systemId, supersededAt: null } }))?.id).toBe(first.id);

    expect(await db.$transaction((tx) => deleteScreenshotVersion(tx, systemId, first.id))).toBe("current");
    await expect(db.systemScreenshot.delete({ where: { id: second.id } })).rejects.toThrow(/deleted only when the owner asks/);
    expect(await db.$transaction((tx) => deleteScreenshotVersion(tx, systemId, second.id))).toBe("deleted");
    expect(await listScreenshotVersions(systemId)).toHaveLength(1);
  });
});
