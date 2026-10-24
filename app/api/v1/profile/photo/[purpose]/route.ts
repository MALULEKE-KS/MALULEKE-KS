// GET /api/v1/profile/photo/{purpose} — the owner's current photo for a slot
// (e.g. about), as the image itself (F5c, D6; BR-1.17). Cached by its content
// hash: a ?v= link never changes, and a new upload gets a new link. With ?w= (one of PHOTO_WIDTHS) a
// versioned link is served resized to that width as WebP, so a phone gets a phone-sized hero; the CDN
// keeps each size for good (the speed pass, 2026-10-25).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import sharp from "sharp";
import { PHOTO_WIDTHS, type PhotoWidth } from "@/lib/media/photo-src";
import { dbPublic } from "@/lib/db";
import { isPhotoPurpose } from "@/lib/profile/photos";

export async function GET(request: Request, { params }: { params: Promise<{ purpose: string }> }) {
  const { purpose } = await params;
  const photo = isPhotoPurpose(purpose) ? await dbPublic.publicProfilePhoto.findUnique({ where: { purpose } }) : null;
  if (!photo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No photo", details: null } }, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const versioned = query.get("v") === photo.sha256.slice(0, 12);
  const asked = Number(query.get("w"));
  const width = versioned && PHOTO_WIDTHS.includes(asked as PhotoWidth) && asked < photo.width ? asked : null;
  const etag = `"${photo.sha256}${width ? `-${width}` : ""}"`;
  const headers = {
    ETag: etag,
    // Versioned links are kept by the CDN too (s-maxage), so the visitor's nearest edge serves the photo (D-062).
    "Cache-Control": versioned ? "public, max-age=31536000, s-maxage=31536000, immutable" : "public, max-age=300, stale-while-revalidate=86400",
  };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  if (width) {
    const resized = await sharp(photo.fileData).resize({ width, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    return new NextResponse(new Uint8Array(resized), { headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(resized.length) } });
  }
  return new NextResponse(new Uint8Array(photo.fileData), { headers: { ...headers, "Content-Type": photo.mimeType, "Content-Length": String(photo.byteSize) } });
}
