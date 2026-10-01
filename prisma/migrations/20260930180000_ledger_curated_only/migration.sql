-- F5c: the home ledger ("shipped / in progress / queued") counted every
-- non-archived system — including repositories the GitHub sync has just
-- imported and the owner hasn't looked at (profile README, notes repos, class
-- work), so a full sync read as "18 more queued". The pipeline is the
-- owner's, so it counts only systems the owner has curated: a sync-imported
-- system joins the counts once the admin has opened and saved it (BR-1.8
-- clears needsCuration). Same columns, same meaning otherwise.

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
  WHERE s."contentStatus" <> 'ARCHIVED'::"ContentStatus"
    AND NOT s."needsCuration";
