// lib/profile/photos.ts
// The owner's photos (F5c, D6; BR-1.17). An upload is accepted only if its
// bytes decode as an image (the name and declared type are never trusted); it
// is re-encoded to WebP, resized to the admin's longest-edge setting, and every
// piece of metadata — EXIF, GPS location, camera details — is dropped before it
// is stored. A new upload supersedes the current photo of its purpose; nothing
// is deleted or altered (the database enforces it), and an earlier version can
// be made current again.

import { createHash } from "node:crypto";
import sharp from "sharp";
import type { Tx } from "@/lib/audit";
import type { SettingKey } from "@/lib/settings/registry";

/** A photo slot. `processing` names the settings that set how an upload to it is resized and encoded (default: the global photo settings). */
export interface PhotoSlot {
  label: string;
  description: string;
  processing?: { maxEdgeSetting: SettingKey; qualitySetting: SettingKey };
}

/** Which photo slots exist. A new slot is one entry here — no migration. */
export const PHOTO_PURPOSES = {
  about: { label: "About page portrait", description: "Shown beside your story on /about." },
  "hero-desktop": {
    label: "Home hero — desktop cover image",
    description: "The wide image behind the whole home hero on tablets and desktops (landscape, about 16:9). Credit and focal point: Page content → Home — hero. Size and quality: Settings → home.hero.desktop.*; darkness: home.hero.scrim.",
    processing: { maxEdgeSetting: "home.hero.desktop.maxEdgePixels", qualitySetting: "home.hero.desktop.quality" },
  },
  "hero-mobile": {
    label: "Home hero — phone cover image",
    description: "The portrait image behind the whole home hero on phones (about 9:16). Size and quality: Settings → home.hero.mobile.*",
    processing: { maxEdgeSetting: "home.hero.mobile.maxEdgePixels", qualitySetting: "home.hero.mobile.quality" },
  },
} as const satisfies Record<string, PhotoSlot>;

export type PhotoPurpose = keyof typeof PHOTO_PURPOSES;

/** The settings that govern uploads to this slot, or null for the global photo settings. */
export function photoProcessing(purpose: PhotoPurpose) {
  const slot: PhotoSlot = PHOTO_PURPOSES[purpose];
  return slot.processing ?? null;
}

export function isPhotoPurpose(value: string): value is PhotoPurpose {
  return Object.prototype.hasOwnProperty.call(PHOTO_PURPOSES, value);
}

export class PhotoRejected extends Error {}

const ACCEPTED_INPUT = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const WEBP_QUALITY = 86;

/** Decode, resize and re-encode an upload. Throws PhotoRejected for anything that isn't a supported image. */
export async function processPhoto(bytes: Uint8Array, maxEdgePixels: number, quality: number = WEBP_QUALITY) {
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    throw new PhotoRejected("That file isn't an image we can read — upload a JPEG, PNG, WebP or AVIF.");
  }
  if (!format || !ACCEPTED_INPUT.has(format)) {
    throw new PhotoRejected("Upload a JPEG, PNG, WebP or AVIF photo.");
  }
  // rotate() applies the camera's orientation before the EXIF that carried it is dropped.
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: maxEdgePixels, height: maxEdgePixels, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height, mimeType: "image/webp" as const };
}

const versionFields = {
  id: true,
  purpose: true,
  altText: true,
  mimeType: true,
  width: true,
  height: true,
  byteSize: true,
  sha256: true,
  uploadedAt: true,
  supersededAt: true,
} as const;

export type PhotoVersion = {
  id: string;
  purpose: string;
  altText: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  uploadedAt: Date;
  supersededAt: Date | null;
};

export function toPhotoVersion(v: PhotoVersion) {
  return {
    id: v.id,
    purpose: v.purpose,
    altText: v.altText,
    width: v.width,
    height: v.height,
    byteSize: v.byteSize,
    uploadedAt: v.uploadedAt.toISOString(),
    current: v.supersededAt === null,
    // The admin previews a version through its own route; the public one is /api/v1/profile/photo/{purpose}.
    previewUrl: `/api/v1/admin/profile/photos/${v.id}`,
  };
}

/**
 * Store a processed photo as the current one for its purpose, superseding the
 * previous one (BR-1.17). Uploading the photo that's already current changes nothing.
 */
export async function storePhoto(tx: Tx, purpose: PhotoPurpose, altText: string, photo: Awaited<ReturnType<typeof processPhoto>>) {
  const sha256 = createHash("sha256").update(photo.data).digest("hex");
  const current = await tx.profilePhoto.findFirst({ where: { purpose, supersededAt: null }, select: versionFields });
  if (current?.sha256 === sha256) return { version: current, created: false };

  await tx.profilePhoto.updateMany({ where: { purpose, supersededAt: null }, data: { supersededAt: new Date() } });
  const version = await tx.profilePhoto.create({
    data: {
      purpose,
      altText,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      byteSize: photo.data.length,
      sha256,
      fileData: Buffer.from(photo.data),
    },
    select: versionFields,
  });
  return { version, created: true };
}

/** Make an earlier version current again (BR-1.17). Null if it doesn't exist. */
export async function restorePhoto(tx: Tx, id: string) {
  const target = await tx.profilePhoto.findUnique({ where: { id }, select: versionFields });
  if (!target) return null;
  if (target.supersededAt === null) return target;
  await tx.profilePhoto.updateMany({ where: { purpose: target.purpose, supersededAt: null }, data: { supersededAt: new Date() } });
  return tx.profilePhoto.update({ where: { id }, data: { supersededAt: null }, select: versionFields });
}

export async function listPhotoVersions(tx: Pick<Tx, "profilePhoto">) {
  return tx.profilePhoto.findMany({ select: versionFields, orderBy: [{ purpose: "asc" }, { uploadedAt: "desc" }] });
}
