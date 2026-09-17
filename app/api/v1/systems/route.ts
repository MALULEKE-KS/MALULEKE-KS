// GET /api/v1/systems — published-only, filterable, paginated (BR-1.1).
// TODO: implement — see openapi-contract.yaml, docs/BUSINESS-RULES-v1.md §1.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
