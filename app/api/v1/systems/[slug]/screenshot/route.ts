// GET /api/v1/systems/{slug}/screenshot — a live system's current screenshot,
// as the image itself (BR-1.18). Captured from its live site or uploaded by the
// owner; never for an unpublished or NDA system (PublicSystemScreenshot).
// Cached by its content hash: a ?v= link never changes, and a new capture gets
// a new link. With ?w= (one of SCREENSHOT_WIDTHS) a versioned link is served
// resized to that width as WebP, so a card gets the size it is drawn at (D-062);
// versioned answers are kept by the CDN too (s-maxage), so a visitor's nearest
// edge serves them, not the function. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import sharp from "sharp";
import { dbPublic } from "@/lib/db";
import { SCREENSHOT_WIDTHS, type ScreenshotWidth } from "@/lib/media/screenshot-src";

const FOREVER = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shot = await dbPublic.publicSystemScreenshot.findUnique({ where: { slug } });
  if (!shot) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No screenshot", details: null } }, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const versioned = query.get("v") === shot.sha256.slice(0, 12);
  const asked = Number(query.get("w"));
  const width = versioned && SCREENSHOT_WIDTHS.includes(asked as ScreenshotWidth) ? asked : null;
  const etag = `"${shot.sha256}${width ? `-${width}` : ""}"`;
  const headers = { ETag: etag, "Cache-Control": versioned ? FOREVER : "public, max-age=300, stale-while-revalidate=86400" };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });

  if (width) {
    const resized = await sharp(shot.fileData).resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    return new NextResponse(new Uint8Array(resized), { headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(resized.length) } });
  }
  return new NextResponse(new Uint8Array(shot.fileData), { headers: { ...headers, "Content-Type": shot.mimeType, "Content-Length": String(shot.byteSize) } });
}
