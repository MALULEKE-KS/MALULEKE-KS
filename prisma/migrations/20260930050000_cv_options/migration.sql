-- #92: two CV options for visitors (owner's decision, 2026-09-30) — the CV the
-- platform generates from live data (#74) and a CV file the owner uploads.
-- BR-7.1 is rewritten (two clearly labelled options, neither passed off as
-- the other), BR-7.2 now covers uploads, BR-7.5 governs which options are
-- shown, BR-7.6 what an upload may be. Stored in Postgres like DocumentGen
-- (Constitution §9: self-hosted, small, low volume — no new dependency).

-- ------------------------------------------------------------
-- Uploaded CV files: versioned, superseded, never deleted or altered (BR-7.2)
-- ------------------------------------------------------------
CREATE TABLE "CvUpload" (
  "id"           text PRIMARY KEY,
  "format"       text NOT NULL,
  "fileName"     text NOT NULL, -- as uploaded, for the admin's version list; never used as a download name
  "byteSize"     integer NOT NULL,
  "sha256"       text NOT NULL,
  "fileData"     bytea NOT NULL,
  "uploadedAt"   timestamptz(3) NOT NULL DEFAULT now(),
  "supersededAt" timestamptz(3), -- null = the current file for its format
  "updatedAt"    timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "CvUpload_br_7_6_format" CHECK ("format" IN ('pdf', 'docx')),
  CONSTRAINT "CvUpload_size_matches" CHECK ("byteSize" > 0 AND "byteSize" = octet_length("fileData")),
  CONSTRAINT "CvUpload_sha256_hex" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "CvUpload_file_name_length" CHECK (char_length("fileName") BETWEEN 1 AND 200)
);
-- At most one current file per format (a PDF and a Word version may coexist).
CREATE UNIQUE INDEX "CvUpload_one_current_per_format" ON "CvUpload" ("format") WHERE "supersededAt" IS NULL;
CREATE INDEX "CvUpload_format_uploadedAt_idx" ON "CvUpload" ("format", "uploadedAt" DESC);

-- A version's content is fixed once uploaded; only whether it is current changes.
CREATE FUNCTION enforce_br_7_2_cv_upload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'BR-7.2: uploaded CV versions are superseded, never deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW."id", NEW."format", NEW."fileName", NEW."byteSize", NEW."sha256", NEW."fileData", NEW."uploadedAt")
     IS DISTINCT FROM
     (OLD."id", OLD."format", OLD."fileName", OLD."byteSize", OLD."sha256", OLD."fileData", OLD."uploadedAt") THEN
    RAISE EXCEPTION 'BR-7.2: an uploaded CV can''t be altered — upload a new version instead' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CvUpload_br_7_2" BEFORE UPDATE OR DELETE ON "CvUpload"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_7_2_cv_upload();
CREATE TRIGGER "CvUpload_br_7_2_truncate" BEFORE TRUNCATE ON "CvUpload"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_br_7_2_cv_upload();

-- ------------------------------------------------------------
-- Which options visitors see (BR-7.5): one row, admin-edited, labels as data
-- ------------------------------------------------------------
CREATE TABLE "CvOptions" (
  "id"             integer PRIMARY KEY DEFAULT 1,
  "showGenerated"  boolean NOT NULL DEFAULT true,
  "showUploaded"   boolean NOT NULL DEFAULT true,
  "firstOption"    text NOT NULL DEFAULT 'generated',
  "generatedLabel" text NOT NULL DEFAULT 'Generated CV',
  "generatedNote"  text NOT NULL DEFAULT 'Built from this site''s live data at the moment you download it.',
  "uploadedLabel"  text NOT NULL DEFAULT 'Uploaded CV',
  "uploadedNote"   text NOT NULL DEFAULT 'A CV file uploaded as-is, shown with its upload date.',
  "createdAt"      timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "CvOptions_singleton" CHECK ("id" = 1),
  CONSTRAINT "CvOptions_first_option" CHECK ("firstOption" IN ('generated', 'uploaded')),
  CONSTRAINT "CvOptions_br_7_5_one_visible" CHECK ("showGenerated" OR "showUploaded"),
  CONSTRAINT "CvOptions_br_7_5_first_is_visible"
    CHECK (("firstOption" = 'generated' AND "showGenerated") OR ("firstOption" = 'uploaded' AND "showUploaded")),
  CONSTRAINT "CvOptions_labels" CHECK (
    char_length(btrim("generatedLabel")) BETWEEN 1 AND 60 AND char_length(btrim("uploadedLabel")) BETWEEN 1 AND 60
    AND char_length("generatedNote") <= 200 AND char_length("uploadedNote") <= 200)
);
INSERT INTO "CvOptions" ("id") VALUES (1);

-- The same laws with the rule's own words (the CHECKs above are the backstop),
-- plus one a CHECK can't express: the generated CV can only be hidden once an
-- uploaded CV exists, so a visitor is never left with nothing.
CREATE FUNCTION enforce_br_7_5_cv_options() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW."showGenerated" AND NOT NEW."showUploaded" THEN
    RAISE EXCEPTION 'BR-7.5: at least one CV option must stay visible' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW."firstOption" = 'generated' AND NOT NEW."showGenerated")
     OR (NEW."firstOption" = 'uploaded' AND NOT NEW."showUploaded") THEN
    RAISE EXCEPTION 'BR-7.5: the option listed first must be a visible one' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT NEW."showGenerated" AND NOT EXISTS (SELECT 1 FROM "CvUpload" WHERE "supersededAt" IS NULL) THEN
    RAISE EXCEPTION 'BR-7.5: upload a CV before hiding the generated one — visitors must always have a CV to download'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CvOptions_br_7_5" BEFORE INSERT OR UPDATE ON "CvOptions"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_7_5_cv_options();

