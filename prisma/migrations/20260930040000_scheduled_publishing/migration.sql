-- #86 / BR-1.13: scheduled publishing for every content type (owner's
-- decision, 2026-09-30). Scheduling = publishing with a future "publishAt", so
-- every publish gate (BR-1.1 CHECK, BR-1.11 trigger, ...) is checked when the
-- schedule is set, not skipped until later. Visibility is decided by one
-- function, is_live(), inside every public view: content appears exactly at
-- its time with no cron (Vercel Hobby crons run daily at most) — public pages
-- render per request, so nothing needs revalidating either.

CREATE FUNCTION is_live(p_status "ContentStatus", p_publish_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT p_status = 'PUBLISHED' AND (p_publish_at IS NULL OR p_publish_at <= now())
$$;

-- Leaving PUBLISHED drops the schedule; setting one on unpublished content is
-- refused with the rule's own sentence (answered as a 400 by the admin API).
CREATE FUNCTION enforce_br_1_13_publish_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."contentStatus" <> 'PUBLISHED' AND NEW."publishAt" IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND NEW."publishAt" IS NOT DISTINCT FROM OLD."publishAt" THEN
      NEW."publishAt" := NULL;
    ELSE
      RAISE EXCEPTION 'BR-1.13: a publish time schedules publication — set the content to published to schedule it'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE "System" ADD COLUMN "publishAt" timestamptz(3);
ALTER TABLE "System" ADD CONSTRAINT "System_br_1_13_publish_at_requires_published"
  CHECK ("publishAt" IS NULL OR "contentStatus" = 'PUBLISHED');
CREATE TRIGGER "System_br_1_13_publish_at" BEFORE INSERT OR UPDATE ON "System"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_13_publish_at();

ALTER TABLE "Timeline" ADD COLUMN "publishAt" timestamptz(3);
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_br_1_13_publish_at_requires_published"
  CHECK ("publishAt" IS NULL OR "contentStatus" = 'PUBLISHED');
CREATE TRIGGER "Timeline_br_1_13_publish_at" BEFORE INSERT OR UPDATE ON "Timeline"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_13_publish_at();

ALTER TABLE "Achievement" ADD COLUMN "publishAt" timestamptz(3);
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_br_1_13_publish_at_requires_published"
  CHECK ("publishAt" IS NULL OR "contentStatus" = 'PUBLISHED');
CREATE TRIGGER "Achievement_br_1_13_publish_at" BEFORE INSERT OR UPDATE ON "Achievement"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_13_publish_at();

ALTER TABLE "Experience" ADD COLUMN "publishAt" timestamptz(3);
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_br_1_13_publish_at_requires_published"
  CHECK ("publishAt" IS NULL OR "contentStatus" = 'PUBLISHED');
CREATE TRIGGER "Experience_br_1_13_publish_at" BEFORE INSERT OR UPDATE ON "Experience"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_13_publish_at();

ALTER TABLE "Education" ADD COLUMN "publishAt" timestamptz(3);
ALTER TABLE "Education" ADD CONSTRAINT "Education_br_1_13_publish_at_requires_published"
  CHECK ("publishAt" IS NULL OR "contentStatus" = 'PUBLISHED');
CREATE TRIGGER "Education_br_1_13_publish_at" BEFORE INSERT OR UPDATE ON "Education"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_13_publish_at();

-- Every public view: "published" becomes "published and its time has come".
-- Same columns, same order; only the visibility test changes.

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
    s."cvOrder"
   FROM "System" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Status" st ON st.id = s."statusId"
     LEFT JOIN "Domain" d ON d.id = s."domainId"
  WHERE is_live(s."contentStatus", s."publishAt");

CREATE OR REPLACE VIEW "PublicImpact" AS
SELECT i.id,
    i."systemId",
    i.label,
    i.value,
    i."sortOrder"
   FROM "Impact" i
     JOIN "System" s ON s.id = i."systemId"
  WHERE is_live(s."contentStatus", s."publishAt");

CREATE OR REPLACE VIEW "PublicTestimonial" AS
SELECT t.id,
    t."systemId",
    t."authorName",
    t."authorRole",
        CASE
            WHEN s.id IS NULL OR public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved") THEN t.organization
            ELSE NULL::text
        END AS organization,
    t.quote,
    t."createdAt"
   FROM "Testimonial" t
     LEFT JOIN "System" s ON s.id = t."systemId"
  WHERE t."hasPermission" AND (t."systemId" IS NULL OR is_live(s."contentStatus", s."publishAt"));

CREATE OR REPLACE VIEW "PublicTimeline" AS
SELECT t.id,
    mt.key AS "milestoneType",
    mt.label AS "milestoneTypeLabel",
    t.title,
    t.description,
    t.date,
    COALESCE(t.tags, ARRAY[]::text[]) AS tags,
    t."autoDrafted",
    t."systemId",
    s.slug AS "systemSlug"
   FROM "Timeline" t
     JOIN "MilestoneType" mt ON mt.id = t."milestoneTypeId"
     LEFT JOIN "System" s ON s.id = t."systemId"
  WHERE is_live(t."contentStatus", t."publishAt") AND (t."systemId" IS NULL OR is_live(s."contentStatus", s."publishAt"));

CREATE OR REPLACE VIEW "PublicEducation" AS
SELECT id,
    institution,
    qualification,
    "fieldOfStudy",
    "startDate",
    "endDate",
    honors,
    description,
    "certificateUrl",
    COALESCE(( SELECT array_agg(sk.name ORDER BY sk.name) AS array_agg
           FROM "SkillOnEducation" se
             JOIN "Skill" sk ON sk.id = se."skillId"
          WHERE se."educationId" = e.id), ARRAY[]::text[]) AS skills,
    "expectedGraduation",
    COALESCE(coursework, ARRAY[]::text[]) AS coursework
   FROM "Education" e
  WHERE is_live("contentStatus", "publishAt");

CREATE OR REPLACE VIEW "PublicOrganization" AS
SELECT id,
    name,
    slug
   FROM "Organization" o
  WHERE (EXISTS ( SELECT 1
           FROM "System" s
          WHERE s."organizationId" = o.id AND is_live(s."contentStatus", s."publishAt") AND public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")));

CREATE OR REPLACE VIEW "PublicExperience" AS
SELECT id,
    title,
    organization,
    location,
    "startDate",
    "endDate",
    description,
    COALESCE(highlights, ARRAY[]::text[]) AS highlights,
    COALESCE(( SELECT array_agg(sk.name ORDER BY sk.name) AS array_agg
           FROM "SkillOnExperience" se
             JOIN "Skill" sk ON sk.id = se."skillId"
          WHERE se."experienceId" = x.id), ARRAY[]::text[]) AS skills
   FROM "Experience" x
  WHERE is_live("contentStatus", "publishAt");

CREATE OR REPLACE VIEW "PublicAchievement" AS
SELECT a.id,
    a.title,
    a.issuer,
    a."achievedOn",
    a.description,
    a.url,
    s.slug AS "systemSlug",
    a."sortOrder"
   FROM "Achievement" a
     LEFT JOIN "System" s ON s.id = a."systemId"
  WHERE is_live(a."contentStatus", a."publishAt") AND (a."systemId" IS NULL OR is_live(s."contentStatus", s."publishAt"));

CREATE OR REPLACE VIEW "SkillEvidence" AS
SELECT sk.id AS "skillId",
    sk.name,
    sc.key AS "categoryKey",
    COALESCE(sys.slugs, ARRAY[]::text[]) AS "systemSlugs",
    COALESCE(cardinality(sys.slugs), 0) AS "systemCount",
    COALESCE(roles.n, 0) AS "roleCount",
    roles.first_used AS "firstUsed",
    roles.last_ended AS "lastEnded",
    COALESCE(roles.current, false) AS "inCurrentRole",
    COALESCE(study.n, 0) AS "studyCount"
   FROM "Skill" sk
     JOIN "SkillCategory" sc ON sc.id = sk."categoryId"
     LEFT JOIN LATERAL ( SELECT array_agg(s.slug ORDER BY s.slug) AS slugs
           FROM "SkillOnSystem" ss
             JOIN "System" s ON s.id = ss."systemId"
          WHERE ss."skillId" = sk.id AND is_live(s."contentStatus", s."publishAt")) sys ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS n,
            min(e."startDate") AS first_used,
            max(e."endDate") AS last_ended,
            bool_or(e."endDate" IS NULL) AS current
           FROM "SkillOnExperience" se
             JOIN "Experience" e ON e.id = se."experienceId"
          WHERE se."skillId" = sk.id AND is_live(e."contentStatus", e."publishAt")) roles ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS n
           FROM "SkillOnEducation" sed
             JOIN "Education" ed ON ed.id = sed."educationId"
          WHERE sed."skillId" = sk.id AND is_live(ed."contentStatus", ed."publishAt")) study ON true;

CREATE OR REPLACE VIEW "PublicLedger" AS
SELECT 1 AS id,
    count(*) FILTER (WHERE st.stage = 'SHIPPED'::"PipelineStage")::integer AS "systemsShipped",
    count(*) FILTER (WHERE st.stage = 'BUILDING'::"PipelineStage")::integer AS "systemsBuilding",
    count(*) FILTER (WHERE st.stage = 'QUEUED'::"PipelineStage")::integer AS "systemsQueued",
    ( SELECT count(*)::integer AS count
           FROM "Organization"
          WHERE "Organization".role IS NOT NULL) AS "organizationsFounded",
    ( SELECT min("Experience"."startDate") AS min
           FROM "Experience"
          WHERE is_live("Experience"."contentStatus", "Experience"."publishAt")) AS "firstExperienceAt"
   FROM "System" s
     JOIN "Status" st ON st.id = s."statusId"
  WHERE s."contentStatus" <> 'ARCHIVED'::"ContentStatus";
