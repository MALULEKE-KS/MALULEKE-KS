-- F1.6b (#69, #70): repo ownership and the owner's permission (BR-1.11),
-- GitHub metadata and weekly activity, status history, auto-drafted journey
-- milestones, skill evidence, the owner profile, achievements and job runs.
-- Additive only (EXT-1). Generated DDL first, hand-written rules after.

-- CreateEnum
CREATE TYPE "OwnerPermission" AS ENUM ('NOT_REQUIRED', 'NOT_REQUESTED', 'REQUESTED', 'GRANTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "MilestoneType" ADD COLUMN     "autoDraftOnShip" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "System" ADD COLUMN     "githubFullName" TEXT,
ADD COLUMN     "githubLanguages" JSONB,
ADD COLUMN     "githubOwnerLogin" TEXT,
ADD COLUMN     "githubPushedAt" TIMESTAMPTZ(3),
ADD COLUMN     "githubStars" INTEGER,
ADD COLUMN     "githubSyncedAt" TIMESTAMPTZ(3),
ADD COLUMN     "githubTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ownerPermission" "OwnerPermission" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "ownerPermissionAt" TIMESTAMPTZ(3),
ADD COLUMN     "ownerPermissionFrom" TEXT,
ADD COLUMN     "ownerPermissionNote" TEXT,
ADD COLUMN     "repoPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repoRelationshipId" TEXT;

-- AlterTable
ALTER TABLE "Timeline" ADD COLUMN     "autoDrafted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentStatus" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "systemId" TEXT;

-- CreateTable
CREATE TABLE "RepoRelationship" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "requiresOwnerPermission" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemStatusChange" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "fromStage" "PipelineStage",
    "toStage" "PipelineStage" NOT NULL,
    "backfilled" BOOLEAN NOT NULL DEFAULT false,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemActivityWeek" (
    "systemId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "commits" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemActivityWeek_pkey" PRIMARY KEY ("systemId","weekStart")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL,
    "initials" TEXT,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "availability" TEXT,
    "buildingSinceYear" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL DEFAULT 1,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "achievedOn" DATE NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "systemId" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "summary" JSONB,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepoRelationship_key_key" ON "RepoRelationship"("key");

-- CreateIndex
CREATE INDEX "SystemStatusChange_systemId_changedAt_idx" ON "SystemStatusChange"("systemId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileLink_kind_key" ON "ProfileLink"("kind");

-- CreateIndex
CREATE INDEX "ProfileLink_profileId_sortOrder_idx" ON "ProfileLink"("profileId", "sortOrder");

-- CreateIndex
CREATE INDEX "Achievement_contentStatus_achievedOn_idx" ON "Achievement"("contentStatus", "achievedOn");

-- CreateIndex
CREATE INDEX "Achievement_systemId_idx" ON "Achievement"("systemId");

-- CreateIndex
CREATE INDEX "JobRun_job_startedAt_idx" ON "JobRun"("job", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "System_githubFullName_key" ON "System"("githubFullName");

-- CreateIndex
CREATE INDEX "Timeline_contentStatus_date_idx" ON "Timeline"("contentStatus", "date");

-- CreateIndex
CREATE INDEX "Timeline_systemId_idx" ON "Timeline"("systemId");

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_repoRelationshipId_fkey" FOREIGN KEY ("repoRelationshipId") REFERENCES "RepoRelationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemStatusChange" ADD CONSTRAINT "SystemStatusChange_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemStatusChange" ADD CONSTRAINT "SystemStatusChange_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemStatusChange" ADD CONSTRAINT "SystemStatusChange_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemActivityWeek" ADD CONSTRAINT "SystemActivityWeek_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- ============================================================
-- F1.6b — hand-written rules (#69, #70)
-- ============================================================
-- Every rule the platform claims about repo ownership, status history,
-- auto-drafted milestones, the profile and scheduled jobs is enforced here,
-- by the database, so no route, script or console session can bypass it.
-- Errors use SQLSTATE 23514 (check_violation) and cite their rule, like F1.2.

-- ------------------------------------------------------------
-- Formats and bounds
-- ------------------------------------------------------------
ALTER TABLE "RepoRelationship" ADD CONSTRAINT "RepoRelationship_key_format"
  CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');

ALTER TABLE "System" ADD CONSTRAINT "System_githubFullName_format"
  CHECK ("githubFullName" ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$');
ALTER TABLE "System" ADD CONSTRAINT "System_githubStars_nonnegative"
  CHECK ("githubStars" >= 0);
ALTER TABLE "System" ADD CONSTRAINT "System_githubLanguages_object"
  CHECK ("githubLanguages" IS NULL OR jsonb_typeof("githubLanguages") = 'object');

-- A granted or declined answer always records who gave it.
ALTER TABLE "System" ADD CONSTRAINT "System_br_1_11_answer_has_source"
  CHECK ("ownerPermission" NOT IN ('GRANTED', 'DECLINED')
         OR char_length(btrim(coalesce("ownerPermissionFrom", ''))) > 0);

ALTER TABLE "SystemActivityWeek" ADD CONSTRAINT "SystemActivityWeek_commits_nonnegative"
  CHECK (commits >= 0);
ALTER TABLE "SystemActivityWeek" ADD CONSTRAINT "SystemActivityWeek_weekStart_monday"
  CHECK (extract(isodow FROM "weekStart") = 1);

-- ------------------------------------------------------------
-- BR-1.11 — a collaborated system is published only with the repo owner's
-- permission. The relationship says whether permission is required (data,
-- EXT-1); this trigger keeps ownerPermission consistent with it, stamps when
-- the answer changed, and refuses to publish without a GRANTED answer.
-- ------------------------------------------------------------
CREATE FUNCTION enforce_br_1_11_owner_permission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  requires boolean;
  explicitly_set boolean;
BEGIN
  SELECT r."requiresOwnerPermission" INTO requires
    FROM "RepoRelationship" r WHERE r.id = NEW."repoRelationshipId";
  requires := coalesce(requires, false);
  explicitly_set := TG_OP = 'INSERT' OR NEW."ownerPermission" IS DISTINCT FROM OLD."ownerPermission";

  IF requires AND NEW."ownerPermission" = 'NOT_REQUIRED' THEN
    -- Permission is needed and nobody has asked yet.
    NEW."ownerPermission" := 'NOT_REQUESTED';
  ELSIF NOT requires AND NEW."ownerPermission" <> 'NOT_REQUIRED' THEN
    IF explicitly_set THEN
      RAISE EXCEPTION 'BR-1.11: this system''s repo relationship does not require the owner''s permission'
        USING ERRCODE = 'check_violation';
    END IF;
    -- The relationship changed (or stopped requiring permission): the old
    -- answer no longer applies. The audit log keeps what it was.
    NEW."ownerPermission" := 'NOT_REQUIRED';
  END IF;

  -- The database owns the timestamp: set when the answer changes, frozen otherwise.
  IF TG_OP = 'INSERT' THEN
    NEW."ownerPermissionAt" := CASE WHEN NEW."ownerPermission" <> 'NOT_REQUIRED' THEN now() END;
  ELSIF NEW."ownerPermission" IS DISTINCT FROM OLD."ownerPermission" THEN
    NEW."ownerPermissionAt" := now();
  ELSE
    NEW."ownerPermissionAt" := OLD."ownerPermissionAt";
  END IF;

  IF NEW."contentStatus" = 'PUBLISHED' AND requires AND NEW."ownerPermission" <> 'GRANTED' THEN
    RAISE EXCEPTION 'BR-1.11: a collaborated system is published only with the repo owner''s permission (currently %)',
      NEW."ownerPermission" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "System_br_1_11_owner_permission"
  BEFORE INSERT OR UPDATE ON "System"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_11_owner_permission();

-- Changing whether a relationship requires permission re-checks every system
-- that uses it, through the trigger above: systems start needing (or stop
-- needing) an answer, and a published system without one blocks the change.
CREATE FUNCTION recheck_br_1_11_on_relationship_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "System" SET "ownerPermission" = "ownerPermission" WHERE "repoRelationshipId" = NEW.id;
  RETURN NULL;
END $$;
CREATE TRIGGER "RepoRelationship_br_1_11_recheck"
  AFTER UPDATE OF "requiresOwnerPermission" ON "RepoRelationship"
  FOR EACH ROW WHEN (OLD."requiresOwnerPermission" IS DISTINCT FROM NEW."requiresOwnerPermission")
  EXECUTE FUNCTION recheck_br_1_11_on_relationship_change();

-- ------------------------------------------------------------
-- Status history (approved feature 1) and auto-drafted journey milestones
-- (approved feature 2)
-- ------------------------------------------------------------
CREATE FUNCTION enforce_history_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (%): % is not allowed', TG_TABLE_NAME, TG_ARGV[0], TG_OP
    USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "SystemStatusChange_append_only"
  BEFORE UPDATE OR DELETE ON "SystemStatusChange"
  FOR EACH ROW EXECUTE FUNCTION enforce_history_append_only('status history');
CREATE TRIGGER "SystemStatusChange_append_only_truncate"
  BEFORE TRUNCATE ON "SystemStatusChange"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_history_append_only('status history');

-- At most one milestone type is the "first ship" type, and at most one
-- auto-drafted journey entry exists per system.
CREATE UNIQUE INDEX "MilestoneType_one_auto_draft_on_ship"
  ON "MilestoneType" ("autoDraftOnShip") WHERE "autoDraftOnShip";
CREATE UNIQUE INDEX "Timeline_one_auto_draft_per_system"
  ON "Timeline" ("systemId") WHERE "autoDrafted";
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_auto_draft_has_system"
  CHECK (NOT "autoDrafted" OR "systemId" IS NOT NULL);

-- Written by the database on every status change, never by application code.
-- The first time an existing system moves into a SHIPPED-stage status, a DRAFT
-- journey entry is drafted for the admin to edit and approve; nothing is
-- published automatically. A system created already shipped is past work with
-- an unknown ship date, so it gets history but no dated milestone.
CREATE FUNCTION record_system_status_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  new_stage "PipelineStage";
  old_stage "PipelineStage";
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."statusId" IS NOT DISTINCT FROM OLD."statusId" THEN
    RETURN NULL;
  END IF;

  SELECT stage INTO new_stage FROM "Status" WHERE id = NEW."statusId";
  IF TG_OP = 'UPDATE' THEN
    SELECT stage INTO old_stage FROM "Status" WHERE id = OLD."statusId";
  END IF;

  INSERT INTO "SystemStatusChange" (id, "systemId", "fromStatusId", "toStatusId", "fromStage", "toStage")
  VALUES (gen_random_uuid()::text, NEW.id,
          CASE WHEN TG_OP = 'UPDATE' THEN OLD."statusId" END,
          NEW."statusId", old_stage, new_stage);

  IF TG_OP = 'UPDATE' AND new_stage = 'SHIPPED' AND old_stage IS DISTINCT FROM 'SHIPPED' THEN
    -- The title is a starting draft for the admin to rewrite, not published copy.
    INSERT INTO "Timeline" (id, "milestoneTypeId", title, description, date, tags,
                            "contentStatus", "systemId", "autoDrafted", "updatedAt")
    SELECT gen_random_uuid()::text, mt.id, 'Shipped ' || NEW.name, NULLIF(btrim(NEW.description), ''),
           now(), ARRAY[]::text[], 'DRAFT', NEW.id, true, now()
      FROM "MilestoneType" mt
     WHERE mt."autoDraftOnShip" AND mt.active
    ON CONFLICT ("systemId") WHERE "autoDrafted" DO NOTHING;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "System_status_history"
  AFTER INSERT OR UPDATE OF "statusId" ON "System"
  FOR EACH ROW EXECUTE FUNCTION record_system_status_change();

-- History begins now: each existing system gets one backfilled row for the
-- status it is in. Backfilled rows are never read as ship or start dates.
INSERT INTO "SystemStatusChange" (id, "systemId", "fromStatusId", "toStatusId", "fromStage", "toStage", backfilled, "changedAt")
SELECT gen_random_uuid()::text, s.id, NULL, s."statusId", NULL, st.stage, true, s."createdAt"
  FROM "System" s JOIN "Status" st ON st.id = s."statusId";

-- Pace per system, from real (non-backfilled) transitions only.
CREATE VIEW "SystemPace" AS
SELECT s.id AS "systemId",
       min(c."changedAt") FILTER (WHERE c."toStage" = 'BUILDING' AND NOT c.backfilled) AS "buildingSince",
       min(c."changedAt") FILTER (WHERE c."toStage" = 'SHIPPED' AND NOT c.backfilled) AS "shippedAt",
       min(c."changedAt") AS "trackedSince"
  FROM "System" s
  LEFT JOIN "SystemStatusChange" c ON c."systemId" = s.id
 GROUP BY s.id;

-- ------------------------------------------------------------
-- Skill evidence (approved feature 4): what proves each skill. Published
-- systems only (BR-1.1); roles from the career record.
-- ------------------------------------------------------------
CREATE VIEW "SkillEvidence" AS
SELECT sk.id AS "skillId",
       sk.name,
       sc.key AS "categoryKey",
       coalesce(sys.slugs, ARRAY[]::text[]) AS "systemSlugs",
       coalesce(cardinality(sys.slugs), 0) AS "systemCount",
       coalesce(roles.n, 0) AS "roleCount",
       roles.first_used AS "firstUsed",
       roles.last_ended AS "lastEnded",
       coalesce(roles.current, false) AS "inCurrentRole"
  FROM "Skill" sk
  JOIN "SkillCategory" sc ON sc.id = sk."categoryId"
  LEFT JOIN LATERAL (
    SELECT array_agg(s.slug ORDER BY s.slug) AS slugs
      FROM "SkillOnSystem" ss JOIN "System" s ON s.id = ss."systemId"
     WHERE ss."skillId" = sk.id AND s."contentStatus" = 'PUBLISHED'
  ) sys ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n,
           min(e."startDate") AS first_used,
           max(e."endDate") AS last_ended,
           bool_or(e."endDate" IS NULL) AS current
      FROM "SkillOnExperience" se JOIN "Experience" e ON e.id = se."experienceId"
     WHERE se."skillId" = sk.id
  ) roles ON true;

-- ------------------------------------------------------------
-- Profile (one row) and achievements
-- ------------------------------------------------------------
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_singleton" CHECK (id = 1);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_email_format"
  CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_required_present"
  CHECK (char_length(btrim("displayName")) > 0 AND char_length(btrim(role)) > 0);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_buildingSinceYear_range"
  CHECK ("buildingSinceYear" BETWEEN 1990 AND 2100);

ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_kind_format"
  CHECK (kind ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_url_format"
  CHECK (url ~ '^(https://|mailto:)');

ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_title_present"
  CHECK (char_length(btrim(title)) > 0);
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_url_format"
  CHECK (url ~ '^https://');

-- ------------------------------------------------------------
-- Scheduled jobs: the database is the lock, and finished runs are history
-- ------------------------------------------------------------
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_job_format"
  CHECK (job ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$');
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_finished_consistent"
  CHECK ((status = 'RUNNING') = ("finishedAt" IS NULL));
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_finish_after_start"
  CHECK ("finishedAt" >= "startedAt");
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_failure_has_error"
  CHECK (status <> 'FAILED' OR char_length(btrim(coalesce(error, ''))) > 0);
CREATE UNIQUE INDEX "JobRun_one_running_per_job" ON "JobRun" (job) WHERE status = 'RUNNING';

CREATE FUNCTION enforce_job_run_finished_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'JobRun %: a finished run is history and cannot change', OLD.id
    USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "JobRun_finished_immutable"
  BEFORE UPDATE ON "JobRun"
  FOR EACH ROW WHEN (OLD.status <> 'RUNNING')
  EXECUTE FUNCTION enforce_job_run_finished_immutable();
