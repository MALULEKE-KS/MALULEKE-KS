// PATCH /api/v1/admin/settings/flags/{key} — one at a time, no bulk-enable (BR-4.4).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
