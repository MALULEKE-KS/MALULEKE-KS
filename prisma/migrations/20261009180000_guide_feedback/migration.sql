-- AI guide phase 2, P2-7 (docs/AI-GUIDE-PHASE2-PLAN.md §7): "this was wrong" and
-- "helpful". A visitor can tell the owner an answer was wrong (or good); the
-- question and the answer's opening are kept so the owner can see what happened and
-- turn it into a test. The same privacy rules as the unanswered-question log: contact
-- details stripped first (lib/guide/gaps.ts), no IP, cookie or identifier in the row,
-- kept only while concierge.logRetentionDays is above 0, pruned by the daily job.
-- The labels the buttons carry are the owner's wording in the "ai-guide" block.
-- Additive only.

CREATE TABLE "GuideFeedback" (
  "id"        text PRIMARY KEY,
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
  "rating"    text NOT NULL,
  "question"  text NOT NULL,
  "answer"    text NOT NULL,
  "page"      text,
  CONSTRAINT "GuideFeedback_rating_check" CHECK ("rating" IN ('helpful', 'wrong')),
  CONSTRAINT "GuideFeedback_question_check" CHECK (char_length("question") BETWEEN 1 AND 2100),
  CONSTRAINT "GuideFeedback_answer_check" CHECK (char_length("answer") BETWEEN 1 AND 2100)
);
CREATE INDEX "GuideFeedback_createdAt_idx" ON "GuideFeedback" ("createdAt");

CREATE FUNCTION prune_guide_feedback(p_days integer) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  -- migration-guard: allow only guide feedback older than the retention window (concierge.logRetentionDays)
  DELETE FROM "GuideFeedback" WHERE "createdAt" < now() - make_interval(days => greatest(0, p_days));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

UPDATE "SiteContent"
   SET "body" = "body" || jsonb_build_object(
         'feedbackHelpful', 'Helpful',
         'feedbackWrong', 'This was wrong',
         'feedbackThanks', 'Thanks — noted.',
         'challengeLabel', 'Challenge this',
         'challengePrompt', 'Challenge your last answer: which parts of it does this site''s data not prove, and what would count as proof?'
       )
 WHERE "key" = 'ai-guide' AND NOT ("body" ? 'feedbackHelpful');
