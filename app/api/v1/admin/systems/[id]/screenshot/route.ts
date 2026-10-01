// /api/v1/admin/systems/{id}/screenshot — the system's screenshot (BR-1.18).
//   GET   the current screenshot's image (any system, published or not — the
//         admin's preview); 404 when there is none
//   POST  upload the owner's own (multipart field "file"): it must decode as an
//         image within screenshots.upload.maxMegabytes; it is re-encoded to WebP
//         with metadata dropped and becomes current — an upload wins over
//         automatic captures until "back to automatic"
// Capture now and back to automatic are their own routes (…/capture,
// …/automatic). Versions are superseded, never deleted. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { PhotoRejected, processPhoto } from "@/lib/profile/photos";
import { currentScreenshot, storeScreenshot } from "@/lib/systems/screenshots";

const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export const GET = withAdmin<{ id: string }>(async (_request, _ctx, { params }) => {
  const { id } = await params;
  const shot = await db.systemScreenshot.findFirst({ where: { systemId: id, supersededAt: null }, select: { fileData: true, mimeType: true, byteSize: true } });
  if (!shot) return errorResponse("NOT_FOUND", "No screenshot", 404);
  return new NextResponse(new Uint8Array(shot.fileData), {
    headers: { "Content-Type": shot.mimeType, "Content-Length": String(shot.byteSize), "Cache-Control": "private, no-store" },
  });
});

export const POST = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  if (!(await db.system.findUnique({ where: { id }, select: { id: true } }))) return errorResponse("NOT_FOUND", "System not found", 404);

  const [maxMegabytes, maxEdge] = await Promise.all([getSetting("screenshots.upload.maxMegabytes"), getSetting("screenshots.maxEdgePixels")]);
  const maxBytes = maxMegabytes * 1024 * 1024;
  const tooLarge = () => errorResponse("PAYLOAD_TOO_LARGE", `The screenshot is larger than ${maxMegabytes} MB.`, 413);
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes + MULTIPART_OVERHEAD_BYTES) return tooLarge();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("VALIDATION_ERROR", 'Send the screenshot as a multipart form field named "file".', 400);
  }
  if (file.size > maxBytes) return tooLarge();

  try {
    const processed = await processPhoto(new Uint8Array(await file.arrayBuffer()), maxEdge);
    const { created } = await write((tx) => storeScreenshot(tx, id, "upload", null, processed));
    return NextResponse.json({ screenshot: await currentScreenshot(id) }, { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof PhotoRejected) return errorResponse("UNSUPPORTED_FILE", "That file isn't an image we can read — upload a PNG, JPEG, WebP or AVIF screenshot.", 415);
    throw err;
  }
});
