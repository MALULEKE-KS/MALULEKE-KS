// GET /api/v1/lenses — the visitor lenses, in the owner's order: key and label
// only (Constitution §4, F5c). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicLenses } from "@/lib/queries/lenses";

export async function GET() {
  return NextResponse.json({ data: await getPublicLenses() });
}
