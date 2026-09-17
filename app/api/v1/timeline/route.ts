// GET /api/v1/timeline — public timeline entries, filterable by milestoneType.
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
