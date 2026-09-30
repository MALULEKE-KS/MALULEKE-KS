-- #90: hidden experience leaked through two public views. SkillEvidence
-- counted roles (and their dates and "current role" flag) from every
-- Experience row, drafts and archived included; PublicLedger took the first
-- experience date from hidden rows too. Both now read published rows only,
-- like every other public view. Same columns, same order.

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
          WHERE ss."skillId" = sk.id AND s."contentStatus" = 'PUBLISHED'::"ContentStatus") sys ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS n,
            min(e."startDate") AS first_used,
            max(e."endDate") AS last_ended,
            bool_or(e."endDate" IS NULL) AS current
           FROM "SkillOnExperience" se
             JOIN "Experience" e ON e.id = se."experienceId"
          WHERE se."skillId" = sk.id AND e."contentStatus" = 'PUBLISHED'::"ContentStatus") roles ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS n
           FROM "SkillOnEducation" sed
             JOIN "Education" ed ON ed.id = sed."educationId"
          WHERE sed."skillId" = sk.id AND ed."contentStatus" = 'PUBLISHED'::"ContentStatus") study ON true;

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
          WHERE "Experience"."contentStatus" = 'PUBLISHED'::"ContentStatus") AS "firstExperienceAt"
   FROM "System" s
     JOIN "Status" st ON st.id = s."statusId"
  WHERE s."contentStatus" <> 'ARCHIVED'::"ContentStatus";
