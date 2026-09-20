// GET /api/v1/metrics — the admin-approved numbers only (BR-5.3, #82).
// A proposed value is never public until the admin approves it.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPublicMetrics } from "@/lib/metrics";

export async function GET() {
  const metrics = await getPublicMetrics();
  return NextResponse.json(
    metrics.map((m) => ({
      key: m.key,
      label: m.label,
      description: m.description,
      unit: m.unit,
      value: m.value,
      approvedAt: m.approvedAt.toISOString(),
    })),
  );
}
