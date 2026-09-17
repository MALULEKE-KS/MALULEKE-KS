// GET /api/v1/admin/settings/flags
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
