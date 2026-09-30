// GET /api/v1/systems/{slug}/related — other published systems in the same
// domain (#82), for "more like this" on a case study. An old slug redirects
// permanently to the current one (#87, BR-1.14); an unknown or hidden one is
// the same generic 404 as the system itself. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getRelatedSystems, isPublicSystemSlug, publicSlugRedirect } from "@/lib/queries/systems";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);

  if (!(await isPublicSystemSlug(slug))) {
    const current = await publicSlugRedirect(slug);
    if (current) return NextResponse.redirect(new URL(`/api/v1/systems/${current}/related${url.search}`, url), 308);
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "System not found", details: null } }, { status: 404 });
  }

  const limit = Math.min(12, Math.max(1, Number(url.searchParams.get("limit") ?? 3) || 3));
  return NextResponse.json(await getRelatedSystems(slug, limit));
}
