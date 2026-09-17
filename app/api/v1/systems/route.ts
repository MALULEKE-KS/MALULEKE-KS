// GET /api/v1/systems — published-only, filterable, paginated (BR-1.1).
// See openapi-contract.yaml, docs/BUSINESS-RULES-v1.md §1.

import { NextRequest, NextResponse } from "next/server";
import { getPublicSystems } from "@/lib/queries/systems";
import { PaginationQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const { page, pageSize } = PaginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  const flagshipParam = searchParams.get("flagship");

  const result = await getPublicSystems({
    organizationSlug: searchParams.get("organization"),
    domainKey: searchParams.get("domain"),
    statusKey: searchParams.get("status"),
    flagship: flagshipParam !== null ? flagshipParam === "true" : null,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}
