// PATCH/DELETE /api/v1/admin/cv/experience/{id}
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
export async function DELETE() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
