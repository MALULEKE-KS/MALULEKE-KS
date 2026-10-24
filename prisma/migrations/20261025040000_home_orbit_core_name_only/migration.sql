-- D-075, the owner (2026-10-25): on the Orbit's core "there should only be the icon and name, no other
-- explanations for github". The line under the name is removed where it still reads as shipped; anything the
-- owner has written stays. Additive only (a key of a content body, not a row).

UPDATE "SiteContent"
SET "body" = "body" - 'coreSub'
WHERE "key" = 'home-orbit' AND "body"->>'coreSub' = 'every commit lands here';
