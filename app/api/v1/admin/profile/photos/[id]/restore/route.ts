// POST /api/v1/admin/profile/photos/{id}/restore — make an earlier photo
// version current again (BR-1.17). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { restorePhoto, toPhotoVersion } from "@/lib/profile/photos";

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  const photo = await write((tx) => restorePhoto(tx, id));
  if (!photo) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Photo not found", details: null } }, { status: 404 });
  return NextResponse.json(toPhotoVersion(photo));
});
