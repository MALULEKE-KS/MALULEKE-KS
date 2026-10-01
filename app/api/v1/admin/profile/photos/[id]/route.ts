// GET/PATCH /api/v1/admin/profile/photos/{id} — preview any version (the
// image itself), or change its alt text — the only thing about a photo that
// can change (BR-1.17). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { toPhotoVersion } from "@/lib/profile/photos";

const AltTextSchema = z.object({ altText: z.string().trim().min(1).max(300) });

function notFound() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Photo not found", details: null } }, { status: 404 });
}

export const GET = withAdmin<{ id: string }>(async (_request, _admin, { params }) => {
  const { id } = await params;
  const photo = await db.profilePhoto.findUnique({ where: { id } });
  if (!photo) return notFound();
  return new NextResponse(new Uint8Array(photo.fileData), {
    headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" },
  });
});

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = AltTextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Body must be { altText } — 1 to 300 characters", details: null } }, { status: 400 });
  }
  if (!(await db.profilePhoto.findUnique({ where: { id }, select: { id: true } }))) return notFound();
  const photo = await write((tx) => tx.profilePhoto.update({ where: { id }, data: { altText: parsed.data.altText } }));
  return NextResponse.json(toPhotoVersion(photo));
});
