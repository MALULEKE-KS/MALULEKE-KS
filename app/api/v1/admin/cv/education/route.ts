// GET/POST /api/v1/admin/cv/education
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
export async function POST() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
