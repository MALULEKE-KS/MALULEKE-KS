// PATCH /api/v1/admin/systems/{id} — publishing transitions. Transactional
// clientVisibility/clientApproved re-check at commit time (BR-1.10), 409 CLIENT_APPROVAL_REQUIRED.
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function PATCH() {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not implemented" } }, { status: 501 });
}
