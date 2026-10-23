-- The phone's bottom dock (D-056, the owner's U12 and D2-A, 2026-10-23: "the mobile menu has
-- to be done at the highest level ... along with the header"): its wording joins the
-- "site-header" block (Admin -> Page content -> "Site header"), so no label lives in a
-- component. Only labels the block doesn't already hold are added; anything the owner has
-- written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'askLabel', 'Ask',
    'askHint', 'Ask the AI guide',
    'dockLabel', 'Quick navigation'
  ) || "body"
WHERE "key" = 'site-header';
