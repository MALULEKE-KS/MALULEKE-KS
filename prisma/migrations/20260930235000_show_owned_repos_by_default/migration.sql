-- BR-1.6 replaced (owner, 2026-10-01): the GitHub sync is the source of the
-- catalog — every repo in the owner's own homes is SHOWN by default and the
-- admin hides or curates what he chooses (it used to land hidden, as a draft,
-- until curated). needsCuration still flags each one as new in the admin.
-- What stays hidden until approved, whatever the default: repos in a client
-- organisation (BR-1.2 — the database refuses to publish them unapproved,
-- BR-1.1) and repos he only collaborates on (BR-1.11 — refused until the
-- repo owner's permission is recorded). Which repos are shown by default is
-- the setting github.sync.newRepoVisibility — public repos only to start
-- (the owner's choice for the live site, 2026-10-01): private repos wait in
-- the admin until he switches them on (shown as private, never linked, BR-1.7).
--
-- 1. An honest status for a repo nobody has curated yet: "On GitHub", not
--    "Planned". A lookup value (EXT-1) — the admin sets the real status when
--    curating. Its stage is QUEUED, but PublicLedger ignores uncurated rows,
--    so the homepage counts stay curated-only.
-- 2. Apply the new default to the repos already waiting in the queue.

INSERT INTO "Status" ("id", "key", "label", "colorToken", "stage")
VALUES (gen_random_uuid()::text, 'on_github', 'On GitHub', 'signal-planned', 'QUEUED')
ON CONFLICT ("key") DO NOTHING;

UPDATE "System" s
   SET "contentStatus" = 'PUBLISHED',
       "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'on_github')
  FROM "Organization" o, "RepoRelationship" r
 WHERE o."id" = s."organizationId"
   AND r."id" = s."repoRelationshipId"
   AND s."needsCuration"
   AND s."contentStatus" = 'DRAFT'
   AND s."githubFullName" IS NOT NULL
   AND s."clientVisibility" = 'PUBLIC'
   AND NOT s."repoPrivate"
   AND NOT o."isClient"
   AND r."key" = 'owner'
   AND s."statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'planned');
