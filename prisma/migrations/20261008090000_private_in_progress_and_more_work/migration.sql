-- 1. FundsLink Academy and Governova went private on GitHub. The 2026-10-08
--    sync read GitHub's "not found" (which it also answers for a private repo
--    the token can't see) as "deleted" and hid both as gone. The owner: they
--    are in progress and private — shown, as private (BR-1.7: the repo is never
--    linked). The sync now tells the two apart (D-021).
UPDATE "System"
   SET "repoPrivate" = true,
       "githubGoneAt" = NULL,
       "contentStatus" = 'PUBLISHED',
       "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'in_progress')
 WHERE "githubFullName" IN ('KSDRILL-SA/fundslink-Academy', 'KSDRILL-SA/governova')
   AND EXISTS (SELECT 1 FROM "Status" WHERE "key" = 'in_progress');

-- 2. The home page's More work, as the owner chose (2026-10-08): Tshimo Agri
--    Network first, then FundsLink Academy, then Governova. A home order on a
--    system that isn't featured places it in More work; editable in Admin →
--    Systems → Home order.
UPDATE "System" s
   SET "homeOrder" = o.n
  FROM (VALUES
    ('MALULEKE-KS/tshimo-agri-network', 1),
    ('KSDRILL-SA/fundslink-Academy', 2),
    ('KSDRILL-SA/governova', 3)
  ) AS o(full_name, n)
 WHERE s."githubFullName" = o.full_name
   AND NOT s."featuredOnHome";
