-- Sprint 1 release (docs/improvements/DECISIONS.md D-038): the rebuilt home hero
-- replaced the previous one on the owner's instruction — V2 replaces what it
-- rebuilds, sprint by sprint — so the switch that kept the old hero does nothing
-- any more. Migrations only add, so the row stays: on, and described as retired
-- (nothing in the code reads it), instead of a toggle that pretends to matter.

UPDATE "Flag"
SET "enabled" = true,
    "notes" = 'Retired (D-038): the rebuilt home hero is the home hero and nothing reads this flag. Safe to ignore.'
WHERE "key" = 'home.hero_v2';
