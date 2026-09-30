// GET/POST /api/v1/admin/cv/uploads — the owner's uploaded CV (#92). GET lists
// every version (newest first per format, no file bytes). POST takes one file
// as multipart/form-data field "file": accepted only if its content really is a
// PDF or a Word document, within the size setting (BR-7.6); it becomes the
// current file of its format and the previous one is superseded, never deleted
// (BR-7.2). Re-uploading the current file changes nothing (200, not 201).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { CvUploadRejected, listCvUploadVersions, storeCvUpload, toCvUploadVersion } from "@/lib/cv/uploads";

const MULTIPART_OVERHEAD_BYTES = 64 * 1024; // form boundaries and headers around the file

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export const GET = withAdmin(async () => {
  const versions = await listCvUploadVersions(db);
  return NextResponse.json({ versions: versions.map(toCvUploadVersion) });
});

export const POST = withAdmin(async (request, { write }) => {
  const maxMegabytes = await getSetting("cv.upload.maxMegabytes");
  const maxBytes = maxMegabytes * 1024 * 1024;
  const tooLarge = () => errorResponse("PAYLOAD_TOO_LARGE", `The file is larger than ${maxMegabytes} MB.`, 413);

  // Refuse an oversized body before reading it.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + MULTIPART_OVERHEAD_BYTES) return tooLarge();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("VALIDATION_ERROR", 'Send the CV as a multipart form field named "file".', 400);
  }
  if (file.size > maxBytes) return tooLarge();

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const { version, created } = await write((tx) => storeCvUpload(tx, bytes, file.name));
    return NextResponse.json(toCvUploadVersion(version), { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof CvUploadRejected) return errorResponse("UNSUPPORTED_FILE", err.message, 415);
    throw err;
  }
});
