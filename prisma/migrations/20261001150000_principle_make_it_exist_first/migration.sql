-- The owner's principle, 2026-10-01: "make it exist first … then you will make
-- it beautiful later". It leads the list — nothing can be extended, bought or
-- made safe until it exists. Content, not schema: prepended to the
-- "how-i-build" block's principles (SiteContent; editable in the admin), and
-- only if it isn't there yet, so the migration is safe to replay and never
-- overwrites the owner's own edits to the other principles.

UPDATE "SiteContent"
SET "body" = jsonb_set(
      "body",
      '{principles}',
      jsonb_build_array(jsonb_build_object(
        'name', 'Make It Exist First',
        'summary', 'Make it exist now; make it beautiful later.',
        'body', 'A working version in front of real people beats a perfect one that never ships. This platform went live first, then was redesigned page by page from what using it showed — polish is earned by existing, never a reason to wait.'
      )) || COALESCE("body"->'principles', '[]'::jsonb)
    ),
    "updatedAt" = now()
WHERE "key" = 'how-i-build'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE("body"->'principles', '[]'::jsonb)) p
    WHERE p->>'name' = 'Make It Exist First'
  );
