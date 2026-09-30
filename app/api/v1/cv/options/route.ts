// GET /api/v1/cv/options — the CV options a visitor can choose (#92): the CV
// generated from live data and the owner's uploaded CV, each only while the
// admin shows it, in the admin's order (BR-7.1, BR-7.5). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicCvOptions } from "@/lib/cv/options";

export async function GET() {
  return NextResponse.json({ options: await getPublicCvOptions() });
}
