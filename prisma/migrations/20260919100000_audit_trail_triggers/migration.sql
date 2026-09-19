-- F2.1 (#80): the audit trail is written by the database. Every insert,
-- update and delete on a content, configuration or admin table records an
-- ActivityLog entry from a trigger — no route can forget it, and since F1.8
-- the application role can't disable a trigger. (CLAUDE.md: "every admin
-- mutation writes to ActivityLog at the middleware layer, not opt-in".)
--
-- Who acted is set per transaction by the application (lib/audit.ts):
--   app.admin_id        → ADMIN, attributed to that admin
--   app.actor_type      → ANONYMOUS for public writes (an inquiry)
--   (neither)           → SYSTEM: scripts, jobs, consoles
--   app.ip_hash / app.user_agent_hash → the request's keyed hashes (F1.5)
-- set_config(..., true) is transaction-local, so it never leaks between
-- pooled connections.
--
-- Updates record only the columns that changed, and are skipped when only
-- housekeeping columns changed (updatedAt, plus per-table extras such as
-- login counters). Secrets and personal data are never copied into the
-- append-only log: they are recorded as "[redacted]" (BR-5.2 / BR-5.5 —
-- the log outlives retention and deletion requests, so it must not hold PII).

CREATE FUNCTION audit_row_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  -- TG_ARGV[0]: columns to redact; TG_ARGV[1]: columns whose change alone isn't worth an entry.
  redacted text[] := CASE WHEN TG_NARGS > 0 AND TG_ARGV[0] <> '' THEN string_to_array(TG_ARGV[0], ',') ELSE ARRAY[]::text[] END;
  quiet    text[] := ARRAY['updatedAt']
                     || CASE WHEN TG_NARGS > 1 AND TG_ARGV[1] <> '' THEN string_to_array(TG_ARGV[1], ',') ELSE ARRAY[]::text[] END;
  old_row  jsonb;
  new_row  jsonb;
  changed  text[];
  before_v jsonb;
  after_v  jsonb;
  admin_id text := nullif(current_setting('app.admin_id', true), '');
  actor    "ActorType";
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN new_row := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k ORDER BY k) INTO changed
      FROM jsonb_object_keys(new_row) AS k
     WHERE new_row -> k IS DISTINCT FROM old_row -> k
       AND NOT (k = ANY (quiet));
    IF changed IS NULL THEN
      RETURN NULL; -- nothing but housekeeping changed
    END IF;
    SELECT jsonb_object_agg(k, CASE WHEN k = ANY (redacted) THEN to_jsonb('[redacted]'::text) ELSE old_row -> k END),
           jsonb_object_agg(k, CASE WHEN k = ANY (redacted) THEN to_jsonb('[redacted]'::text) ELSE new_row -> k END)
      INTO before_v, after_v
      FROM unnest(changed) AS k;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT jsonb_object_agg(key, CASE WHEN key = ANY (redacted) THEN to_jsonb('[redacted]'::text) ELSE value END)
      INTO after_v FROM jsonb_each(new_row);
  ELSE
    SELECT jsonb_object_agg(key, CASE WHEN key = ANY (redacted) THEN to_jsonb('[redacted]'::text) ELSE value END)
      INTO before_v FROM jsonb_each(old_row);
  END IF;

  actor := CASE
    WHEN admin_id IS NOT NULL THEN 'ADMIN'
    ELSE coalesce(nullif(current_setting('app.actor_type', true), '')::"ActorType", 'SYSTEM')
  END;
  IF actor = 'ADMIN' AND admin_id IS NULL THEN
    actor := 'SYSTEM'; -- an ADMIN entry always names its admin (ActivityLog_actor_consistent)
  END IF;

  INSERT INTO "ActivityLog" (id, "actorType", "adminUserId", action, "entityType", "entityId", before, after, "ipHash", "userAgentHash")
  VALUES (
    gen_random_uuid()::text,
    actor,
    CASE WHEN actor = 'ADMIN' THEN admin_id END,
    lower(TG_TABLE_NAME) || '.' || CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END,
    TG_TABLE_NAME,
    coalesce(new_row ->> 'id', old_row ->> 'id', new_row ->> 'key', old_row ->> 'key'),
    before_v,
    after_v,
    nullif(current_setting('app.ip_hash', true), ''),
    nullif(current_setting('app.user_agent_hash', true), '')
  );
  RETURN NULL;
