// /api/v1/admin/systems/{id}/screenshot/versions/{versionId} — one version of the
// system's screenshot (BR-1.18; D-054).
//   GET     its image — the admin's preview of any version
//   DELETE  permanently delete it, only when the owner asks ({ confirm: true }) —
//           never the current one (replace it first)
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { deleteScreenshotVersion } from "@/lib/systems/screenshots";

const ConfirmSchema = z.object({ confirm: z.literal(true) });

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

export const GET = withAdmin<{ id: string; versionId: string }>(async (_request, _ctx, { params }) => {
  const { id, versionId } = await params;
  const shot = await db.systemScreenshot.findFirst({ where: { id: versionId, systemId: id }, select: { fileData: true, mimeType: true, byteSize: true } });
  if (!shot) return errorResponse("NOT_FOUND", "Screenshot not found", 404);
  return new NextResponse(new Uint8Array(shot.fileData), {
    headers: { "Content-Type": shot.mimeType, "Content-Length": String(shot.byteSize), "Cache-Control": "private, max-age=3600" },
  });
});

export const DELETE = withAdmin<{ id: string; versionId: string }>(async (request, { write }, { params }) => {
  const { id, versionId } = await params;
  if (!ConfirmSchema.safeParse(await request.json().catch(() => null)).success) {
    return errorResponse("VALIDATION_ERROR", "Body must be { confirm: true } — a screenshot is deleted only on purpose", 400);
  }
  const outcome = await write((tx) => deleteScreenshotVersion(tx, id, versionId));
  if (outcome === "missing") return errorResponse("NOT_FOUND", "Screenshot not found", 404);
  if (outcome === "current") return errorResponse("CURRENT_VERSION", "This is the current screenshot — replace it first, then delete the old version.", 409);
  return new NextResponse(null, { status: 204 });
});
