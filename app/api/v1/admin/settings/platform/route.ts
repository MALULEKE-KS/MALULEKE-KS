// GET /api/v1/admin/settings/platform — every platform tunable with its
// effective value, default and the business rule it serves (#67).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { listSettings } from "@/lib/settings";

export const GET = withAdmin(async () => NextResponse.json(await listSettings()));