END $$;

-- ------------------------------------------------------------
-- Audited tables. A new table must be added here or to the exempt list in
-- tests/integration/audit-trail.test.ts — that test fails otherwise.
-- ------------------------------------------------------------
CREATE TRIGGER "AdminUser_audit" AFTER INSERT OR UPDATE OR DELETE ON "AdminUser"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('passwordHash,twoFactorSecret,recoveryCodes', 'failedLoginCount,lockedUntil,lastLoginAt');
CREATE TRIGGER "Inquiry_audit" AFTER INSERT OR UPDATE OR DELETE ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('name,email,message,idempotencyKey');

CREATE TRIGGER "Organization_audit"      AFTER INSERT OR UPDATE OR DELETE ON "Organization"      FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "System_audit"            AFTER INSERT OR UPDATE OR DELETE ON "System"            FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Impact_audit"            AFTER INSERT OR UPDATE OR DELETE ON "Impact"            FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Testimonial_audit"       AFTER INSERT OR UPDATE OR DELETE ON "Testimonial"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Timeline_audit"          AFTER INSERT OR UPDATE OR DELETE ON "Timeline"          FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Profile_audit"           AFTER INSERT OR UPDATE OR DELETE ON "Profile"           FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "ProfileLink_audit"       AFTER INSERT OR UPDATE OR DELETE ON "ProfileLink"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Achievement_audit"       AFTER INSERT OR UPDATE OR DELETE ON "Achievement"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Experience_audit"        AFTER INSERT OR UPDATE OR DELETE ON "Experience"        FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Education_audit"         AFTER INSERT OR UPDATE OR DELETE ON "Education"         FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Skill_audit"             AFTER INSERT OR UPDATE OR DELETE ON "Skill"             FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "SkillOnSystem_audit"     AFTER INSERT OR UPDATE OR DELETE ON "SkillOnSystem"     FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "SkillOnExperience_audit" AFTER INSERT OR UPDATE OR DELETE ON "SkillOnExperience" FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "SkillOnEducation_audit"  AFTER INSERT OR UPDATE OR DELETE ON "SkillOnEducation"  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Status_audit"            AFTER INSERT OR UPDATE OR DELETE ON "Status"            FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Domain_audit"            AFTER INSERT OR UPDATE OR DELETE ON "Domain"            FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "InquiryType_audit"       AFTER INSERT OR UPDATE OR DELETE ON "InquiryType"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "MilestoneType_audit"     AFTER INSERT OR UPDATE OR DELETE ON "MilestoneType"     FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "SkillCategory_audit"     AFTER INSERT OR UPDATE OR DELETE ON "SkillCategory"     FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "RepoRelationship_audit"  AFTER INSERT OR UPDATE OR DELETE ON "RepoRelationship"  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "PlatformSetting_audit"   AFTER INSERT OR UPDATE OR DELETE ON "PlatformSetting"   FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Flag_audit"              AFTER INSERT OR UPDATE OR DELETE ON "Flag"              FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "VisitorLens_audit"       AFTER INSERT OR UPDATE OR DELETE ON "VisitorLens"       FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "Metric_audit"            AFTER INSERT OR UPDATE OR DELETE ON "Metric"            FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "MetricSnapshot_audit"    AFTER INSERT OR UPDATE OR DELETE ON "MetricSnapshot"    FOR EACH ROW EXECUTE FUNCTION audit_row_change();

-- Deliberately NOT audited (each is its own record, or is noise):
--   ActivityLog (the log itself), SystemStatusChange (append-only history),
--   JobRun (run history), DocumentGen (generated on public demand, supersession
--   is its history), RateLimitEntry, LoginChallenge (auth internals — auth
--   events are logged explicitly), Event (analytics), SystemActivityWeek
--   (GitHub sync data, recorded by JobRun), ContentChunk (AI index, V1.1).
