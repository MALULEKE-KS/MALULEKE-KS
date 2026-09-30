// GET /api/v1/systems/{slug} — unpublished/unknown slug returns the same
// generic 404 (BR-1.3/1.4 spirit — never a distinguishable "this one's
// private" response, which would itself leak that a hidden system exists).
// A slug the system used before its rename answers with a permanent redirect
// to the current one (#87, BR-1.14) — only for a system the visitor can see.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicSystemBySlug, publicSlugRedirect } from "@/lib/queries/systems";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = await getPublicSystemBySlug(slug);

  if (!system) {
    const current = await publicSlugRedirect(slug);
    if (current) return NextResponse.redirect(new URL(`/api/v1/systems/${current}`, request.url), 308);
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "System not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json(system);
}
