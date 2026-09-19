-- F1.3 + F1.4 + F1.5 (#62, #63, #64).
--
-- F1.4: every timestamp becomes timestamptz(3). Each conversion states
--   AT TIME ZONE 'UTC' explicitly (Prisma always wrote UTC); without it the
--   old values would be read in the session's time zone and shifted on any
--   non-UTC server. Same instants, now unambiguous. createdAt/updatedAt added
--   to every mutable table (existing rows get the migration time).
-- F1.3: ActivityLog becomes an append-only, actor-aware ledger (bottom).
-- F1.5: rate_limit_hit() — atomic, race-free rate limiting (bottom).

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('ADMIN', 'ANONYMOUS', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_adminUserId_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "actorType" "ActorType" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "subjectHash" TEXT,
ADD COLUMN     "userAgentHash" TEXT,
ALTER COLUMN "adminUserId" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "lockedUntil" SET DATA TYPE TIMESTAMPTZ(3) USING "lockedUntil" AT TIME ZONE 'UTC',
ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMPTZ(3) USING "lastLoginAt" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "ContentChunk" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "DocumentGen" ALTER COLUMN "generatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "generatedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ(3) USING "startDate" AT TIME ZONE 'UTC',
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ(3) USING "endDate" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ(3) USING "startDate" AT TIME ZONE 'UTC',
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ(3) USING "endDate" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Flag" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Impact" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "InquiryType" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "LoginChallenge" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "consumedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "consumedAt" AT TIME ZONE 'UTC',
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "MilestoneType" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "RateLimitEntry" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "windowEnd" SET DATA TYPE TIMESTAMPTZ(3) USING "windowEnd" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SkillCategory" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "System" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "Timeline" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

-- AlterTable
ALTER TABLE "VisitorLens" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- F1.3 — ActivityLog is append-only (BR-3.4)
-- ============================================================

-- The audit trail can be added to, never edited or erased — not by the app,
-- not by a script, not by a console session using the app's credentials.
CREATE FUNCTION enforce_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (BR-3.4): % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "ActivityLog_append_only"
  BEFORE UPDATE OR DELETE ON "ActivityLog"
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();
CREATE TRIGGER "ActivityLog_append_only_truncate"
  BEFORE TRUNCATE ON "ActivityLog"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_append_only();

-- An ADMIN entry names its admin; ANONYMOUS and SYSTEM entries never do.
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actor_consistent"
  CHECK (("actorType" = 'ADMIN') = ("adminUserId" IS NOT NULL));

-- ============================================================
-- F1.5 — rate_limit_hit(): atomic rate limiting (BR-2.4, BR-3.2, BR-3.6)
-- ============================================================

-- One call decides and records a hit. A per-key transaction-scoped advisory
-- lock serialises concurrent requests for the same key, so N simultaneous
-- requests can never all see "under the limit" (the old read-then-write
-- race). Semantics are unchanged: the window starts at the first hit and
-- lasts p_window_seconds; a blocked hit isn't counted. Keys are keyed hashes,
-- never raw IPs (lib/security/keyed-hash.ts).
CREATE FUNCTION rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
RETURNS TABLE (allowed boolean, hits integer, retry_after_seconds integer)
LANGUAGE plpgsql AS $$
DECLARE
  v_id text;
  v_count integer;
  v_end timestamptz;
BEGIN
  IF p_max < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'rate_limit_hit: max and window must be positive' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));

  SELECT r.id, r.count, r."windowEnd" INTO v_id, v_count, v_end
    FROM "RateLimitEntry" r
   WHERE r."bucketKey" = p_key AND r."windowEnd" > now()
   ORDER BY r."windowEnd" DESC
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO "RateLimitEntry" (id, "bucketKey", "windowEnd", count, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, p_key, now() + make_interval(secs => p_window_seconds), 1, now(), now());
    RETURN QUERY SELECT true, 1, 0;
  ELSIF v_count >= p_max THEN
    RETURN QUERY SELECT false, v_count, GREATEST(1, ceil(extract(epoch FROM v_end - now()))::integer);
  ELSE
    UPDATE "RateLimitEntry" SET count = count + 1, "updatedAt" = now() WHERE id = v_id;
    RETURN QUERY SELECT true, v_count + 1, 0;
  END IF;
END $$;
