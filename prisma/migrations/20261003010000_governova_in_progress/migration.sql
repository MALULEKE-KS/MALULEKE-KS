-- Governova (owner, 2026-10-02: public, shown "in progress"). Production never
-- had a row for it: the KSDRILL-SA organisation refuses the sync's classic
-- token, so its repos were never listed (the sync now falls back to listing an
-- account's *public* repos anonymously). This creates the system as the owner
-- asked, in GitHub's own words; the next sync attaches to it by its full name
-- and fills in the facts. Only where no such system exists.
INSERT INTO "System" (
  "id", "name", "slug", "organizationId", "statusId", "description",
  "clientVisibility", "contentStatus", "githubFullName", "githubOwnerLogin",
  "repoPrivate", "repoUrl", "repoRelationshipId", "needsCuration", "updatedAt"
)
SELECT gen_random_uuid()::text,
       'Governova',
       'governova',
       o."id",
       st."id",
       '10 constitutions, 355 rules. Complete governance framework for building production-grade systems — from team process to deployment.',
       'PUBLIC',
       'PUBLISHED',
       'KSDRILL-SA/governova',
       'KSDRILL-SA',
       false,
       'https://github.com/KSDRILL-SA/governova',
       (SELECT "id" FROM "RepoRelationship" WHERE "key" = 'owner'),
       true,
       now()
  FROM "Organization" o, "Status" st
 WHERE o."slug" = 'ksdrill-sa'
   AND st."key" = 'in_progress'
   AND NOT EXISTS (
     SELECT 1 FROM "System" s
      WHERE lower(s."githubFullName") = 'ksdrill-sa/governova' OR s."slug" = 'governova'
   );