-- ------------------------------------------------------------
-- Public read model: visible options, and current files of a visible upload
-- option only — a hidden or superseded file can't be reached by the public role
-- ------------------------------------------------------------
CREATE VIEW "PublicCvOption" AS
 SELECT 'generated'::text AS kind,
        o."generatedLabel" AS label,
        o."generatedNote" AS note,
        (o."firstOption" = 'generated') AS "isFirst",
        ARRAY['pdf', 'docx']::text[] AS formats,
        NULL::timestamptz(3) AS "uploadedAt"
   FROM "CvOptions" o
  WHERE o."showGenerated"
 UNION ALL
 SELECT 'uploaded'::text,
        o."uploadedLabel",
        o."uploadedNote",
        (o."firstOption" = 'uploaded'),
        array_agg(u."format" ORDER BY u."format"),
        max(u."uploadedAt")
   FROM "CvOptions" o
   JOIN "CvUpload" u ON u."supersededAt" IS NULL
  WHERE o."showUploaded"
  GROUP BY o."uploadedLabel", o."uploadedNote", o."firstOption";

CREATE VIEW "PublicCvUpload" AS
 SELECT u."id", u."format", u."byteSize", u."uploadedAt", u."fileData"
   FROM "CvUpload" u
   JOIN "CvOptions" o ON o."id" = 1 AND o."showUploaded"
  WHERE u."supersededAt" IS NULL;

-- ------------------------------------------------------------
-- Least privilege (F1.8) and the audit trail (F2.1)
-- ------------------------------------------------------------
REVOKE DELETE, TRUNCATE ON "CvUpload" FROM platform_runtime;
REVOKE INSERT, DELETE, TRUNCATE ON "CvOptions" FROM platform_runtime;
REVOKE INSERT, UPDATE, DELETE ON "PublicCvOption", "PublicCvUpload" FROM platform_runtime;
GRANT SELECT ON "PublicCvOption", "PublicCvUpload" TO platform_public;

-- File bytes never go into the append-only log; the version's hash does.
CREATE TRIGGER "CvUpload_audit" AFTER INSERT OR UPDATE OR DELETE ON "CvUpload"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('fileData');
CREATE TRIGGER "CvOptions_audit" AFTER INSERT OR UPDATE OR DELETE ON "CvOptions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
