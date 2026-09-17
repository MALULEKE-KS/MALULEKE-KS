// POST /api/v1/admin/auth/login — step 1. Never issues a session alone;
// returns a challengeToken (5-min TTL — BR-3.5). BR-3.2 lockout on 5 failures.
// TODO: implement — see openapi-contract.yaml, docs/DESIGN-SYSTEM.md §5.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
