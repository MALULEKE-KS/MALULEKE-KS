// POST /api/v1/guide/warm — get the AI guide ready before the first question
// (docs/AI-GUIDE-PHASE2-PLAN.md §3 A5). The page calls it once, when a visitor
// puts their cursor in the chat: it reads what the guide knows into the server's
// short-lived memory and checks the gateway's model list, so the first answer
// doesn't also pay for a cold start. It does no model work, spends no limit and
// returns nothing; with the guide off it does nothing at all. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { getGuideCorpus } from "@/lib/guide/corpus";
import { liveGatewayModels } from "@/lib/guide/gateway-models";

export const maxDuration = 30;

export async function POST() {
  const flags = await getFlags();
  if (flags[FLAGS.concierge] === true) {
    const [budget, cacheSeconds] = await Promise.all([getSetting("concierge.contextBudgetTokens"), getSetting("concierge.corpusCacheSeconds")]);
    await Promise.allSettled([getGuideCorpus(budget, cacheSeconds), liveGatewayModels()]);
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
