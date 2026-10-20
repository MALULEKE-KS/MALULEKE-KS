-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md, D-030): the home hero rebuilt
-- (Direction C, chosen by the owner 2026-10-20). Additive only.
--
-- 1. The flag "home.hero_v2" ships OFF: the previous hero stays until the owner
--    switches the new one on at the sprint review (rollback = switch it off).
-- 2. The hero's one statement as owner-edited content (Admin -> Page content ->
--    "Home — hero"): the wording the owner approved on 2026-10-20. An existing
--    block is kept.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'home.hero_v2', false, 'Home: the rebuilt hero (Direction C — name, role, one statement, hero image, computed ledger). Off = the previous hero.')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('home-hero', jsonb_build_object(
    'statement', 'Full-stack systems that enforce their own rules, in production, with the proof one click away.'
  ))
ON CONFLICT ("key") DO NOTHING;
