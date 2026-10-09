// GET /api/v1/guide/check — the AI guide's latest nightly self-check: when it ran,
// how many fixed questions, how many passed, failed or could not be answered, and
// each check's id and category with its result. Read from the PublicGuideCheck view;
// never an answer or a visitor's words. 404 until the first run. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getGuideCheck } from "@/lib/queries/guide-check";

// Read at request time (cached for five minutes by the header below), never prerendered at build.
export const dynamic = "force-dynamic";

export async function GET() {
  const check = await getGuideCheck();
  if (!check) return NextResponse.json({ error: { code: "NOT_FOUND", message: "The guide has not run its self-check yet.", details: null } }, { status: 404 });
  return NextResponse.json(check, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
