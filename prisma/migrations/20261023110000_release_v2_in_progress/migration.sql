-- V2 is under way (owner, 2026-10-22: "where it's still saying v1 that v2 in progress";
-- approved again with the home page's plan, D-047). The status line at the foot of every
-- page said "V1 · V2 on the way". Changed only while the block still holds that first
-- wording, so anything the owner has written in Admin -> Page content -> "Release" stays.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('current', 'V2 in progress', 'next', '', 'nextNote', '')
WHERE "key" = 'release'
  AND "body"->>'current' = 'V1'
  AND "body"->>'next' = 'V2'
  AND "body"->>'nextNote' = 'on the way';
