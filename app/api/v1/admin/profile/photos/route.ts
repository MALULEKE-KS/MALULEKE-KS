// GET/POST /api/v1/admin/profile/photos — the owner's photos (F5c, D6;
// BR-1.17). GET lists every version (no bytes). POST takes multipart fields
// "file", "purpose" and "altText": the file must decode as an image within the
// size setting; it is re-encoded to WebP with every piece of metadata dropped,
// and becomes the current photo of its purpose — the previous one is
// superseded, never deleted. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { isPhotoPurpose, listPhotoVersions, PhotoRejected, processPhoto, storePhoto, toPhotoVersion } from "@/lib/profile/photos";

const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export const GET = withAdmin(async () => {
  const versions = await listPhotoVersions(db);
  return NextResponse.json({ versions: versions.map(toPhotoVersion) });
});

export const POST = withAdmin(async (request, { write }) => {
  const [maxMegabytes, maxEdge] = await Promise.all([getSetting("profile.photo.maxMegabytes"), getSetting("profile.photo.maxEdgePixels")]);
  const maxBytes = maxMegabytes * 1024 * 1024;
  const tooLarge = () => errorResponse("PAYLOAD_TOO_LARGE", `The photo is larger than ${maxMegabytes} MB.`, 413);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + MULTIPART_OVERHEAD_BYTES) return tooLarge();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const purpose = String(form?.get("purpose") ?? "");
  const altText = String(form?.get("altText") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("VALIDATION_ERROR", 'Send the photo as a multipart form field named "file".', 400);
  }
  if (!isPhotoPurpose(purpose)) return errorResponse("VALIDATION_ERROR", `Unknown photo purpose "${purpose}".`, 400);
  if (altText.length < 1 || altText.length > 300) {
    return errorResponse("VALIDATION_ERROR", "Describe the photo in 1–300 characters (for screen readers).", 400);
  }
  if (file.size > maxBytes) return tooLarge();

  try {
    const processed = await processPhoto(new Uint8Array(await file.arrayBuffer()), maxEdge);
    const { version, created } = await write((tx) => storePhoto(tx, purpose, altText, processed));
    return NextResponse.json(toPhotoVersion(version), { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof PhotoRejected) return errorResponse("UNSUPPORTED_FILE", err.message, 415);
    throw err;
  }
});
