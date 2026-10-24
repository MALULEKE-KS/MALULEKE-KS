-- D-075, the owner (2026-10-25): on the Orbit's core "there should only be the icon and name, no other
-- explanations for github". The line under the name is removed where it still reads as shipped; anything the
-- owner has written stays. Additive only (a key of a content body, not a row).

UPDATE "SiteContent"
SET "body" = "body" - 'coreSub'
WHERE "key" = 'home-orbit' AND "body"->>'coreSub' = 'every commit lands here';

-- The phone hero's second action (owner, 2026-10-25: its Let's talk duplicated the header's): play the Orbit.
UPDATE "SiteContent"
SET "body" = jsonb_build_object('playLabel', 'Watch 26 weeks of work') || "body"
WHERE "key" = 'home-orbit';
