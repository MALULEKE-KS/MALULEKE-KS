-- D-073, the owner (2026-10-24): label the centre of the Orbit as his GitHub — every spark is a commit pushed
-- there, and the rings are his GitHub homes. Its words join the "home-orbit" block; anything the owner has
-- written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'coreLabel', 'GitHub',
    'coreSub', 'every commit lands here'
  ) || "body"
WHERE "key" = 'home-orbit';
