// lib/guide/feedback.ts
// "Helpful" and "this was wrong" (docs/AI-GUIDE-PHASE2-PLAN.md §7). What a visitor
// may send, and what is kept: the rating, the question and the opening of the answer
// — contact details removed first, and only while the owner keeps a question log at
// all. Nothing identifies the visitor. The client supplies the text (it's the visitor's
// own conversation); the owner reads it as exactly that — a visitor's report.

import { z } from "zod";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { scrubQuestion } from "@/lib/guide/gaps";

export const FeedbackSchema = z
  .object({
    rating: z.enum(["helpful", "wrong"]),
    question: z.string().trim().min(1).max(2000),
    answer: z.string().trim().min(1).max(12000),
    page: z
      .string()
      .max(200)
      .regex(/^\/(?!\/)[a-z0-9\-/]*$/)
      .nullish()
      .catch(null),
  })
  .strip();

export type Feedback = z.infer<typeof FeedbackSchema>;

/** Keep a visitor's rating — scrubbed, and only if the owner keeps a log. Returns whether anything was kept. */
export async function recordFeedback(input: Feedback): Promise<boolean> {
  const [days, maxQuestion, maxAnswer] = await Promise.all([
    getSetting("concierge.logRetentionDays"),
    getSetting("concierge.logMaxCharacters"),
    getSetting("concierge.feedback.maxAnswerCharacters"),
  ]);
  if (days <= 0) return false;
  const question = scrubQuestion(input.question, maxQuestion);
  const answer = scrubQuestion(input.answer, maxAnswer);
  if (question.length < 1 || answer.length < 1) return false;
  await db.guideFeedback.create({ data: { rating: input.rating, question, answer, page: input.page ?? null } });
  return true;
}
