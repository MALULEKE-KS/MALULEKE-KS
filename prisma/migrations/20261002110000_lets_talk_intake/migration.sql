-- Let's Talk — opportunity intake (docs/LETS-TALK-SPEC.md). Extends Inquiry
-- rather than building a parallel system; the laws live here, in the database:
--   LT-3  a human-readable reference, made here, unique, never a credential
--   LT-4  a compensation range can't run backwards or below zero
--   LT-6  allowed transitions + an append-only history the database writes itself
--   LT-7  notes and applicant messages in separate tables
--   LT-8  documents are PDFs (checked by their bytes), bounded, never public
--   BR-5.2 retention now clears every new personal field and purges documents
--   audit: every new personal column is redacted from the activity log

-- ─── LT-3: the reference ──────────────────────────────────────────────
-- KS-<yy>-<4>-<2> in Crockford base-32 (no I, L, O, U): non-sequential, so it
-- says nothing about volume. random() is enough — a reference identifies, it
-- never authorises anything.
CREATE FUNCTION new_inquiry_reference() RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'KS-' || to_char(now() AT TIME ZONE 'UTC', 'YY') || '-';
    FOR i IN 1..6 LOOP
      IF i = 5 THEN candidate := candidate || '-'; END IF;
      candidate := candidate || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "Inquiry" WHERE "reference" = candidate);
  END LOOP;
  RETURN candidate;
END $$;

-- ─── Types and columns (generated from prisma/schema.prisma) ──────────
CREATE TYPE "InquiryPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "MeetingState" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "NotificationState" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "Inquiry" ADD COLUMN "details" JSONB,
ADD COLUMN "detailsVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "organization" TEXT,
ADD COLUMN "payloadHash" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "possibleDuplicateOfId" TEXT,
ADD COLUMN "preferredChannel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN "preferredChannelOther" TEXT,
ADD COLUMN "priority" "InquiryPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "profileUrl" TEXT,
ADD COLUMN "reference" TEXT,
ADD COLUMN "role" TEXT,
ADD COLUMN "subtypeId" TEXT,
ADD COLUMN "subtypeOther" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "website" TEXT;

-- Existing inquiries get their references one by one (the function checks the
-- column it fills), then the column becomes required with the function as default.
UPDATE "Inquiry" SET "reference" = new_inquiry_reference() WHERE "reference" IS NULL;
ALTER TABLE "Inquiry" ALTER COLUMN "reference" SET NOT NULL, ALTER COLUMN "reference" SET DEFAULT new_inquiry_reference();

