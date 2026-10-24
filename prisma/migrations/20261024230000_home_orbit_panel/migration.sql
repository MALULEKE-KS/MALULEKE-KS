-- D-069, the owner's review of the live Orbit (2026-10-24): the opened system's panel says only what
-- its own page doesn't — its busiest week, its share of the commits replayed, the systems it shares its
-- stack with. Their words join the "home-orbit" block; anything the owner has written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'factBusiest', 'Busiest week',
    'busiestValue', '{week} · {commits} commits',
    'factQuiet', 'No commits in these 26 weeks',
    'factShare', 'Share of the 26 weeks',
    'shareValue', '{percent}% of {total} commits',
    'factLinked', 'Shares its stack with'
  ) || "body"
WHERE "key" = 'home-orbit';
