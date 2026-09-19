-- CV engine (#74): the data a world-class, ATS-safe CV needs — headline,
-- summary, phone, role highlights, expected graduation and coursework, which
-- projects and links the CV carries — plus the document format (PDF / DOCX)
-- and the public views the CV reads. Additive only (EXT-1).

-- AlterTable
ALTER TABLE "DocumentGen" ADD COLUMN     "completeness" JSONB,
ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'pdf';

-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "coursework" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expectedGraduation" DATE;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "contentStatus" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "headline" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "ProfileLink" ADD COLUMN     "onCv" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "System" ADD COLUMN     "cvOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onCv" BOOLEAN NOT NULL DEFAULT true;



-- ============================================================
-- Hand-written rules
-- ============================================================

-- The same CV in two formats (BR-7.1/7.2 apply to each).
ALTER TABLE "DocumentGen" ADD CONSTRAINT "DocumentGen_format_known"
  CHECK (format IN ('pdf', 'docx'));

-- A phone number is digits with the usual separators, optional leading +.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_phone_format"
  CHECK (phone ~ '^\+?[0-9][0-9 ()-]{6,19}$');

-- An expected graduation belongs to a degree still in progress.
ALTER TABLE "Education" ADD CONSTRAINT "Education_expected_only_in_progress"
  CHECK ("expectedGraduation" IS NULL OR "endDate" IS NULL);

ALTER TABLE "System" ADD CONSTRAINT "System_cvOrder_nonnegative" CHECK ("cvOrder" >= 0);
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_highlights_bounded"
  CHECK (cardinality(highlights) <= 15);

-- ============================================================
-- Public views — new columns appended; existing columns unchanged
-- ============================================================
CREATE OR REPLACE VIEW "PublicSystem" AS
SELECT s.id,
       s.name,
       s.slug,
       CASE WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")
            THEN o.name ELSE public_client_label(d.label) END AS organization,
       CASE WHEN public_name_disclosed(s."clientVisibility", s."nameDisclosureApproved")
            THEN o.slug END AS "organizationSlug",
       st.key AS "statusKey",
       st.label AS status,
       st."colorToken" AS "statusColorToken",
       lower(st.stage::text) AS stage,
       d.key AS "domainKey",
       d.label AS domain,
       s.description,
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' OR s."repoPrivate" THEN NULL ELSE s."repoUrl" END AS "repoUrl",
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' THEN NULL ELSE s."liveUrl" END AS "liveUrl",
       CASE WHEN s."clientVisibility" = 'NDA_RESTRICTED' THEN NULL ELSE s."screenshotUrl" END AS "screenshotUrl",
       coalesce(s."techStack", ARRAY[]::text[]) AS "techStack",
       s."isFlagship",
       s."repoPrivate",
       s."sortOrder",
       s."featuredOnHome",
       s."homeOrder",
       coalesce(s."caseStudyBody", '') AS "caseStudyBody",
       s."githubPushedAt",
       s."updatedAt",
       s."onCv",
       s."cvOrder"
  FROM "System" s
  JOIN "Organization" o ON o.id = s."organizationId"
  JOIN "Status" st ON st.id = s."statusId"
  LEFT JOIN "Domain" d ON d.id = s."domainId"
 WHERE s."contentStatus" = 'PUBLISHED';

CREATE OR REPLACE VIEW "PublicEducation" AS
SELECT e.id,
       e.institution,
       e.qualification,
       e."fieldOfStudy",
       e."startDate",
       e."endDate",
       e.honors,
       e.description,
       e."certificateUrl",
       coalesce((SELECT array_agg(sk.name ORDER BY sk.name)
                   FROM "SkillOnEducation" se JOIN "Skill" sk ON sk.id = se."skillId"
                  WHERE se."educationId" = e.id), ARRAY[]::text[]) AS skills,
       e."expectedGraduation",
       coalesce(e.coursework, ARRAY[]::text[]) AS coursework
  FROM "Education" e
 WHERE e."contentStatus" = 'PUBLISHED';

CREATE OR REPLACE VIEW "PublicProfile" AS
SELECT id, "displayName", initials, role, location, email, bio, availability, "buildingSinceYear",
       headline, phone, summary
  FROM "Profile";

CREATE OR REPLACE VIEW "PublicProfileLink" AS
SELECT id, kind, label, url, "sortOrder", "onCv"
  FROM "ProfileLink";

-- Only roles the admin chose to show (#74).
CREATE VIEW "PublicExperience" AS
SELECT x.id,
       x.title,
       x.organization,
       x.location,
       x."startDate",
       x."endDate",
       x.description,
       coalesce(x.highlights, ARRAY[]::text[]) AS highlights,
       coalesce((SELECT array_agg(sk.name ORDER BY sk.name)
                   FROM "SkillOnExperience" se JOIN "Skill" sk ON sk.id = se."skillId"
                  WHERE se."experienceId" = x.id), ARRAY[]::text[]) AS skills
  FROM "Experience" x
 WHERE x."contentStatus" = 'PUBLISHED';

-- Published certifications and awards; one about a system shows only while
-- that system is published (the BR-1.12 principle).
CREATE VIEW "PublicAchievement" AS
SELECT a.id, a.title, a.issuer, a."achievedOn", a.description, a.url, s.slug AS "systemSlug", a."sortOrder"
  FROM "Achievement" a
  LEFT JOIN "System" s ON s.id = a."systemId"
 WHERE a."contentStatus" = 'PUBLISHED'
   AND (a."systemId" IS NULL OR s."contentStatus" = 'PUBLISHED');

-- ============================================================
-- Data
-- ============================================================
-- The owner's headline, in their words (2026-09-19): "Software & AI Engineer".
UPDATE "Profile" SET headline = 'Software & AI Engineer' WHERE headline IS NULL;

-- A CV carries a phone number (set by the owner) rather than a WhatsApp link.
UPDATE "ProfileLink" SET "onCv" = false WHERE kind = 'whatsapp';
