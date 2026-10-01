-- F5c: the owner confirmed (2026-09-30) that the Sunduza client may be named
-- ("yes sunduza can be named"). Record that approval — the database lifts the
-- BR-1.4 masking only on nameDisclosureApproved — and give the system its real
-- name, the one its repository uses (GrowthCore-Solutions/sunduza-architectural).
-- The old address keeps redirecting (BR-1.14). Only a row still in its seeded
-- state is touched.

UPDATE "System"
SET "name" = 'Sunduza Architectural',
    "slug" = 'sunduza-architectural',
    "nameDisclosureApproved" = true
WHERE "slug" = 'sunduza-case-study' AND "name" = 'Sunduza Case Study';
