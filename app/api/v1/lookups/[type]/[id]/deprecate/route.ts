// POST /api/v1/lookups/{type}/{id}/deprecate — soft-deprecate only (BR-8.2/8.3).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
