-- D-059 (owner, 2026-10-24: "change of plans on the system for now turn of system hero
-- images and keep them for the future"): each case study's hero on its system's screenshot
-- (D-054) goes behind a flag, shipped off. Admin -> Settings -> Flags turns it back on with
-- no code change; the screenshots and their history are untouched. Additive only.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'systems.hero_image', false, 'Case studies: the system''s screenshot behind its hero (D-054). Off = the plain dark hero. The screenshot itself still shows in the page.')
ON CONFLICT ("key") DO NOTHING;
