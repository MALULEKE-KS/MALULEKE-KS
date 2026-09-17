// GET /api/v1/systems/{slug} — unpublished/unknown slug returns the same
// generic 404 (BR-1.3/1.4 spirit — never a distinguishable "this one's
// private" response, which would itself leak that a hidden system exists).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicSystemBySlug } from "@/lib/queries/systems";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = await getPublicSystemBySlug(slug);

  if (!system) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "System not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json(system);
}
