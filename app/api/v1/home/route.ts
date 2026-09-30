// GET /api/v1/home — everything the homepage shows, in one call (#82): the
// live ledger (years building, organizations founded, systems shipped /
// in progress / queued — content facts, BR-5.3), the admin's homepage picks,
// the published-systems count, and the admin-approved numbers.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { countPublishedSystems, getHomepageStats, getPrioritySystems } from "@/lib/queries/homepage";
import { getPublicMetrics } from "@/lib/metrics";

export async function GET(request: Request) {
  const limit = Math.min(12, Math.max(1, Number(new URL(request.url).searchParams.get("featured") ?? 4) || 4));
  const [ledger, featured, totalPublished, metrics] = await Promise.all([
    getHomepageStats(),
    getPrioritySystems(limit),
    countPublishedSystems(),
    getPublicMetrics(),
  ]);
  return NextResponse.json({
    ledger,
    featured,
    totalPublished,
    metrics: metrics.map((m) => ({
      key: m.key,
      label: m.label,
      description: m.description,
      unit: m.unit,
      value: m.value,
      approvedAt: m.approvedAt.toISOString(),
    })),
  });
}
