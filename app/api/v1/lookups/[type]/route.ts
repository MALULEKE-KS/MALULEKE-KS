// GET/POST /api/v1/lookups/{type} — one contract for every EXT-1 lookup table (BR-8.1).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
export async function POST() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
