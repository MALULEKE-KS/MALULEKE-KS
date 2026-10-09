// POST /api/v1/guide — the AI guide (PUBLIC-REDESIGN-PLAN §3a, Constitution §6).
// Streams an answer grounded in the site's public data. The pipeline —
// flag, whitelist, limits, grounding, tools, model — is lib/guide/handler.ts.
// See openapi-contract.yaml.

import { handleGuideRequest } from "@/lib/guide/handler";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handleGuideRequest(request, "visitor");
}
