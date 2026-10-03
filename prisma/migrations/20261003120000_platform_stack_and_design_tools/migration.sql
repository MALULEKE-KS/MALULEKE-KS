-- The whole stack (owner, 2026-10-03: "include all the skills and techs and
-- stack that i use, even all i used for this system, the ui/ux tech —
-- magic ui, 21st dev, figma and everything"). Data, not schema: every row is
-- editable in the admin.
--
-- Two kinds of evidence, as before:
--   * a package alias — the daily GitHub sync proves the skill wherever a
--     repo's manifests name it (source 'manifest'), this platform included;
--   * the owner's word — tools with no package to point at (Figma, Magic UI,
--     21st.dev, the hosting he runs on) are linked to this platform with
--     source 'owner', exactly as an admin link would be. Each is visible in
--     the repo itself: the vendored components and their register
--     (components/ui/README.md, PUBLIC-REDESIGN-PLAN §7a), CLAUDE.md's design
--     workflow, docs/DEPLOYMENT.md, .github/workflows.

-- A category for the design tools (SkillCategory is a lookup — EXT-1).
INSERT INTO "SkillCategory" ("id", "key", "label")
VALUES (gen_random_uuid()::text, 'design', 'Design & UI')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Skill" ("id", "name", "categoryId", "aliases")
SELECT gen_random_uuid()::text, s.name, c.id, s.aliases
  FROM (VALUES
    -- Proved by a package name.
    ('Motion', 'frontend', ARRAY['motion', 'framer-motion']),
    ('Radix UI', 'frontend', ARRAY['radix-ui', '@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-tooltip']),
    ('Vercel AI SDK', 'ai-ml', ARRAY['ai', '@ai-sdk/react']),
    ('Sharp', 'backend', ARRAY['sharp']),
    ('React PDF', 'backend', ARRAY['@react-pdf/renderer']),
    ('axe (accessibility)', 'testing', ARRAY['@axe-core/playwright', 'axe-core']),
    ('ESLint', 'testing', ARRAY['eslint']),
    ('Lucide', 'design', ARRAY['lucide-react', 'lucide']),
    -- The owner's tools, no package to point at.
    ('Figma', 'design', ARRAY[]::text[]),
    ('Magic UI', 'design', ARRAY[]::text[]),
    ('21st.dev', 'design', ARRAY[]::text[]),
    ('Neon', 'database', ARRAY['@neondatabase/serverless']),
    ('Vercel AI Gateway', 'ai-ml', ARRAY[]::text[])
  ) AS s(name, category_key, aliases)
  JOIN "SkillCategory" c ON c.key = s.category_key
ON CONFLICT ("name") DO NOTHING;

-- shadcn/ui is a design system as much as a library: it sits with the design
-- tools (its alias still proves it from package.json).
UPDATE "Skill" SET "categoryId" = (SELECT id FROM "SkillCategory" WHERE key = 'design')
 WHERE "name" = 'shadcn/ui';

-- The owner's word: what this platform was built with that no manifest shows.
INSERT INTO "SkillOnSystem" ("skillId", "systemId", "source")
SELECT sk.id, sy.id, 'owner'
  FROM "Skill" sk
  JOIN "System" sy ON sy."slug" = 'maluleke-ks'
 WHERE sk."name" IN ('Figma', 'Magic UI', '21st.dev', 'Neon', 'Vercel AI Gateway', 'GitHub Actions', 'Node.js', 'SQL')
ON CONFLICT DO NOTHING;
