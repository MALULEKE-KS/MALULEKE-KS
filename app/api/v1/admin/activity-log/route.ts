// GET /api/v1/admin/activity-log — read-only, most recent first (BR-3.4).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
