// GET /api/v1/systems/{slug} — unpublished/unknown slug returns the same 404 (BR-1.3/1.4).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not implemented" } }, { status: 501 });
}
