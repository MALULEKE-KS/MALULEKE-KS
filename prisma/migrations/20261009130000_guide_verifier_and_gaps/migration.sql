-- AI guide phase 2, P2-3 (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2-B3).
--   - GuideTurn records what the answer verifier found: how many claims it checked
--     and how many it could not find in the site's data (counts and kinds only).
--   - GuideGap keeps the questions the guide could not answer from the site's data
--     (or answered with something the data does not contain), so the owner can see
--     what visitors want that the site does not say. The question is stored with
--     contact details stripped (lib/guide/gaps.ts), only while
--     concierge.logRetentionDays is above 0, and pruned by the daily job. There is
--     no IP, cookie or identifier in the row.
-- Additive only.

ALTER TABLE "GuideTurn" ADD COLUMN "verifierChecked" integer;
ALTER TABLE "GuideTurn" ADD COLUMN "verifierFlagged" integer;
ALTER TABLE "GuideTurn" ADD COLUMN "flaggedKinds" text[] NOT NULL DEFAULT ARRAY[]::text[];
-- migration-guard: allow dropping a column default only to match Prisma's list columns (no data is lost)
ALTER TABLE "GuideTurn" ALTER COLUMN "flaggedKinds" DROP DEFAULT;
ALTER TABLE "GuideTurn" ADD CONSTRAINT "GuideTurn_verifier_check" CHECK (coalesce("verifierChecked", 0) >= 0 AND coalesce("verifierFlagged", 0) >= 0);

CREATE TABLE "GuideGap" (
  "id"        text PRIMARY KEY,
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
  "reason"    text NOT NULL,
  "question"  text NOT NULL,
  "page"      text,
  CONSTRAINT "GuideGap_reason_check" CHECK ("reason" IN ('unanswered', 'unverified')),
  CONSTRAINT "GuideGap_question_check" CHECK (char_length("question") BETWEEN 1 AND 320)
);
CREATE INDEX "GuideGap_createdAt_idx" ON "GuideGap" ("createdAt");

-- Questions older than the owner's window have served their purpose. 0 days removes them all.
CREATE FUNCTION prune_guide_gaps(p_days integer) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  -- migration-guard: allow only guide question logs older than the retention window (concierge.logRetentionDays)
  DELETE FROM "GuideGap" WHERE "createdAt" < now() - make_interval(days => greatest(0, p_days));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- The AI guide's composer says, in the owner's words, what is kept (the "ai-guide" block's privacyNote).
UPDATE "SiteContent"
   SET "body" = "body" || jsonb_build_object('privacyNote', 'Questions it can''t answer are kept for {retentionDays} days to improve this site — with contact details removed.')
 WHERE "key" = 'ai-guide' AND NOT ("body" ? 'privacyNote');
