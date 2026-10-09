-- AI guide phase 2, P2-1 (docs/AI-GUIDE-PHASE2-PLAN.md §4 B4): the daily canary.
-- GuideTurn gains `source` so the canary's own questions stay out of the
-- visitors' numbers; GuideEvalRun records each canary run (fixed question ids
-- and pass/fail — never visitor text). Additive.

ALTER TABLE "GuideTurn" ADD COLUMN "source" text NOT NULL DEFAULT 'visitor';
ALTER TABLE "GuideTurn" ADD CONSTRAINT "GuideTurn_source_check" CHECK ("source" IN ('visitor', 'canary'));

CREATE TABLE "GuideEvalRun" (
  "id"         text PRIMARY KEY,
  "createdAt"  timestamptz(3) NOT NULL DEFAULT now(),
  "kind"       text NOT NULL,
  "model"      text,
  "total"      integer NOT NULL,
  "passed"     integer NOT NULL,
  "failed"     integer NOT NULL,
  "durationMs" integer NOT NULL,
  "results"    jsonb NOT NULL,
  "trigger"    text NOT NULL,
  CONSTRAINT "GuideEvalRun_kind_check" CHECK ("kind" IN ('canary')),
  CONSTRAINT "GuideEvalRun_counts_check" CHECK ("total" >= 0 AND "passed" >= 0 AND "failed" >= 0 AND "passed" + "failed" = "total" AND "durationMs" >= 0)
);
CREATE INDEX "GuideEvalRun_createdAt_idx" ON "GuideEvalRun" ("createdAt");
