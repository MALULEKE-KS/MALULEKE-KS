-- Sprint 1b (docs/improvements/HOME-HERO-PLAN.md §19, D-040): the hero's line before
-- the system the owner says he is building (Admin -> Page content -> Home — hero ->
-- "The system you are building now"). The system itself (buildingSlug) is the owner's
-- to name; nothing is chosen for him — until he does, the line shows the latest real
-- commit ("Latest commit"). Only fills a block that has no such wording yet.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('buildingLabel', 'Building now')
WHERE "key" = 'home-hero' AND NOT ("body" ? 'buildingLabel');
