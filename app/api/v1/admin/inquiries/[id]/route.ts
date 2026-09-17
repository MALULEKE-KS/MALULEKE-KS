// PATCH /api/v1/admin/inquiries/{id} — sequential transitions only (BR-2.1):
// new->reviewed mandatory; reviewed->responded|closed; anything else 409 INVALID_STATUS_TRANSITION.
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
