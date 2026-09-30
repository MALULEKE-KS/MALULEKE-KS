// GET /api/v1/admin/overview — the admin dashboard (#82): overdue inquiries
// (BR-2.2), systems needing curation, repo-owner permissions outstanding
// (BR-1.11), journey drafts and metric proposals awaiting a decision, CV
// completeness, the pipeline, last job runs and recent audit activity.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getAdminOverview } from "@/lib/queries/admin-overview";
import { withAdmin } from "@/lib/auth/with-admin";

export const GET = withAdmin(async (request, { adminUserId }) =>
  NextResponse.json(await getAdminOverview(new URL(request.url).origin, adminUserId)),
);
