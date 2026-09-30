// GET /api/v1/achievements — published certifications and awards (#82).
// Drafts never appear; one tied to a system shows only while it's published.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicAchievements } from "@/lib/queries/profile";

export async function GET() {
  return NextResponse.json(await getPublicAchievements());
}
