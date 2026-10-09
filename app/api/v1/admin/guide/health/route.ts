// GET /api/v1/admin/guide/health?days=7 — the AI guide's speed and reliability
// over 1, 7 or 30 days: answers, busy and failed turns, time to first word and
// to the full answer (p50/p95), fallback and cache rates, the models that
// answered, per-day counts and the latest turns. Read from GuideTurn (metrics
// only — no visitor text or identifiers). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { loadGuideHealth, parseWindow } from "@/lib/guide/health";

export const GET = withAdmin(async (request) => {
  const days = parseWindow(new URL(request.url).searchParams.get("days"));
  return NextResponse.json(await loadGuideHealth(days));
});
