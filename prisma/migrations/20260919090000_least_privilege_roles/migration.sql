-- F1.8 (#76): least privilege. Until now the application connected as the
-- database owner — the one role that can ALTER or DROP tables and switch
-- triggers off, i.e. undo every rule this database enforces. From here:
--
--   owner             migrations only (DATABASE_URL_UNPOOLED, during the build)
--   platform_runtime  the application: reads and writes rows; cannot change
--                     the schema, disable or drop a trigger, truncate, or
--                     rewrite history
--   platform_public   public pages: SELECT on the public views (F1.7) and on
--                     public lookups only; no raw table, no write
--
-- Both are NOLOGIN group roles, safe to keep in git. The login roles that
-- belong to them are created with generated passwords by
-- scripts/create-db-roles.ts, run by the owner — never committed.
-- Idempotent: roles are cluster-wide, so a second database in the same
-- cluster (dev + test) reuses them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_runtime') THEN
    CREATE ROLE platform_runtime NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_public') THEN
    CREATE ROLE platform_public NOLOGIN;
  END IF;
END $$;

-- The migrating role may assume both — used by the tests that prove each
-- boundary (SET ROLE inside a transaction). It gains nothing it didn't have.
GRANT platform_runtime TO CURRENT_USER;
GRANT platform_public TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO platform_runtime, platform_public;

-- ------------------------------------------------------------
-- Runtime: rows, not structure
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO platform_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO platform_runtime;
-- Tables created by later migrations get the same, automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO platform_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO platform_runtime;

-- History can't be rewritten and retired rows can't be erased: the triggers
-- already refuse it (BR-1.9, BR-3.4, BR-5.3, BR-7.2); the runtime isn't even
-- granted it — two independent locks.
REVOKE UPDATE, DELETE ON "ActivityLog", "SystemStatusChange" FROM platform_runtime;
REVOKE DELETE ON "System", "DocumentGen", "MetricSnapshot" FROM platform_runtime;

-- The migration ledger is the owner's alone. (It exists in every real
-- database; a shadow database replaying migrations for a drift check has none.)
DO $$
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM platform_runtime;
  END IF;
END $$;

-- Views are read-only for everyone who isn't their owner.
REVOKE INSERT, UPDATE, DELETE ON
  "PublicSystem", "PublicImpact", "PublicTestimonial", "PublicTimeline", "PublicEducation",
  "PublicExperience", "PublicAchievement", "PublicOrganization", "PublicLedger", "PublicProfile",
  "PublicProfileLink", "PublicMetric", "SkillEvidence", "SystemPace"
FROM platform_runtime;

-- ------------------------------------------------------------
-- Public: the masked views and public lookups, read-only
-- ------------------------------------------------------------
-- The views apply every visibility and masking rule (F1.7) and run with their
-- owner's rights, so this role needs no access to any table behind them.
GRANT SELECT ON
  "PublicSystem", "PublicImpact", "PublicTestimonial", "PublicTimeline", "PublicEducation",
  "PublicExperience", "PublicAchievement", "PublicOrganization", "PublicLedger", "PublicProfile",
  "PublicProfileLink", "PublicMetric", "SkillEvidence"
TO platform_public;

-- Lookup values and skills are public by nature (catalog filters, /cv).
GRANT SELECT ON "Status", "Domain", "InquiryType", "MilestoneType", "SkillCategory", "RepoRelationship", "Skill"
TO platform_public;
-- search_public() and pg_trgm's functions are executable by default; the
-- search reads only the views above.
