// GET /api/v1/cv/uploads/{id} — download the owner's uploaded CV (#92). Read
// through PublicCvUpload, so only a current file of a visible upload option can
// be served — a superseded or hidden one is a 404 (BR-7.2, BR-7.5). Always an
// attachment, never rendered inline, with no content sniffing (BR-7.6).
// Rate-limited: each download streams the file out of the database.

import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/settings";
import { CV_CONTENT_TYPE } from "@/lib/cv/generate";
import { fileName } from "@/lib/cv/format";
import type { UploadFormat } from "@/lib/cv/uploads";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [maxPerWindow, windowMinutes] = await Promise.all([
    getSetting("cv.download.rateLimit.maxPerWindow"),
    getSetting("cv.download.rateLimit.windowMinutes"),
  ]);
  const rateLimit = await hitRateLimit("cv-download", request, maxPerWindow, windowMinutes * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many downloads from this connection — try again later.", details: { retryAfterMs: rateLimit.retryAfterMs } } },
      { status: 429 },
    );
  }

  const { id } = await params;
  const [file, profile] = await Promise.all([
    dbPublic.publicCvUpload.findUnique({ where: { id } }),
    dbPublic.publicProfile.findFirst({ select: { displayName: true } }),
  ]);
  if (!file) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found", details: null } }, { status: 404 });
  }

  const format = file.format as UploadFormat;
  return new NextResponse(new Uint8Array(file.fileData), {
    status: 200,
    headers: {
      "Content-Type": CV_CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="${fileName(profile?.displayName ?? "", format, file.uploadedAt)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
