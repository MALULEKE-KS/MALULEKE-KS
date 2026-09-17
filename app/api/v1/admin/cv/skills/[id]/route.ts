// PATCH/DELETE /api/v1/admin/cv/skills/{id} — DELETE blocked 409 if still
// referenced by any System/Experience (onDelete Restrict, mirrors BR-8.2).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
export async function DELETE() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
