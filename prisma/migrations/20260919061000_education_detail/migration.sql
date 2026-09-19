-- F1.6b (#70): education gets what it needs to stand as evidence: field of
-- study, a description, a certificate link, the admin's show/hide state, and
-- the skills it taught. Additive only (EXT-1). Existing entries stay published.
-- AlterTable
ALTER TABLE "Education" ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "contentStatus" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fieldOfStudy" TEXT;

-- CreateTable
CREATE TABLE "SkillOnEducation" (
    "skillId" TEXT NOT NULL,
    "educationId" TEXT NOT NULL,

    CONSTRAINT "SkillOnEducation_pkey" PRIMARY KEY ("skillId","educationId")
);

-- CreateIndex
CREATE INDEX "SkillOnEducation_educationId_idx" ON "SkillOnEducation"("educationId");

-- CreateIndex
CREATE INDEX "Education_contentStatus_startDate_idx" ON "Education"("contentStatus", "startDate");

-- AddForeignKey
ALTER TABLE "SkillOnEducation" ADD CONSTRAINT "SkillOnEducation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillOnEducation" ADD CONSTRAINT "SkillOnEducation_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "Education"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Hand-written rules
-- ============================================================

-- Proof links are https only, like achievements and profile links.
ALTER TABLE "Education" ADD CONSTRAINT "Education_certificateUrl_format"
  CHECK ("certificateUrl" ~ '^https://');
ALTER TABLE "Education" ADD CONSTRAINT "Education_required_present"
  CHECK (char_length(btrim(institution)) > 0 AND char_length(btrim(qualification)) > 0);

-- Skill evidence now counts published study too (hidden education proves
-- nothing publicly). New columns go last, so the view is replaced in place.
CREATE OR REPLACE VIEW "SkillEvidence" AS
SELECT sk.id AS "skillId",
       sk.name,
       sc.key AS "categoryKey",
       coalesce(sys.slugs, ARRAY[]::text[]) AS "systemSlugs",
       coalesce(cardinality(sys.slugs), 0) AS "systemCount",
       coalesce(roles.n, 0) AS "roleCount",
       roles.first_used AS "firstUsed",
       roles.last_ended AS "lastEnded",
       coalesce(roles.current, false) AS "inCurrentRole",
       coalesce(study.n, 0) AS "studyCount"
  FROM "Skill" sk
  JOIN "SkillCategory" sc ON sc.id = sk."categoryId"
  LEFT JOIN LATERAL (
    SELECT array_agg(s.slug ORDER BY s.slug) AS slugs
      FROM "SkillOnSystem" ss JOIN "System" s ON s.id = ss."systemId"
     WHERE ss."skillId" = sk.id AND s."contentStatus" = 'PUBLISHED'
  ) sys ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n,
           min(e."startDate") AS first_used,
           max(e."endDate") AS last_ended,
           bool_or(e."endDate" IS NULL) AS current
      FROM "SkillOnExperience" se JOIN "Experience" e ON e.id = se."experienceId"
     WHERE se."skillId" = sk.id
  ) roles ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n
      FROM "SkillOnEducation" sed JOIN "Education" ed ON ed.id = sed."educationId"
     WHERE sed."skillId" = sk.id AND ed."contentStatus" = 'PUBLISHED'
  ) study ON true;
