-- F5c (docs/PUBLIC-REDESIGN-PLAN.md §6): the systems seeded before the GitHub
-- sync ran don't match their real repositories (owner, 2026-09-30: "check the
-- system names against the real ones and fix everything"). Link each to its
-- repository so the sync updates it instead of creating a duplicate — the sync
-- attaches an unlinked system by githubFullName (lib/jobs/github-sync.ts) —
-- and correct what GitHub says is wrong:
--   * "Xkimm Xa Mali" is Xkimi Xa Mali (KSDRILL-SA/Xkimi-Xa-Mali). The address
--     changes with the name; the old one keeps redirecting (BR-1.14, the slug
--     history trigger records it).
--   * FundsLink Academy lives in KSDRILL-SA, not GrowthCore Solutions, and its
--     repository is private (BR-1.7).
--   * The Sunduza system is GrowthCore-Solutions/sunduza-architectural. Its
--     display name and client-disclosure settings are the owner's call (BR-1.4)
--     and are left as they are.
--   * The personal GitHub home is named for its account, MALULEKE-KS.
-- Each statement only touches a row still in its seeded state, so an edit the
-- admin already made is never overwritten, and re-running changes nothing.

UPDATE "System"
SET "name" = 'Xkimi Xa Mali',
    "slug" = 'xkimi-xa-mali',
    "githubFullName" = 'KSDRILL-SA/Xkimi-Xa-Mali',
    "liveUrl" = COALESCE("liveUrl", 'https://xkimixamali.co.za')
WHERE "slug" = 'xkimm-xa-mali' AND "name" = 'Xkimm Xa Mali' AND "githubFullName" IS NULL;

UPDATE "System"
SET "githubFullName" = 'GrowthCore-Solutions/sunduza-architectural',
    "liveUrl" = COALESCE("liveUrl", 'https://sunduza-architectural.vercel.app')
WHERE "slug" = 'sunduza-case-study' AND "githubFullName" IS NULL;

UPDATE "System"
SET "name" = 'FundsLink Academy',
    "githubFullName" = 'KSDRILL-SA/fundslink-Academy',
    "repoPrivate" = true,
    "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ksdrill-sa')
WHERE "slug" = 'fundslink-academy' AND "name" = 'FundsLink-Academy' AND "githubFullName" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "slug" = 'ksdrill-sa');

UPDATE "Organization"
SET "name" = 'MALULEKE-KS'
WHERE "slug" = 'personal' AND "name" = 'Personal';
