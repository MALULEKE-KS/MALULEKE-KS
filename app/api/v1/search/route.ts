// GET /api/v1/search?q=&limit= — instant search (approved feature 5, #82)
// over published systems, journey entries and skills. search_public() reads
// only the public views, so a result can never be hidden work. Rate-limited
// per visitor (admin-editable: search.rateLimit.*). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { SearchQuerySchema, searchPublic } from "@/lib/queries/search";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { getSetting } from "@/lib/settings";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = SearchQuerySchema.safeParse({ q: params.get("q") ?? "", limit: params.get("limit") ?? undefined });
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "q must be 2–100 characters; limit 1–25", 400, { issues: parsed.error.issues });
  }

  const [maxPerWindow, windowMinutes] = await Promise.all([
    getSetting("search.rateLimit.maxPerWindow"),
    getSetting("search.rateLimit.windowMinutes"),
  ]);
  const limited = await hitRateLimit("search", request, maxPerWindow, windowMinutes * 60 * 1000);
  if (!limited.allowed) {
    return errorResponse("RATE_LIMITED", "Too many searches — try again shortly.", 429, { retryAfterMs: limited.retryAfterMs });
  }

  return NextResponse.json(await searchPublic(parsed.data.q, parsed.data.limit));
}
