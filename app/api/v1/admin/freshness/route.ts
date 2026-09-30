// GET /api/v1/admin/freshness — live content nobody has edited or marked
// reviewed for content.freshnessDays, oldest first (#89, BR-1.16).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { getStaleContent } from "@/lib/queries/freshness";

export const GET = withAdmin(async () => NextResponse.json(await getStaleContent()));
