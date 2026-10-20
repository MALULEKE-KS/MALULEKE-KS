-- Sprint 1b (D-040): the flag "home.hero_v2" served its purpose and was retired when the
-- rebuilt hero became the only hero (D-038, migration 20261020190000 set it on and
-- described it as retired). Nothing reads it; the owner has asked for the row to go so
-- Admin -> Settings -> Flags shows only switches that do something.

-- migration-guard: allow delete the retired flag row home.hero_v2 — approved by the owner in chat 2026-10-20 (D-040, #225)
DELETE FROM "Flag" WHERE "key" = 'home.hero_v2';
