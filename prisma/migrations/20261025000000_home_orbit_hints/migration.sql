-- D-071, the owner (2026-10-24): "a bit of headings on the top of the orbit to say how to rotate and also
-- interact with it, but only on mobile; for desktop … it may distract the hero content". A heading over the
-- orbit on a phone; on a desktop a quiet hint over the orbit only, until it's used. Their words join the
-- "home-orbit" block; anything the owner has written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'touchHint', 'Swipe to turn it · two fingers to spin it any way · tap a world',
    'pointerHint', 'Drag to turn it any way · click a world · double-click to reset'
  ) || "body"
WHERE "key" = 'home-orbit';
