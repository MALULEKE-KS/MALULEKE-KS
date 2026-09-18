-- F1.2 — The database enforces the business rules itself (#60).
--
-- Application code already checks these rules; this migration makes the
-- database refuse violations too, so no future bug, script or console session
-- can bypass them. Every object is named for the rule it enforces, and every
-- error message cites that rule. Additive only (EXT-1): nothing is dropped or
-- rewritten. Verified read-only against production before writing: zero
-- existing rows violate any of these.
--
-- Errors use SQLSTATE 23514 (check_violation) so the app can map any of them
-- to a 4xx the same way it maps a CHECK failure.

-- ============================================================
-- Publishing (BR-1.x)
-- ============================================================

-- BR-1.1: nothing non-PUBLIC is published without client approval.
ALTER TABLE "System" ADD CONSTRAINT "System_br_1_1_publish_requires_approval"
  CHECK (NOT ("contentStatus" = 'PUBLISHED' AND "clientVisibility" <> 'PUBLIC' AND NOT "clientApproved"));

-- BR-1.2: a System created under a client Organization starts restricted.
-- Opening it up later is a deliberate admin UPDATE, so this fires on INSERT only.
CREATE FUNCTION enforce_br_1_2_client_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."clientVisibility" = 'PUBLIC'
     AND EXISTS (SELECT 1 FROM "Organization" o WHERE o.id = NEW."organizationId" AND o."isClient") THEN
    NEW."clientVisibility" := 'REQUIRES_APPROVAL';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "System_br_1_2_client_default"
  BEFORE INSERT ON "System" FOR EACH ROW EXECUTE FUNCTION enforce_br_1_2_client_default();

-- BR-1.9: Systems are never hard-deleted — retirement is contentStatus = ARCHIVED.
-- BR-7.2: generated documents are superseded, never deleted.
CREATE FUNCTION enforce_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are never deleted (%)', TG_TABLE_NAME, TG_ARGV[0]
    USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "System_br_1_9_no_delete"
  BEFORE DELETE ON "System" FOR EACH ROW EXECUTE FUNCTION enforce_no_delete('BR-1.9: archive instead');
CREATE TRIGGER "DocumentGen_br_7_2_no_delete"
  BEFORE DELETE ON "DocumentGen" FOR EACH ROW EXECUTE FUNCTION enforce_no_delete('BR-7.2: supersede instead');

-- Slugs are URL segments: lowercase words joined by single hyphens.
ALTER TABLE "System" ADD CONSTRAINT "System_slug_format"
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_slug_format"
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ============================================================
-- Inquiries (BR-2.x)
-- ============================================================

-- BR-2.3: required fields and message bounds.
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_br_2_3_message_length"
  CHECK (char_length(message) BETWEEN 20 AND 5000);
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_br_2_3_name_present"
  CHECK (char_length(btrim(name)) > 0);
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_br_2_3_email_shape"
  CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- BR-2.1: every inquiry starts NEW; transitions follow
-- NEW → REVIEWED → (RESPONDED → CLOSED | CLOSED). No skipping, no going back.
CREATE FUNCTION enforce_br_2_1_inquiry_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'NEW' THEN
      RAISE EXCEPTION 'BR-2.1: an inquiry must start as NEW, not %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status, NEW.status) IN (
       ('NEW', 'REVIEWED'),
       ('REVIEWED', 'RESPONDED'),
       ('REVIEWED', 'CLOSED'),
       ('RESPONDED', 'CLOSED')
     ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'BR-2.1: invalid inquiry transition % → %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "Inquiry_br_2_1_workflow"
  BEFORE INSERT OR UPDATE OF status ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_2_1_inquiry_workflow();

-- ============================================================
-- Admin security (BR-3.x)
-- ============================================================

-- BR-3.10: admin email stored lowercase, so uniqueness and login can't be
-- bypassed by letter case.
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_br_3_10_email_lowercase"
  CHECK (email = lower(email));
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_failedLoginCount_nonnegative"
  CHECK ("failedLoginCount" >= 0);

-- BR-3.5: a login challenge lives at most 5 minutes (5 s tolerance for clock
-- skew between the app computing expiresAt and the DB stamping createdAt).
ALTER TABLE "LoginChallenge" ADD CONSTRAINT "LoginChallenge_br_3_5_ttl"
  CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + interval '5 minutes 5 seconds');
-- BR-3.6: attempt counter can't go negative.
ALTER TABLE "LoginChallenge" ADD CONSTRAINT "LoginChallenge_attempts_nonnegative"
  CHECK (attempts >= 0);

ALTER TABLE "RateLimitEntry" ADD CONSTRAINT "RateLimitEntry_count_positive"
  CHECK (count >= 1);

-- ============================================================
-- CV & career record
-- ============================================================

ALTER TABLE "Experience" ADD CONSTRAINT "Experience_dates_ordered"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE "Education" ADD CONSTRAINT "Education_dates_ordered"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_yearsExperience_nonnegative"
  CHECK ("yearsExperience" IS NULL OR "yearsExperience" >= 0);

-- "React" and "react" are the same skill.
CREATE UNIQUE INDEX "Skill_name_lower_key" ON "Skill" (lower(name));

-- ============================================================
-- Lookup keys (BR-8.x)
-- ============================================================

-- Keys are stable machine identifiers (URLs, filters, code): lowercase words
-- joined by "_" or "-".
ALTER TABLE "Status"        ADD CONSTRAINT "Status_key_format"        CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');
ALTER TABLE "Domain"        ADD CONSTRAINT "Domain_key_format"        CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');
ALTER TABLE "InquiryType"   ADD CONSTRAINT "InquiryType_key_format"   CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');
ALTER TABLE "MilestoneType" ADD CONSTRAINT "MilestoneType_key_format" CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');
ALTER TABLE "SkillCategory" ADD CONSTRAINT "SkillCategory_key_format" CHECK (key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$');
