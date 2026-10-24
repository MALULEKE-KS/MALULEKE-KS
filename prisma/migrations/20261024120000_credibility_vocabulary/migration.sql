-- D-061, the credibility pass (owner, 2026-10-24: the plan's Phase 1 and the hero's lead
-- role; answers "use this mapping", "those three flagships", "Software Engineer").
-- Data only, and only where the shipped value is still there: anything the owner has
-- changed in Admin stays. Additive only.

-- One status vocabulary: Live, Live · paused, In progress, Coursework, Archived.
UPDATE "Status" SET "label" = 'Live' WHERE "key" = 'finished' AND "label" = 'Finished';
UPDATE "Status" SET "label" = 'In progress' WHERE "key" = 'in_progress' AND "label" = 'In Progress';
INSERT INTO "Status" ("id", "key", "label", "colorToken", "stage") VALUES
  (gen_random_uuid()::text, 'live_paused', 'Live · paused', 'signal-planned', 'SHIPPED'),
  (gen_random_uuid()::text, 'coursework', 'Coursework', 'signal-planned', 'QUEUED'),
  (gen_random_uuid()::text, 'archived', 'Archived', 'signal-planned', 'QUEUED')
ON CONFLICT ("key") DO NOTHING;
-- "On GitHub" retires from the public vocabulary (BR-8.2: deprecated, never deleted). The sync
-- still files new repos under it as drafts; the owner gives each its status when curating.
UPDATE "Status" SET "active" = false WHERE "key" = 'on_github';

-- Each published system's status, by the owner's mapping — only while it still has the status it had.
UPDATE "System" s SET "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'finished')
  WHERE s."slug" IN ('sunduza-architectural', 'maluleke-ks') AND s."statusId" IN (SELECT "id" FROM "Status" WHERE "key" IN ('finished', 'on_github'));
UPDATE "System" s SET "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'live_paused')
  WHERE s."slug" = 'xkimi-xa-mali' AND s."statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'finished');
UPDATE "System" s SET "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'coursework')
  WHERE s."slug" IN ('tshimo-agri-network', 'graph-search-engine', 'machine-learning-project', 'ai-chatbot-evolution-comparison', 'logistics-route-optimizer', 'network-clustering-analytics')
    AND s."statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'on_github');

-- Three flagships: MALULEKE-KS joins Xkimi Xa Mali and Sunduza.
UPDATE "System" SET "isFlagship" = true WHERE "slug" = 'maluleke-ks' AND "isFlagship" = false;

-- Governova is developer tooling and governance, not AI/ML.
INSERT INTO "Domain" ("id", "key", "label") VALUES (gen_random_uuid()::text, 'developer-tooling', 'Developer tooling / Governance')
ON CONFLICT ("key") DO NOTHING;
UPDATE "System" SET "domainId" = (SELECT "id" FROM "Domain" WHERE "key" = 'developer-tooling')
  WHERE "slug" = 'governova' AND "domainId" IN (SELECT "id" FROM "Domain" WHERE "label" ILIKE 'AI%');

-- The lead role: Software Engineer, with AI as the supporting line.
UPDATE "ProfileTitle" SET "label" = 'Software Engineer' WHERE "label" = 'Software & AI Engineer';
UPDATE "SiteContent" SET "body" = "body" || jsonb_build_object('statement', 'Full-stack systems, with AI where it earns its place.')
  WHERE "key" = 'home-hero' AND "body"->>'statement' IN (
    'Full-stack systems that enforce their own rules, in production, with the proof one click away.',
    'I design and ship full-stack systems that run in production, enforce their own rules and show their proof.'
  );
UPDATE "Profile" SET "headline" = 'Software Engineer' WHERE "headline" = 'Software & AI Engineer';
