-- AI guide phase 2, P2-7 (docs/AI-GUIDE-PHASE2-PLAN.md §7): public proof of reliability.
-- The guide's nightly self-check (GuideEvalRun, written by the canary job) is the
-- one claim about its own reliability that is measured, so it is the one shown:
-- the latest run in which the guide answered anything — when it ran, how many
-- fixed checks, how many passed, failed or could not be answered, and which check
-- (by id and category) did what. Never an answer, never a visitor's words. A view
-- for the public role only, like every other public read (F1.8).
--   - the owner's wording for it is in the "ai-guide" block (checkNote /
--     checkNoteFailed, with {passed} {total} {failed} {date}).
-- Additive only.

CREATE VIEW "PublicGuideCheck" AS
 SELECT r."createdAt" AS "ranAt",
        r."total",
        r."passed",
        r."failed",
        (SELECT count(*)::int FROM jsonb_array_elements(r."results") e WHERE e->'pass' = 'null'::jsonb) AS "unavailable",
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id', e->>'id', 'category', e->>'category', 'pass', e->'pass')), '[]'::jsonb)
           FROM jsonb_array_elements(r."results") e) AS "checks"
   FROM "GuideEvalRun" r
  WHERE r."kind" = 'canary' AND r."total" > 0
  ORDER BY r."createdAt" DESC
  LIMIT 1;

REVOKE INSERT, UPDATE, DELETE ON "PublicGuideCheck" FROM platform_runtime;
GRANT SELECT ON "PublicGuideCheck" TO platform_public;

UPDATE "SiteContent"
   SET "body" = "body" || jsonb_build_object(
         'checkNote', 'Self-check {date}: all {total} fixed questions answered as they should.',
         'checkNoteFailed', 'Self-check {date}: {failed} of {total} fixed questions were answered wrongly — being looked at.'
       )
 WHERE "key" = 'ai-guide' AND NOT ("body" ? 'checkNote');