ALTER TABLE "InquiryType" ADD COLUMN "description" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "InquirySubtype" (
    "id" TEXT NOT NULL,
    "inquiryTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquirySubtype_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryStatusChange" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fromStatus" "InquiryStatus",
    "toStatus" "InquiryStatus" NOT NULL,
    "internalReason" TEXT,
    "applicantMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryNote" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryMessage" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requestedItems" TEXT[],
    "dueAt" TIMESTAMPTZ(3),
    "channel" TEXT NOT NULL DEFAULT 'email',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryMeeting" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "timeZone" TEXT NOT NULL,
    "location" TEXT,
    "link" TEXT,
    "contactPerson" TEXT,
    "instructions" TEXT,
    "state" "MeetingState" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InquiryDocument" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "inquiryId" TEXT,
    "state" "NotificationState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerId" TEXT,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InquirySubtype_inquiryTypeId_key_key" ON "InquirySubtype"("inquiryTypeId", "key");
CREATE INDEX "InquiryStatusChange_inquiryId_createdAt_idx" ON "InquiryStatusChange"("inquiryId", "createdAt");
CREATE INDEX "InquiryNote_inquiryId_createdAt_idx" ON "InquiryNote"("inquiryId", "createdAt");
CREATE INDEX "InquiryMessage_inquiryId_createdAt_idx" ON "InquiryMessage"("inquiryId", "createdAt");
CREATE INDEX "InquiryMeeting_inquiryId_startsAt_idx" ON "InquiryMeeting"("inquiryId", "startsAt");
CREATE UNIQUE INDEX "InquiryDocument_inquiryId_sha256_key" ON "InquiryDocument"("inquiryId", "sha256");
CREATE INDEX "Notification_state_nextAttemptAt_idx" ON "Notification"("state", "nextAttemptAt");
CREATE UNIQUE INDEX "Inquiry_reference_key" ON "Inquiry"("reference");
CREATE INDEX "Inquiry_email_idx" ON "Inquiry"("email");

ALTER TABLE "InquirySubtype" ADD CONSTRAINT "InquirySubtype_inquiryTypeId_fkey" FOREIGN KEY ("inquiryTypeId") REFERENCES "InquiryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "InquirySubtype"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InquiryStatusChange" ADD CONSTRAINT "InquiryStatusChange_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InquiryMessage" ADD CONSTRAINT "InquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InquiryMeeting" ADD CONSTRAINT "InquiryMeeting_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InquiryDocument" ADD CONSTRAINT "InquiryDocument_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Bounded payloads (BR-2.3 extended): nothing unbounded gets stored ──
ALTER TABLE "Inquiry"
  ADD CONSTRAINT "Inquiry_lt_bounds" CHECK (
        char_length(coalesce("phone", '')) <= 40
    AND char_length(coalesce("organization", '')) <= 160
    AND char_length(coalesce("role", '')) <= 120
    AND char_length(coalesce("website", '')) <= 300
    AND char_length(coalesce("profileUrl", '')) <= 300
    AND char_length(coalesce("subtypeOther", '')) <= 200
    AND char_length(coalesce("preferredChannelOther", '')) <= 120
    AND ("details" IS NULL OR (jsonb_typeof("details") = 'object' AND octet_length("details"::text) <= 20000))
  ),
  ADD CONSTRAINT "Inquiry_lt_channel" CHECK ("preferredChannel" IN ('email', 'phone', 'whatsapp', 'sms', 'other')),
  -- LT-4: a compensation range never runs backwards or below zero.
  ADD CONSTRAINT "Inquiry_lt_4_compensation" CHECK (
    "details" IS NULL OR NOT (
         (jsonb_typeof("details" #> '{compensation,min}') = 'number' AND ("details" #>> '{compensation,min}')::numeric < 0)
      OR (jsonb_typeof("details" #> '{compensation,max}') = 'number' AND ("details" #>> '{compensation,max}')::numeric < 0)
      OR (jsonb_typeof("details" #> '{compensation,min}') = 'number' AND jsonb_typeof("details" #> '{compensation,max}') = 'number'
          AND ("details" #>> '{compensation,min}')::numeric > ("details" #>> '{compensation,max}')::numeric)
    )
  );

ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_bounds" CHECK (char_length(btrim("body")) BETWEEN 1 AND 5000);
ALTER TABLE "InquiryMessage" ADD CONSTRAINT "InquiryMessage_bounds" CHECK (
  char_length(btrim("body")) BETWEEN 1 AND 5000
  AND "kind" IN ('message', 'info-request', 'acceptance', 'decline', 'hold')
  AND coalesce(array_length("requestedItems", 1), 0) <= 12
);
ALTER TABLE "InquiryStatusChange" ADD CONSTRAINT "InquiryStatusChange_bounds" CHECK (
  char_length(coalesce("internalReason", '')) <= 2000 AND char_length(coalesce("applicantMessage", '')) <= 5000
);
-- LT-5: a meeting ends after it starts and always carries its time zone.
ALTER TABLE "InquiryMeeting" ADD CONSTRAINT "InquiryMeeting_lt_5" CHECK (
  ("endsAt" IS NULL OR "endsAt" > "startsAt")
  AND char_length(btrim("timeZone")) BETWEEN 1 AND 64
  AND "kind" IN ('hr', 'technical', 'manager', 'panel', 'discovery', 'client', 'general', 'other')
  AND char_length(coalesce("location", '')) <= 200
  AND char_length(coalesce("link", '')) <= 500
  AND char_length(coalesce("contactPerson", '')) <= 120
  AND char_length(coalesce("instructions", '')) <= 2000
);
-- LT-8: a document is a PDF by its first bytes, at most 4 MB, with a plain name.
ALTER TABLE "InquiryDocument" ADD CONSTRAINT "InquiryDocument_lt_8" CHECK (
  "byteSize" BETWEEN 5 AND 4194304
  AND octet_length("fileData") = "byteSize"
  AND substring("fileData" FROM 1 FOR 5) = '\x255044462d'::bytea
  AND char_length("fileName") BETWEEN 1 AND 160
  AND "fileName" !~ '[/\\[:cntrl:]]'
  AND "sha256" ~ '^[0-9a-f]{64}$'
);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bounds" CHECK (
  char_length("subject") BETWEEN 1 AND 200 AND char_length("body") BETWEEN 1 AND 20000 AND "attempts" >= 0
);

-- ─── LT-6: the state machine (replaces BR-2.1's four-state version) ───
CREATE OR REPLACE FUNCTION enforce_br_2_1_inquiry_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'NEW' THEN
      RAISE EXCEPTION 'BR-2.1: an inquiry must start as NEW, not %', NEW.status USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  -- Triage first (NEW → REVIEWED is the only way out of NEW, BR-2.1); then the
  -- conversation; decisions; and reopening back to REVIEWED, history kept.
  IF (OLD.status::text, NEW.status::text) IN (
       ('NEW', 'REVIEWED'),
       ('REVIEWED', 'NEEDS_INFO'), ('REVIEWED', 'RESPONDED'), ('REVIEWED', 'ACCEPTED'), ('REVIEWED', 'DECLINED'),
       ('REVIEWED', 'ON_HOLD'), ('REVIEWED', 'CLOSED'), ('REVIEWED', 'WITHDRAWN'),
       ('NEEDS_INFO', 'REVIEWED'), ('NEEDS_INFO', 'RESPONDED'), ('NEEDS_INFO', 'DECLINED'), ('NEEDS_INFO', 'ON_HOLD'),
       ('NEEDS_INFO', 'CLOSED'), ('NEEDS_INFO', 'WITHDRAWN'),
       ('RESPONDED', 'NEEDS_INFO'), ('RESPONDED', 'ACCEPTED'), ('RESPONDED', 'DECLINED'), ('RESPONDED', 'ON_HOLD'),
       ('RESPONDED', 'CLOSED'), ('RESPONDED', 'WITHDRAWN'),
       ('ON_HOLD', 'REVIEWED'), ('ON_HOLD', 'DECLINED'), ('ON_HOLD', 'CLOSED'), ('ON_HOLD', 'WITHDRAWN'),
       ('ACCEPTED', 'CLOSED'), ('ACCEPTED', 'REVIEWED'),
       ('DECLINED', 'CLOSED'), ('DECLINED', 'REVIEWED'),
       ('WITHDRAWN', 'CLOSED'), ('WITHDRAWN', 'REVIEWED'),
       ('CLOSED', 'REVIEWED')
     ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'BR-2.1: invalid inquiry transition % → %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
END $$;

-- LT-6: the database writes the history itself, so no path can change a status
-- without leaving a record. The reason and the applicant's message come from
-- transaction-local settings the app sets for that one change.
CREATE FUNCTION record_inquiry_status_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
    RETURN NULL;
  END IF;
  INSERT INTO "InquiryStatusChange" ("id", "inquiryId", "fromStatus", "toStatus", "internalReason", "applicantMessage")
  VALUES (
    gen_random_uuid()::text,
    NEW."id",
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
    NEW.status,
    nullif(current_setting('app.inquiry_reason', true), ''),
    nullif(current_setting('app.inquiry_message', true), '')
  );
  RETURN NULL;
END $$;
CREATE TRIGGER "Inquiry_lt_6_history"
  AFTER INSERT OR UPDATE OF status ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION record_inquiry_status_change();

-- Append-only: history is never edited; it leaves only with its inquiry (BR-5.5 removal).
CREATE FUNCTION enforce_lt_6_history_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM "Inquiry" WHERE "id" = OLD."inquiryId") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'LT-6: inquiry status history is append-only' USING ERRCODE = 'check_violation';
END $$;
CREATE TRIGGER "InquiryStatusChange_append_only"
  BEFORE UPDATE OR DELETE ON "InquiryStatusChange"
  FOR EACH ROW EXECUTE FUNCTION enforce_lt_6_history_append_only();

-- Inquiries that already exist get their opening entry, so every history starts at NEW.
INSERT INTO "InquiryStatusChange" ("id", "inquiryId", "fromStatus", "toStatus", "createdAt")
SELECT gen_random_uuid()::text, "id", NULL, 'NEW', "createdAt" FROM "Inquiry";

-- ─── BR-5.2 retention, extended to everything personal ────────────────
CREATE OR REPLACE FUNCTION apply_retention(p_months integer)
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

  -- What hangs off an expiring inquiry goes first: documents purged, notes and
  -- messages and meeting details stripped, queued email cleared.
  DELETE FROM "InquiryDocument" d USING "Inquiry" i
   WHERE d."inquiryId" = i."id" AND i."createdAt" < cutoff AND i."anonymizedAt" IS NULL;
  UPDATE "InquiryNote" n SET "body" = 'Removed after the retention period (BR-5.2).'
    FROM "Inquiry" i WHERE n."inquiryId" = i."id" AND i."createdAt" < cutoff AND i."anonymizedAt" IS NULL;
  UPDATE "InquiryMessage" m SET "body" = 'Removed after the retention period (BR-5.2).', "requestedItems" = ARRAY[]::text[]
    FROM "Inquiry" i WHERE m."inquiryId" = i."id" AND i."createdAt" < cutoff AND i."anonymizedAt" IS NULL;
  UPDATE "InquiryMeeting" mt SET "location" = NULL, "link" = NULL, "contactPerson" = NULL, "instructions" = NULL
    FROM "Inquiry" i WHERE mt."inquiryId" = i."id" AND i."createdAt" < cutoff AND i."anonymizedAt" IS NULL;
  UPDATE "Notification" nt SET "recipient" = 'anonymized@retention.invalid', "body" = 'Removed after the retention period (BR-5.2).', "lastError" = NULL
    FROM "Inquiry" i WHERE nt."inquiryId" = i."id" AND i."createdAt" < cutoff AND i."anonymizedAt" IS NULL;

  UPDATE "Inquiry"
     SET "name" = 'Anonymized',
         "email" = 'anonymized@retention.invalid',
         "message" = 'Removed after the retention period (BR-5.2).',
         "phone" = NULL, "organization" = NULL, "role" = NULL, "website" = NULL, "profileUrl" = NULL,
         "subtypeOther" = NULL, "preferredChannelOther" = NULL, "details" = NULL, "payloadHash" = NULL,
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

-- An anonymised inquiry still moves through its workflow (status, version,
-- priority) but its personal fields can never come back.
CREATE OR REPLACE FUNCTION enforce_br_5_2_anonymized() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."anonymizedAt" IS NOT NULL AND (
       NEW."anonymizedAt" IS DISTINCT FROM OLD."anonymizedAt"
    OR (TG_TABLE_NAME = 'Inquiry' AND (to_jsonb(NEW) - 'status' - 'updatedAt' - 'version' - 'priority') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updatedAt' - 'version' - 'priority'))
    OR (TG_TABLE_NAME = 'Event' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD))
  ) THEN
    RAISE EXCEPTION 'BR-5.2: % % was anonymised after the retention period and can''t be changed back', TG_TABLE_NAME, OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

-- ─── Audit: every personal column redacted ────────────────────────────
CREATE OR REPLACE TRIGGER "Inquiry_audit" AFTER INSERT OR UPDATE OR DELETE ON "Inquiry"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change(
    'name,email,message,idempotencyKey,phone,organization,role,website,profileUrl,subtypeOther,preferredChannelOther,details,payloadHash',
    'version');
CREATE TRIGGER "InquirySubtype_audit" AFTER INSERT OR UPDATE OR DELETE ON "InquirySubtype"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
CREATE TRIGGER "InquiryNote_audit" AFTER INSERT OR UPDATE OR DELETE ON "InquiryNote"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('body');
CREATE TRIGGER "InquiryMessage_audit" AFTER INSERT OR UPDATE OR DELETE ON "InquiryMessage"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('body,requestedItems');
CREATE TRIGGER "InquiryMeeting_audit" AFTER INSERT OR UPDATE OR DELETE ON "InquiryMeeting"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('location,link,contactPerson,instructions');
CREATE TRIGGER "InquiryDocument_audit" AFTER INSERT OR UPDATE OR DELETE ON "InquiryDocument"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('fileName,fileData,sha256');

-- History and the outbox are their own record (exempt, like SystemStatusChange
-- and JobRun); the runtime role can't rewrite history.
REVOKE UPDATE, DELETE, TRUNCATE ON "InquiryStatusChange" FROM platform_runtime;

-- ─── The categories (LT-1) ────────────────────────────────────────────
-- Existing keys keep their rows (and their past inquiries); hire, partnership
-- and contribution retire (BR-8.2: deactivated, never deleted).
UPDATE "InquiryType" SET "active" = false WHERE "key" IN ('hire', 'partnership', 'contribution');
INSERT INTO "InquiryType" ("id", "key", "label", "description", "sortOrder", "active") VALUES
  (gen_random_uuid()::text, 'recruitment', 'I''m hiring or recruiting', 'A role — full-time, contract, freelance, internship or graduate.', 10, true),
  (gen_random_uuid()::text, 'service', 'I have a software project', 'Something to build, improve, automate or advise on.', 20, true),
  (gen_random_uuid()::text, 'collaboration', 'I want to collaborate', 'A product, startup, research or open-source idea to build together.', 30, true),
  (gen_random_uuid()::text, 'growth', 'Marketing or growth', 'Digital presence, campaigns, content or a growth strategy.', 40, true),
  (gen_random_uuid()::text, 'general', 'Something else', 'A question, an introduction, or anything that doesn''t fit above.', 50, true)
ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "description" = EXCLUDED."description", "sortOrder" = EXCLUDED."sortOrder", "active" = true;

INSERT INTO "InquirySubtype" ("id", "inquiryTypeId", "key", "label", "sortOrder")
SELECT gen_random_uuid()::text, t."id", s.key, s.label, s.ord
  FROM "InquiryType" t
  JOIN (VALUES
    ('recruitment', 'full-time', 'Full-time', 1), ('recruitment', 'part-time', 'Part-time', 2), ('recruitment', 'contract', 'Contract', 3),
    ('recruitment', 'freelance', 'Freelance', 4), ('recruitment', 'internship', 'Internship', 5), ('recruitment', 'graduate', 'Graduate programme', 6),
    ('recruitment', 'temporary', 'Temporary', 7), ('recruitment', 'other', 'Other', 99),
    ('service', 'web-app', 'Web application', 1), ('service', 'backend-api', 'Backend / API', 2), ('service', 'automation', 'Automation', 3),
    ('service', 'mvp', 'MVP / prototype', 4), ('service', 'existing-system', 'Improve an existing system', 5), ('service', 'ai-data', 'AI / data', 6),
    ('service', 'consulting', 'Technical consulting', 7), ('service', 'other', 'Other', 99),
    ('collaboration', 'software', 'Software', 1), ('collaboration', 'research', 'Research', 2), ('collaboration', 'startup', 'Startup', 3),
    ('collaboration', 'business', 'Business', 4), ('collaboration', 'product', 'Product', 5), ('collaboration', 'open-source', 'Open source', 6),
    ('collaboration', 'other', 'Other', 99),
    ('growth', 'digital-marketing', 'Digital marketing', 1), ('growth', 'campaign', 'A campaign', 2), ('growth', 'social-media', 'Social media', 3),
    ('growth', 'content', 'Content', 4), ('growth', 'digital-presence', 'Digital presence', 5), ('growth', 'growth-strategy', 'Growth strategy', 6),
    ('growth', 'other', 'Other', 99)
  ) AS s(type_key, key, label, ord) ON s.type_key = t."key"
ON CONFLICT ("inquiryTypeId", "key") DO NOTHING;

-- LT-9: confirmations to applicants ship switched off — Resend delivers only to
-- the account owner until a sending domain is verified.
INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'notifications.applicant_emails', false, 'Email each applicant their reference (LT-9). Turn on only after a sending domain is verified in Resend and notifications.fromAddress uses it.')
ON CONFLICT ("key") DO NOTHING;
