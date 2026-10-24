-- D-069, the owner's approval (2026-10-24: "i approve all"): the home hero's Orbit — every
-- published system around the platform's core, one ring per home, its last 26 weeks of commits
-- replayed as sparks. Its words in Admin -> Page content -> Home ("Home — the Orbit"); its flag on
-- (the owner chose it to replace the cover photo; off brings the photo back). Existing rows are
-- kept. Additive only.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('home-orbit', jsonb_build_object(
    'ariaLabel', 'Orbit: {systems} published systems around the platform''s core, one ring per home, each sized by its commits over the last 26 weeks — {commits} commits, each replayed as a spark.',
    'statsLine', '{systems} systems · {homes} homes · {commits} commits in 26 weeks',
    'hint', 'drag to turn, choose a system',
    'legendFlagship', 'Flagship',
    'legendSystem', 'System',
    'legendActive', 'Active, last 6 weeks',
    'legendSpark', 'Spark = one commit',
    'ignitingLine', 'Igniting…',
    'weekLine', 'Week of {week} · {commits} commits',
    'busiestLine', 'Week of {week} · {system} · {commits} commits, its busiest week',
    'restLine', '26 weeks · each spark a real commit',
    'replayLabel', 'Replay the 26 weeks',
    'weekButton', 'Week of {week}: {commits} commits. Replay from here.',
    'nowLabel', 'now',
    'flagshipLabel', 'Flagship',
    'activeNote', 'committed to lately',
    'commitsLabel', 'commits · 26 weeks',
    'openLabel', 'Open the case study',
    'prevLabel', 'Previous',
    'nextLabel', 'Next',
    'closeLabel', 'Close',
    'exploreLabel', 'Explore the systems in orbit',
    'exploreHint', 'Tap a world, or step through them one by one.',
    'phoneEyebrow', 'The work, live',
    'phoneHint', 'Tap a world'
  ))
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'home.orbit', true, 'The home hero''s Orbit (D-069). Off = the cover photo behind the hero (HeroBackdrop).')
ON CONFLICT ("key") DO NOTHING;
