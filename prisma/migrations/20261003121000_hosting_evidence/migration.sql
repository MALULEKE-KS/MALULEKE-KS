-- Where the work is hosted (owner, 2026-10-03: "show all the hosting
-- platforms i use"). Evidence from each system's own addresses, never a list:
-- GitHub hosts every system whose source lives there; Vercel serves every
-- system whose live address is a vercel.app site (a custom domain on Vercel,
-- like Xkimi Xa Mali's, is linked by the owner in the admin, as it already is).
INSERT INTO "Skill" ("id", "name", "categoryId", "aliases")
SELECT gen_random_uuid()::text, 'GitHub', c.id, ARRAY[]::text[]
  FROM "SkillCategory" c WHERE c.key = 'infra'
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "SkillOnSystem" ("skillId", "systemId", "source")
SELECT sk.id, sy.id, 'owner'
  FROM "Skill" sk
  JOIN "System" sy ON sy."repoUrl" ILIKE 'https://github.com/%'
 WHERE sk."name" = 'GitHub'
ON CONFLICT DO NOTHING;

INSERT INTO "SkillOnSystem" ("skillId", "systemId", "source")
SELECT sk.id, sy.id, 'owner'
  FROM "Skill" sk
  JOIN "System" sy ON sy."liveUrl" ~* '^https?://[^/]+\.vercel\.app(/|$)'
 WHERE sk."name" = 'Vercel'
ON CONFLICT DO NOTHING;
