// lib/guide/gaps.ts
// The guide's question log (docs/AI-GUIDE-PHASE2-PLAN.md §4 B3). When the guide
// can't answer from the site's data — or answers with something the data doesn't
// contain — the question is kept for the owner, so a gap in the site becomes a
// to-do ("fourteen people asked about his certifications") instead of a silent
// "I don't know". It is the one place the guide keeps anything a visitor wrote, so:
//
//   - only those questions are kept, never the whole conversation;
//   - emails, phone numbers, links, handles and long numbers are removed first;
//   - nothing identifies the visitor — no IP, cookie or session;
//   - only while concierge.logRetentionDays is above 0 (0 = never keep text);
//   - pruned by the daily job after that many days;
//   - and the chat says so, in the owner's words, beside the box (the "ai-guide"
//     block's privacyNote).

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/** A question with contact details, links and long numbers removed, shortened to what's worth reading. */
export function scrubQuestion(raw: string, maxLength: number): string {
  const text = raw
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]")
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[link]")
    .replace(/(?<![\w@])@[\w.]{2,}/g, "[handle]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[number]")
    .replace(/\d{5,}/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

// The guide saying it can't answer from the site's data…
const DEFLECTION = [
  /\b(?:isn'?t|is not|aren'?t|are not|wasn'?t|not)\s+(?:on|in|part of|among|listed|published|available|something)\b[^.!?\n]{0,40}\b(?:site|data|knowledge|profile|published|listed)/i,
  /\b(?:don'?t|do not|doesn'?t|does not)\s+(?:have|know|see|find|list|say|mention|show|publish)\s+(?:that|any|anything|a |an |the |this|those|his|details?|information)/i,
  /\b(?:isn'?t|is not|aren'?t|are not|wasn'?t|not)\s+(?:listed|published|mentioned|stated)\b/i,
  /\bno\s+(?:record|information|mention|details?|sign|trace)\s+(?:of|about|on|in|for)\b/i,
  /\b(?:nothing|none)\s+(?:on|in|about|listed)\b[^.!?\n]{0,30}\b(?:site|data|profile)/i,
];
// …and sending the visitor to him instead.
const POINTS_TO_HIM = /\/contact|contact form|ask him|reach out|write to him/i;

/** Did the guide admit it couldn't answer from the site's data? */
export function looksUnanswered(answer: string): boolean {
  return POINTS_TO_HIM.test(answer) && DEFLECTION.some((re) => re.test(answer));
}

export type GapReason = "unanswered" | "unverified";

/** Keep a question for the owner — if the owner allows it, scrubbed. Never throws. */
export async function recordGap(input: { question: string; reason: GapReason; page: string | null }): Promise<void> {
  try {
    const [days, maxLength] = await Promise.all([getSetting("concierge.logRetentionDays"), getSetting("concierge.logMaxCharacters")]);
    if (days <= 0) return;
    const question = scrubQuestion(input.question, maxLength);
    if (question.length < 3) return;
    await db.guideGap.create({ data: { question, reason: input.reason, page: input.page } });
  } catch {
    // The log is never allowed to hurt an answer.
  }
}
