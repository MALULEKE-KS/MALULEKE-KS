-- F5c /systems — every system's screenshot (owner, 2026-10-01: "capture the
-- screenshots from their live sites … make it possible for the admin to update
-- and upload every system screenshot"). BR-1.18.
--   source     — 'auto': captured from the system's live site by the daily job
--                (or the admin's "Capture now"); 'upload': the owner's own image.
--   sourceUrl  — the address an automatic capture was taken from.
-- Like the owner's photos (BR-1.17): a version is superseded, never altered or
-- deleted; one current per system; the app re-encodes every image (WebP,
-- metadata stripped) before it is stored. The owner's upload wins: the database
-- refuses an automatic capture while an uploaded screenshot is current —
-- "back to automatic" supersedes the upload first.

CREATE TABLE "SystemScreenshot" (
  "id"           text PRIMARY KEY,
  "systemId"     text NOT NULL REFERENCES "System"("id") ON DELETE RESTRICT,
  "source"       text NOT NULL,
  "sourceUrl"    text,
  "mimeType"     text NOT NULL,
  "width"        integer NOT NULL,
  "height"       integer NOT NULL,
  "byteSize"     integer NOT NULL,
  "sha256"       text NOT NULL,
  "fileData"     bytea NOT NULL,
  "createdAt"    timestamptz(3) NOT NULL DEFAULT now(),
  "supersededAt" timestamptz(3),
  "updatedAt"    timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "SystemScreenshot_source_known" CHECK ("source" IN ('auto', 'upload')),
  CONSTRAINT "SystemScreenshot_auto_has_url" CHECK ("source" <> 'auto' OR "sourceUrl" ~ '^https?://'),
  CONSTRAINT "SystemScreenshot_mime" CHECK ("mimeType" IN ('image/webp')),
  CONSTRAINT "SystemScreenshot_dimensions" CHECK ("width" > 0 AND "height" > 0),
  CONSTRAINT "SystemScreenshot_size_matches" CHECK ("byteSize" > 0 AND "byteSize" = octet_length("fileData")),
  CONSTRAINT "SystemScreenshot_sha256_hex" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "SystemScreenshot_one_current_per_system" ON "SystemScreenshot" ("systemId") WHERE "supersededAt" IS NULL;
CREATE INDEX "SystemScreenshot_system_createdAt_idx" ON "SystemScreenshot" ("systemId", "createdAt" DESC);

-- A version's image is fixed; only whether it is current changes. Never deleted.
CREATE FUNCTION enforce_br_1_18_screenshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'BR-1.18: screenshot versions are superseded, never deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW."id", NEW."systemId", NEW."source", NEW."sourceUrl", NEW."mimeType", NEW."width", NEW."height", NEW."byteSize", NEW."sha256", NEW."fileData", NEW."createdAt")
     IS DISTINCT FROM
     (OLD."id", OLD."systemId", OLD."source", OLD."sourceUrl", OLD."mimeType", OLD."width", OLD."height", OLD."byteSize", OLD."sha256", OLD."fileData", OLD."createdAt") THEN
    RAISE EXCEPTION 'BR-1.18: a screenshot can''t be altered — add a new version instead' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "SystemScreenshot_br_1_18" BEFORE UPDATE OR DELETE ON "SystemScreenshot"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_18_screenshot();
CREATE TRIGGER "SystemScreenshot_br_1_18_truncate" BEFORE TRUNCATE ON "SystemScreenshot"
  FOR EACH STATEMENT EXECUTE FUNCTION enforce_br_1_18_screenshot();

-- The owner's upload wins: no automatic capture becomes current over it.
CREATE FUNCTION enforce_br_1_18_upload_wins() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."source" = 'auto' AND NEW."supersededAt" IS NULL AND EXISTS (
    SELECT 1 FROM "SystemScreenshot" s
     WHERE s."systemId" = NEW."systemId" AND s."supersededAt" IS NULL AND s."source" = 'upload'
  ) THEN
    RAISE EXCEPTION 'BR-1.18: the owner''s uploaded screenshot is current — an automatic capture can''t replace it'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "SystemScreenshot_br_1_18_upload_wins" BEFORE INSERT ON "SystemScreenshot"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_18_upload_wins();

-- The current screenshot of each live system, bytes included — never NDA work (BR-1.3).
CREATE VIEW "PublicSystemScreenshot" AS
 SELECT s."slug", sc."source", sc."mimeType", sc."width", sc."height", sc."byteSize", sc."sha256", sc."createdAt", sc."fileData"
   FROM "SystemScreenshot" sc
   JOIN "System" s ON s."id" = sc."systemId"
  WHERE sc."supersededAt" IS NULL
    AND is_live(s."contentStatus", s."publishAt")
    AND s."clientVisibility" <> 'NDA_RESTRICTED'::"ClientVisibility";

REVOKE DELETE, TRUNCATE ON "SystemScreenshot" FROM platform_runtime;
REVOKE INSERT, UPDATE, DELETE ON "PublicSystemScreenshot" FROM platform_runtime;
GRANT SELECT ON "PublicSystemScreenshot" TO platform_public;

-- Image bytes never go into the append-only log; the version's hash does.
CREATE TRIGGER "SystemScreenshot_audit" AFTER INSERT OR UPDATE OR DELETE ON "SystemScreenshot"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change('fileData');

-- The two portfolio repos the owner deleted from GitHub (2026-10-01): their systems
-- leave the site now; from here on the GitHub sync does this by itself (BR-1.6).
UPDATE "System" SET "contentStatus" = 'DRAFT', "needsCuration" = true, "publishAt" = NULL
 WHERE "slug" IN ('my-angular-portfolio', 'my-nextjs-portfolio') AND "contentStatus" = 'PUBLISHED';
UPDATE "System" SET "liveUrl" = NULL
 WHERE "slug" = 'my-nextjs-portfolio' AND "liveUrl" = 'https://ksdrill-portfolio.vercel.app';
