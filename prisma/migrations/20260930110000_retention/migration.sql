-- #96 (F4.3) / BR-5.2: one retention policy for Inquiry and Event. Past the
-- admin's data.retentionMonths, personal data is stripped and the aggregate
-- facts kept (type, status, source, dates; event type and entity). Runs daily
-- as the maintenance.daily job. Anonymisation is one-way: an anonymised row's
-- personal fields can never be written again. Plus pruning: expired rate-limit
-- rows (hashed IPs kept only as long as their window, BR-2.4) and finished
-- sign-in challenges past a grace period (BR-3.5). Additive.

ALTER TABLE "Inquiry" ADD COLUMN "anonymizedAt" timestamptz(3);
ALTER TABLE "Event" ADD COLUMN "anonymizedAt" timestamptz(3);

-- Placeholders satisfy BR-2.3's CHECKs (name present, email shape, message
-- 20–5000 chars). ".invalid" is a reserved TLD: the address can never deliver.
CREATE FUNCTION apply_retention(p_months integer)
RETURNS TABLE ("inquiriesAnonymized" integer, "eventsAnonymized" integer)
LANGUAGE plpgsql AS $$
DECLARE
  cutoff timestamptz;
  n_inquiries integer;
  n_events integer;
BEGIN
  IF p_months IS NULL OR p_months < 1 THEN
    RAISE EXCEPTION 'BR-5.2: retention must be at least one month, got %', p_months USING ERRCODE = 'check_violation';
  END IF;
  cutoff := now() - make_interval(months => p_months);

  UPDATE "Inquiry"
     SET "name" = 'Anonymized',
         "email" = 'anonymized@retention.invalid',
         "message" = 'Removed after the retention period (BR-5.2).',
         "idempotencyKey" = NULL,
         "anonymizedAt" = now()
   WHERE "createdAt" < cutoff AND "anonymizedAt" IS NULL;
  GET DIAGNOSTICS n_inquiries = ROW_COUNT;

  UPDATE "Event"
     SET "sessionId" = 'anonymized', "metadata" = NULL, "anonymizedAt" = now()
   WHERE "createdAt" < cutoff AND "anonymizedAt" IS NULL;
  GET DIAGNOSTICS n_events = ROW_COUNT;

  RETURN QUERY SELECT n_inquiries, n_events;
END $$;

-- One-way: once anonymised, personal fields stay anonymised.
CREATE FUNCTION enforce_br_5_2_anonymized() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."anonymizedAt" IS NOT NULL AND (
       NEW."anonymizedAt" IS DISTINCT FROM OLD."anonymizedAt"
    OR (TG_TABLE_NAME = 'Inquiry' AND (to_jsonb(NEW) - 'status' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updatedAt'))
    OR (TG_TABLE_NAME = 'Event' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD))
  ) THEN
    RAISE EXCEPTION 'BR-5.2: % % was anonymised after the retention period and can''t be changed back', TG_TABLE_NAME, OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Inquiry_br_5_2_anonymized" BEFORE UPDATE ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_5_2_anonymized();
CREATE TRIGGER "Event_br_5_2_anonymized" BEFORE UPDATE ON "Event"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_5_2_anonymized();

-- Rows that have served their purpose. Neither table holds anything worth
-- keeping once its window or challenge is over (auth events are in ActivityLog).
CREATE FUNCTION prune_expired(p_challenge_days integer)
RETURNS TABLE ("rateLimitRows" integer, "loginChallenges" integer)
LANGUAGE plpgsql AS $$
DECLARE
  n_rate integer;
  n_challenges integer;
BEGIN
  -- migration-guard: allow only rate-limit windows that have already ended (BR-2.4 privacy, #96)
  DELETE FROM "RateLimitEntry" WHERE "windowEnd" < now();
  GET DIAGNOSTICS n_rate = ROW_COUNT;

  -- migration-guard: allow only challenges consumed or expired more than p_challenge_days ago (#96)
  DELETE FROM "LoginChallenge"
   WHERE coalesce("consumedAt", "expiresAt") < now() - make_interval(days => greatest(1, p_challenge_days));
  GET DIAGNOSTICS n_challenges = ROW_COUNT;

  RETURN QUERY SELECT n_rate, n_challenges;
END $$;

CREATE INDEX "Inquiry_createdAt_unanonymized_idx" ON "Inquiry" ("createdAt") WHERE "anonymizedAt" IS NULL;
CREATE INDEX "Event_createdAt_unanonymized_idx" ON "Event" ("createdAt") WHERE "anonymizedAt" IS NULL;
