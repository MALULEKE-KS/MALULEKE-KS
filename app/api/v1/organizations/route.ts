// GET /api/v1/organizations — public list of organizations that have at
// least one published System, for the /systems catalog filter bar. Never
// surfaces an organization with zero published systems — this is a
// filter-options list, not a general org directory.

import { NextResponse } from "next/server";
import { getFilterOrganizations } from "@/lib/queries/systems";

export async function GET() {
  return NextResponse.json(await getFilterOrganizations());
}
