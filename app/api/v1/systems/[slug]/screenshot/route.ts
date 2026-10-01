// GET /api/v1/systems/{slug}/screenshot — a live system's current screenshot,
// as the image itself (BR-1.18). Captured from its live site or uploaded by the
// owner; never for an unpublished or NDA system (PublicSystemScreenshot).
// Cached by its content hash: a ?v= link never changes, and a new capture gets
// a new link. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shot = await dbPublic.publicSystemScreenshot.findUnique({ where: { slug } });
  if (!shot) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No screenshot", details: null } }, { status: 404 });
  }
  const etag = `"${shot.sha256}"`;
  const versioned = new URL(request.url).searchParams.get("v") === shot.sha256.slice(0, 12);
  const headers = {
    ETag: etag,
    "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300, stale-while-revalidate=86400",
  };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(new Uint8Array(shot.fileData), { headers: { ...headers, "Content-Type": shot.mimeType, "Content-Length": String(shot.byteSize) } });
}
