// POST /api/v1/cv/generate — the CV engine (#74): the same CV as PDF or Word
// (DOCX), built from live data at generation time (BR-7.1); prior documents of
// the same role and format are superseded, not deleted (BR-7.2). Public — the
// visitor-facing download buttons on /cv. Rate-limited: a real render and a
// database write per request is cheap to abuse otherwise.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { CvGenerateInputSchema } from "@/lib/schemas";
import { generateCvDocument } from "@/lib/cv/generate";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/settings";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = CvGenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid request", 400, { issues: parsed.error.issues });
  }

  // Admin-tunable platform settings (#67), bounded by the registry.
  const [maxPerWindow, windowMinutes] = await Promise.all([
    getSetting("cv.rateLimit.maxPerWindow"),
    getSetting("cv.rateLimit.windowMinutes"),
  ]);
  const rateLimit = await hitRateLimit("cv-generate", request, maxPerWindow, windowMinutes * 60 * 1000);
  if (!rateLimit.allowed) {
    return errorResponse("RATE_LIMITED", "Too many requests from this connection — try again later.", 429, {
      retryAfterMs: rateLimit.retryAfterMs,
    });
  }

  // The site's own origin is the CV's portfolio link and the download host.
  const { document } = await generateCvDocument({
    targetRole: parsed.data.targetRole?.trim() || null,
    format: parsed.data.format,
    siteUrl: new URL(request.url).origin,
  });

  return NextResponse.json(
    { fileUrl: document.fileUrl, generatedAt: document.generatedAt.toISOString(), format: document.format },
    { status: 201 },
  );
}
