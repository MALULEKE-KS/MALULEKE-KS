// GET /api/v1/systems — published-only, filterable, paginated (BR-1.1).
// See openapi-contract.yaml, docs/BUSINESS-RULES-v1.md §1.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PUBLISHED_WHERE, systemWithPublicRelations, toPublicSystem } from "@/lib/rules/publishing";
import { PaginationQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const { page, pageSize } = PaginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  const organizationSlug = searchParams.get("organization");
  const domainKey = searchParams.get("domain");
  const statusKey = searchParams.get("status");
  const flagshipParam = searchParams.get("flagship");

  // PUBLISHED_WHERE is always applied first and is never overridable by a
  // query param — that's the actual BR-1.1 enforcement point for this route.
  const where = {
    ...PUBLISHED_WHERE,
    ...(organizationSlug && { organization: { slug: organizationSlug } }),
    ...(domainKey && { domain: { key: domainKey } }),
    ...(statusKey && { status: { key: statusKey } }),
    ...(flagshipParam !== null && { isFlagship: flagshipParam === "true" }),
  };

  const [systems, total] = await Promise.all([
    db.system.findMany({
      where,
      ...systemWithPublicRelations,
      orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.system.count({ where }),
  ]);

  return NextResponse.json({
    data: systems.map(toPublicSystem),
    meta: { page, pageSize, total },
  });
}
