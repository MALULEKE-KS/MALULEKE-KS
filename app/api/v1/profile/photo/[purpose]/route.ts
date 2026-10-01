// GET /api/v1/profile/photo/{purpose} — the owner's current photo for a slot
// (e.g. about), as the image itself (F5c, D6; BR-1.17). Cached by its content
// hash: a ?v= link never changes, and a new upload gets a new link.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";
import { isPhotoPurpose } from "@/lib/profile/photos";

export async function GET(request: Request, { params }: { params: Promise<{ purpose: string }> }) {
  const { purpose } = await params;
  const photo = isPhotoPurpose(purpose) ? await dbPublic.publicProfilePhoto.findUnique({ where: { purpose } }) : null;
  if (!photo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No photo", details: null } }, { status: 404 });
  }
  const etag = `"${photo.sha256}"`;
  const versioned = new URL(request.url).searchParams.get("v") === photo.sha256.slice(0, 12);
  const headers = {
    ETag: etag,
    "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300, stale-while-revalidate=86400",
  };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(new Uint8Array(photo.fileData), { headers: { ...headers, "Content-Type": photo.mimeType, "Content-Length": String(photo.byteSize) } });
}
