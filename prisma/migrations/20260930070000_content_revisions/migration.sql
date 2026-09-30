-- #88 / BR-1.15: every version of a system's case study and description is
-- kept, append-only, attributed to whoever wrote it (owner's decision,
-- 2026-09-30: both fields). Written by the database on every change, whatever
-- the path (admin API, a script, a future editor), so none can be skipped. A
-- restore is simply writing an old text back — which becomes a new version.

CREATE TABLE "SystemContentRevision" (
  "id"          text PRIMARY KEY,
  "systemId"    text NOT NULL REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "field"       text NOT NULL,
  "body"        text, -- null = the field was cleared
  "actorType"   "ActorType" NOT NULL,
  "adminUserId" text REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "backfilled"  boolean NOT NULL DEFAULT false, -- the text when history began, not a dated edit
  "createdAt"   timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "SystemContentRevision_field" CHECK ("field" IN ('caseStudyBody', 'description')),
  CONSTRAINT "SystemContentRevision_actor_consistent" CHECK (("actorType" = 'ADMIN') = ("adminUserId" IS NOT NULL))
);
CREATE INDEX "SystemContentRevision_system_field_idx" ON "SystemContentRevision" ("systemId", "field", "createdAt" DESC);
CREATE INDEX "SystemContentRevision_adminUserId_idx" ON "SystemContentRevision" ("adminUserId");

-- Same attribution as the audit trail (F2.1): the transaction-local actor set
-- by withActor()/withAdmin(); anything else is SYSTEM.
CREATE FUNCTION record_system_content_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  admin_id text := nullif(current_setting('app.admin_id', true), '');
  actor "ActorType" := coalesce(nullif(current_setting('app.actor_type', true), '')::"ActorType", 'SYSTEM');
BEGIN
  IF actor <> 'ADMIN' THEN
    admin_id := NULL;
  ELSIF admin_id IS NULL THEN
    actor := 'SYSTEM';
  END IF;

  IF TG_OP = 'INSERT' OR NEW."caseStudyBody" IS DISTINCT FROM OLD."caseStudyBody" THEN
    IF NOT (TG_OP = 'INSERT' AND NEW."caseStudyBody" IS NULL) THEN
      INSERT INTO "SystemContentRevision" ("id", "systemId", "field", "body", "actorType", "adminUserId")
      VALUES (gen_random_uuid()::text, NEW."id", 'caseStudyBody', NEW."caseStudyBody", actor, admin_id);
    END IF;
  END IF;
  IF TG_OP = 'INSERT' OR NEW."description" IS DISTINCT FROM OLD."description" THEN
    INSERT INTO "SystemContentRevision" ("id", "systemId", "field", "body", "actorType", "adminUserId")
    VALUES (gen_random_uuid()::text, NEW."id", 'description', NEW."description", actor, admin_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "System_content_revisions" AFTER INSERT OR UPDATE OF "caseStudyBody", "description" ON "System"
  FOR EACH ROW EXECUTE FUNCTION record_system_content_revision();

-- Append-only: the trigger (anyone) and the runtime role's grants (the app).
CREATE TRIGGER "SystemContentRevision_append_only"
  BEFORE UPDATE OR DELETE ON "SystemContentRevision"
  FOR EACH ROW EXECUTE FUNCTION enforce_history_append_only('content revisions');
CREATE TRIGGER "SystemContentRevision_append_only_truncate"
  BEFORE TRUNCATE ON "SystemContentRevision"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_history_append_only('content revisions');
REVOKE UPDATE, DELETE, TRUNCATE ON "SystemContentRevision" FROM platform_runtime;

-- History begins now: each system's current texts become its first versions.
INSERT INTO "SystemContentRevision" ("id", "systemId", "field", "body", "actorType", "backfilled", "createdAt")
SELECT gen_random_uuid()::text, s."id", 'description', s."description", 'SYSTEM', true, s."updatedAt" FROM "System" s;
INSERT INTO "SystemContentRevision" ("id", "systemId", "field", "body", "actorType", "backfilled", "createdAt")
SELECT gen_random_uuid()::text, s."id", 'caseStudyBody', s."caseStudyBody", 'SYSTEM', true, s."updatedAt"
  FROM "System" s WHERE s."caseStudyBody" IS NOT NULL;
