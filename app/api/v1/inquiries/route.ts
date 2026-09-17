// POST /api/v1/inquiries — the single visitor write path (BR-2.1–BR-2.7).
// Honeypot short-circuits to a look-alike 201 (BR-2.7); idempotencyKey dedupes (BR-2.6).
// TODO: implement — see openapi-contract.yaml, docs/BUSINESS-RULES-v1.md §2.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
