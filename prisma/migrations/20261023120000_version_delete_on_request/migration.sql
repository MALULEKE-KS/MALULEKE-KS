-- BR-1.17 / BR-1.18, amended on the owner's instruction (2026-10-23, D-054): "the heroes
-- … shall be changed via admin … it must not be permanently deleted but just replaced
-- unless specified to be deleted." Replacing an image keeps the old one (it is
-- superseded, as before); an image is permanently deleted only when the owner asks for
-- that one version to be deleted — never the current one, never by truncation, and only
-- inside a transaction that has said so (the admin's explicit delete sets
-- app.version_delete = 'on' with SET LOCAL; nothing else does). A version's image is
-- still never altered. The delete is written to the activity log like every admin write.

CREATE OR REPLACE FUNCTION enforce_br_1_17_profile_photo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'BR-1.17: photo versions are never removed in bulk' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD."supersededAt" IS NULL THEN
      RAISE EXCEPTION 'BR-1.17: the current photo can''t be deleted — replace it, then delete the old version if you want it gone' USING ERRCODE = 'check_violation';
    END IF;
    IF coalesce(current_setting('app.version_delete', true), '') <> 'on' THEN
      RAISE EXCEPTION 'BR-1.17: a photo version is deleted only when the owner asks for it' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW."id", NEW."purpose", NEW."mimeType", NEW."width", NEW."height", NEW."byteSize", NEW."sha256", NEW."fileData", NEW."uploadedAt")
     IS DISTINCT FROM
     (OLD."id", OLD."purpose", OLD."mimeType", OLD."width", OLD."height", OLD."byteSize", OLD."sha256", OLD."fileData", OLD."uploadedAt") THEN
    RAISE EXCEPTION 'BR-1.17: an uploaded photo can''t be altered — upload a new version instead' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION enforce_br_1_18_screenshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'BR-1.18: screenshot versions are never removed in bulk' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD."supersededAt" IS NULL THEN
      RAISE EXCEPTION 'BR-1.18: the current screenshot can''t be deleted — replace it, then delete the old version if you want it gone' USING ERRCODE = 'check_violation';
    END IF;
    IF coalesce(current_setting('app.version_delete', true), '') <> 'on' THEN
      RAISE EXCEPTION 'BR-1.18: a screenshot version is deleted only when the owner asks for it' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW."id", NEW."systemId", NEW."source", NEW."sourceUrl", NEW."mimeType", NEW."width", NEW."height", NEW."byteSize", NEW."sha256", NEW."fileData", NEW."createdAt")
     IS DISTINCT FROM
     (OLD."id", OLD."systemId", OLD."source", OLD."sourceUrl", OLD."mimeType", OLD."width", OLD."height", OLD."byteSize", OLD."sha256", OLD."fileData", OLD."createdAt") THEN
    RAISE EXCEPTION 'BR-1.18: a screenshot can''t be altered — add a new version instead' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

-- The runtime role may now ask for a delete; the triggers above decide whether it happens.
GRANT DELETE ON "ProfilePhoto" TO platform_runtime;
GRANT DELETE ON "SystemScreenshot" TO platform_runtime;
