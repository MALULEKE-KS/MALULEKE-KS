// GET /api/v1/homes — the GitHub homes: the owner's own account and ventures,
// each with its role, GitHub accounts and published system count (F5c, D12).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicHomes } from "@/lib/queries/profile";

export async function GET() {
  return NextResponse.json({ data: await getPublicHomes() });
}
