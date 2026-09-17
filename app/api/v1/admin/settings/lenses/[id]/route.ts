// PATCH /api/v1/admin/settings/lenses/{id}
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
