-- AI guide phase 2, P2-6 (docs/AI-GUIDE-PHASE2-PLAN.md §7): guided tours.
-- The guide can walk a visitor through the site — open a page, light up a section,
-- say one line. A flag (BR-4.4, shipped OFF) and the owner's tours as a content block,
-- "guide-tours" (Admin -> Page content). The starter tours only describe what each page
-- of this site IS, which its structure already says; the owner rewrites them in their
-- own words. The model never writes a stop: it only picks which tour. An existing block
-- is kept. Additive only.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'agent.tour', false, 'AI guide: start one of the owner''s guided tours — a few stops through the site, each opening a page and saying the owner''s line (read-only)')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('guide-tours', jsonb_build_object(
    'spotlightSeconds', 4,
    'tours', jsonb_build_array(
      jsonb_build_object(
        'key', 'the-evidence',
        'label', 'The evidence, in four stops',
        'summary', 'The systems, the skills and what proves them, the story, and how to get in touch.',
        'stops', jsonb_build_array(
          jsonb_build_object('path', '/systems', 'say', 'Every system, with its status and stack, read from GitHub every day.'),
          jsonb_build_object('path', '/about', 'section', 'skills', 'say', 'Each skill, with the systems that prove it.'),
          jsonb_build_object('path', '/journey', 'say', 'The story in chapters, with the milestones behind it.'),
          jsonb_build_object('path', '/contact', 'say', 'Write here; every message is reviewed and you get a reference straight away.')
        )
      )
    )
  ))
ON CONFLICT ("key") DO NOTHING;
