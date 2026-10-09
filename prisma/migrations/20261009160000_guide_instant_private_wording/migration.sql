-- AI guide phase 2: the instant lane's note about private repositories was a
-- sentence in code; it is the owner's wording now, like the rest of the
-- "guide-instant" block (Admin -> Page content). {privateCount} is filled in.
-- Existing wording is kept. Additive only.

UPDATE "SiteContent"
   SET "body" = "body" || jsonb_build_object(
         'privateOne', '{privateCount} of them keeps its code in a private repository.',
         'privateMany', '{privateCount} of them keep their code in private repositories.'
       )
 WHERE "key" = 'guide-instant' AND NOT ("body" ? 'privateOne');
