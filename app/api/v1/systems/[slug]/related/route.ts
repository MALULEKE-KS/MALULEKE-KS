// GET /api/v1/systems/{slug}/related — other published systems in the same
// domain (#82), for "more like this" on a case study. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getRelatedSystems } from "@/lib/queries/systems";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limit = Math.min(12, Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 3) || 3));
  return NextResponse.json(await getRelatedSystems(slug, limit));
}
