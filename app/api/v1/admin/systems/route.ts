// GET/POST /api/v1/admin/systems — full list incl. drafts/NDA; create applies
// BR-1.2 default (clientVisibility=REQUIRES_APPROVAL for isClient orgs).
// TODO: implement — see openapi-contract.yaml. security: adminSession (BR-3.1).
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
export async function POST() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
