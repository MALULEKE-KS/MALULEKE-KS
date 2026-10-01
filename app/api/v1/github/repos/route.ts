// GET /api/v1/github/repos — the owner's public repos in his own homes, with
// languages, topics, activity and README excerpt (F5c). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicGithubRepos } from "@/lib/queries/github";

export async function GET() {
  return NextResponse.json({ data: await getPublicGithubRepos() });
}
