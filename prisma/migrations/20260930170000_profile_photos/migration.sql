-- F5c (docs/PUBLIC-REDESIGN-PLAN.md D6): the owner's photos as data — the
-- About portrait first — uploaded in the admin, never a file in the code.
-- BR-1.17: a photo version is superseded, never altered or deleted; one
-- current photo per purpose; the app re-encodes every upload (WebP, metadata
-- such as GPS location stripped) before it is stored.
--   purpose  — which slot it fills ("about", …); the app's registry of
--              purposes (lib/profile/photos.ts), checked here for shape only.
--   altText  — what the photo shows, for screen readers; editable.

CREATE TABLE "ProfilePhoto" (
  "id"           text PRIMARY KEY,
  "purpose"      text NOT NULL,
  "altText"      text NOT NULL,
  "mimeType"     text NOT NULL,
  "width"        integer NOT NULL,
  "height"       integer NOT NULL,
  "byteSize"     integer NOT NULL,
  "sha256"       text NOT NULL,
  "fileData"     bytea NOT NULL,
  "uploadedAt"   timestamptz(3) NOT NULL DEFAULT now(),
  "supersededAt" timestamptz(3),
  "updatedAt"    timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "ProfilePhoto_purpose_format" CHECK ("purpose" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "ProfilePhoto_alt_present" CHECK (length(btrim("altText")) BETWEEN 1 AND 300),
  CONSTRAINT "ProfilePhoto_mime" CHECK ("mimeType" IN ('image/webp')),
  CONSTRAINT "ProfilePhoto_dimensions" CHECK ("width" > 0 AND "height" > 0),
  CONSTRAINT "ProfilePhoto_size_matches" CHECK ("byteSize" > 0 AND "byteSize" = octet_length("fileData")),
  CONSTRAINT "ProfilePhoto_sha256_hex" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "ProfilePhoto_one_current_per_purpose" ON "ProfilePhoto" ("purpose") WHERE "supersededAt" IS NULL;
CREATE INDEX "ProfilePhoto_purpose_uploadedAt_idx" ON "ProfilePhoto" ("purpose", "uploadedAt" DESC);

-- A version's image is fixed once uploaded; only its alt text and whether it
-- is current change.
CREATE FUNCTION enforce_br_1_17_profile_photo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'BR-1.17: photo versions are superseded, never deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW."id", NEW."purpose", NEW."mimeType", NEW."width", NEW."height", NEW."byteSize", NEW."sha256", NEW."fileData", NEW."uploadedAt")
     IS DISTINCT FROM
     (OLD."id", OLD."purpose", OLD."mimeType", OLD."width", OLD."height", OLD."byteSize", OLD."sha256", OLD."fileData", OLD."uploadedAt") THEN
    RAISE EXCEPTION 'BR-1.17: an uploaded photo can''t be altered — upload a new version instead' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ProfilePhoto_br_1_17" BEFORE UPDATE OR DELETE ON "ProfilePhoto"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_17_profile_photo();
CREATE TRIGGER "ProfilePhoto_br_1_17_truncate" BEFORE TRUNCATE ON "ProfilePhoto"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_br_1_17_profile_photo();

-- The current photo per purpose, bytes included — the public site serves it.
CREATE VIEW "PublicProfilePhoto" AS
 SELECT p."purpose", p."altText", p."mimeType", p."width", p."height", p."byteSize", p."sha256", p."uploadedAt", p."fileData"
   FROM "ProfilePhoto" p
  WHERE p."supersededAt" IS NULL;

REVOKE DELETE, TRUNCATE ON "ProfilePhoto" FROM platform_runtime;
REVOKE INSERT, UPDATE, DELETE ON "PublicProfilePhoto" FROM platform_runtime;
GRANT SELECT ON "PublicProfilePhoto" TO platform_public;

-- Image bytes never go into the append-only log; the version's hash does.
CREATE TRIGGER "ProfilePhoto_audit" AFTER INSERT OR UPDATE OR DELETE ON "ProfilePhoto"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('fileData');
