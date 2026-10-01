-- F5c — generated write-ups (owner, 2026-10-01: "every system description and case
-- study should be generated automatically … using their repo"). BR-4.5, replaced.
--
-- Each system remembers who wrote its description and its case study:
--   descriptionSource  sync (copied from GitHub) · generated (by the AI, from the repo) · owner
--   caseStudySource    none · generated · owner
-- and when the AI last wrote them, from which push. The law, enforced here and not
-- in application code: the owner's words are never replaced by generated ones. An
-- admin edit makes a field the owner's; a write marked generated (the transaction-
-- local app.writeup = 'generated', set only by the write-up job) is refused on a
-- field the owner wrote. Handing a field back to the AI is an explicit admin act
-- (setting its source to generated without touching the text). Clearing a case
-- study hands it back too. Fixed values, not a lookup: control states (EXT-1).

ALTER TABLE "System"
  ADD COLUMN "descriptionSource" TEXT NOT NULL DEFAULT 'sync',
  ADD COLUMN "caseStudySource" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "writeupGeneratedAt" TIMESTAMPTZ(3),
  ADD COLUMN "writeupFromPushedAt" TIMESTAMPTZ(3);

ALTER TABLE "System"
  ADD CONSTRAINT "System_descriptionSource_known" CHECK ("descriptionSource" IN ('sync', 'generated', 'owner')),
  ADD CONSTRAINT "System_caseStudySource_known" CHECK ("caseStudySource" IN ('none', 'generated', 'owner'));

-- What exists today: a written case study is the owner's; so is the description of a
-- system the owner created or has curated (not one copied by the sync and never touched).
UPDATE "System" SET "caseStudySource" = 'owner' WHERE btrim(coalesce("caseStudyBody", '')) <> '';
UPDATE "System" SET "descriptionSource" = 'owner' WHERE "githubRepoId" IS NULL OR NOT "needsCuration";

CREATE FUNCTION system_writeup_source() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  generated boolean := coalesce(current_setting('app.writeup', true), '') = 'generated';
  by_admin boolean := coalesce(nullif(current_setting('app.actor_type', true), ''), 'SYSTEM') = 'ADMIN';
BEGIN
  IF NEW."description" IS DISTINCT FROM OLD."description" THEN
    IF generated THEN
      IF OLD."descriptionSource" = 'owner' THEN
        RAISE EXCEPTION 'BR-4.5: the owner''s description is never replaced by a generated one'
          USING ERRCODE = 'check_violation';
      END IF;
      NEW."descriptionSource" := 'generated';
    ELSIF by_admin THEN
      NEW."descriptionSource" := 'owner';
    END IF;
  END IF;

  IF NEW."caseStudyBody" IS DISTINCT FROM OLD."caseStudyBody" THEN
    IF generated THEN
      IF OLD."caseStudySource" = 'owner' THEN
        RAISE EXCEPTION 'BR-4.5: the owner''s case study is never replaced by a generated one'
          USING ERRCODE = 'check_violation';
      END IF;
      NEW."caseStudySource" := 'generated';
    ELSIF by_admin THEN
      -- Clearing it hands it back to the AI; writing it makes it the owner's.
      NEW."caseStudySource" := CASE WHEN btrim(coalesce(NEW."caseStudyBody", '')) = '' THEN 'none' ELSE 'owner' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER system_writeup_source
  BEFORE UPDATE ON "System"
  FOR EACH ROW EXECUTE FUNCTION system_writeup_source();

-- Visitors see who wrote it: an AI-written case study is labelled (BR-4.2's spirit — AI is always labelled).
CREATE OR REPLACE VIEW "PublicSystem" AS
SELECT s.id,
    s.name,
    s.slug,
        CASE
            WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved") THEN o.name
            ELSE public_client_label(d.label)
        END AS organization,
        CASE
            WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved") THEN o.slug
            ELSE NULL::text
        END AS "organizationSlug",
    st.key AS "statusKey",
    st.label AS status,
    st."colorToken" AS "statusColorToken",
    lower(st.stage::text) AS stage,
    d.key AS "domainKey",
    d.label AS domain,
    s.description,
        CASE
            WHEN s."clientVisibility" = 'NDA_RESTRICTED'::"ClientVisibility" OR s."repoPrivate" THEN NULL::text
            ELSE s."repoUrl"
        END AS "repoUrl",
        CASE
            WHEN s."clientVisibility" = 'NDA_RESTRICTED'::"ClientVisibility" THEN NULL::text
            ELSE s."liveUrl"
        END AS "liveUrl",
        CASE
            WHEN s."clientVisibility" = 'NDA_RESTRICTED'::"ClientVisibility" THEN NULL::text
            ELSE s."screenshotUrl"
        END AS "screenshotUrl",
    COALESCE(s."techStack", ARRAY[]::text[]) AS "techStack",
    s."isFlagship",
    s."repoPrivate",
    s."sortOrder",
    s."featuredOnHome",
    s."homeOrder",
    COALESCE(s."caseStudyBody", ''::text) AS "caseStudyBody",
    s."githubPushedAt",
    s."updatedAt",
    s."onCv",
    s."cvOrder",
    s."descriptionSource",
    s."caseStudySource",
    s."writeupGeneratedAt"
   FROM "System" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Status" st ON st.id = s."statusId"
     LEFT JOIN "Domain" d ON d.id = s."domainId"
  WHERE is_live(s."contentStatus", s."publishAt");

-- The switch (BR-4.4: every AI capability ships off; the owner turns it on).
INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'writeups.enabled', false, 'Write each system''s description and case study from its public repo with AI (BR-4.5) — the owner''s own words are never replaced')
ON CONFLICT ("key") DO NOTHING;
