// GET /api/v1/profile — the owner's public profile and links (#82): name,
// headline, role, contact, summary, bio, availability, building-since year.
// Admin-edited data (/admin/profile), never constants. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/queries/profile";

export async function GET() {
  const profile = await getPublicProfile();
  if (!profile) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Profile not set up", details: null } }, { status: 404 });
  }
  return NextResponse.json(profile);
}
