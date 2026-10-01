// GET /api/v1/github/commits?limit= — recent commits (last 90 days) in the
// owner's public repos, newest first (F5c). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicRepoCommits } from "@/lib/queries/github";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return NextResponse.json({ data: await getPublicRepoCommits(Number.isFinite(limit) ? Math.trunc(limit) : 100) });
}
