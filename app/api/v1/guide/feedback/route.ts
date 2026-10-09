// POST /api/v1/guide/feedback — a visitor marks an AI guide answer "helpful" or
// "this was wrong" (docs/AI-GUIDE-PHASE2-PLAN.md §7). Off with the guide; rate-limited
// per visitor; the question and the answer's opening are kept scrubbed, with nothing
// that identifies the visitor, only while concierge.logRetentionDays is above 0.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { FeedbackSchema, recordFeedback } from "@/lib/guide/feedback";

const error = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message, details: null } }, { status });

export async function POST(request: Request) {
  const flags = await getFlags();
  if (flags[FLAGS.concierge] !== true) return error("GUIDE_OFF", "The AI guide is switched off.", 404);

  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("VALIDATION_ERROR", "That feedback couldn't be read.", 400);

  const [perWindow, windowHours] = await Promise.all([getSetting("concierge.feedback.maxPerWindow"), getSetting("concierge.rateLimit.windowHours")]);
  const allowed = await hitRateLimit("guide-feedback", request, perWindow, windowHours * 60 * 60 * 1000);
  if (!allowed.allowed) return error("RATE_LIMITED", "That's a lot of feedback — thank you; try again later.", 429);

  const kept = await recordFeedback(parsed.data);
  return NextResponse.json({ kept }, { status: 202 });
}
