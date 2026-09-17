// POST /api/v1/cv/generate — reflects live DB state at generation time (BR-7.1);
// prior DocumentGen rows superseded, not deleted (BR-7.2).
// TODO: implement — see openapi-contract.yaml.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Not implemented" } }, { status: 501 });
}
