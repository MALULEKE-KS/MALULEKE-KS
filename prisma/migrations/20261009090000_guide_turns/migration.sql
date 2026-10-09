-- AI guide phase 2, P2-0 (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1): a metrics row per
-- question the guide handles — speed, serving model, tokens, outcome. No IP, no
-- visitor text. `outcome` is a fixed set of control states. Additive.

CREATE TABLE "GuideTurn" (
  "id"              text PRIMARY KEY,
  "createdAt"       timestamptz(3) NOT NULL DEFAULT now(),
  "outcome"         text NOT NULL,
  "configuredModel" text,
  "servedModel"     text,
  "fallbackUsed"    boolean NOT NULL DEFAULT false,
  "firstTokenMs"    integer,
  "totalMs"         integer,
  "inputTokens"     integer,
  "outputTokens"    integer,
  "reasoningTokens" integer,
  "cachedTokens"    integer,
  "steps"           integer NOT NULL DEFAULT 0,
  "tools"           text[] NOT NULL,
  "finishReason"    text,
  "route"           jsonb,
  CONSTRAINT "GuideTurn_outcome_check" CHECK ("outcome" IN ('answered', 'instant', 'busy', 'error', 'aborted', 'limited', 'resting')),
  CONSTRAINT "GuideTurn_timings_check" CHECK (coalesce("firstTokenMs", 0) >= 0 AND coalesce("totalMs", 0) >= 0 AND "steps" >= 0)
);
CREATE INDEX "GuideTurn_createdAt_idx" ON "GuideTurn" ("createdAt");
CREATE INDEX "GuideTurn_outcome_createdAt_idx" ON "GuideTurn" ("outcome", "createdAt");

-- Metrics older than the owner's window have served their purpose. Returns the rows removed.
CREATE FUNCTION prune_guide_logs(p_days integer) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  -- migration-guard: allow only guide metrics older than the retention window (concierge.metricsRetentionDays)
  DELETE FROM "GuideTurn" WHERE "createdAt" < now() - make_interval(days => greatest(7, p_days));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
