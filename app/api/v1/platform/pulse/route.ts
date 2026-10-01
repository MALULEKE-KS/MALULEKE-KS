// GET /api/v1/platform/pulse — the platform reporting on itself: business
// rules the database enforces, audit events, the last successful job and
// GitHub sync, the running build (F5c §3.2). Aggregates only.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getPlatformPulse } from "@/lib/queries/profile";

export async function GET() {
  return NextResponse.json(await getPlatformPulse());
}
