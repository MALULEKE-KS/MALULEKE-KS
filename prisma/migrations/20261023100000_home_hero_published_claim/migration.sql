-- The home page's premium pass (docs/improvements/DECISIONS.md D-047, owner-approved
-- 2026-10-23): the hero's fourth figure — the catalogue size — gets a heading like the
-- other three, so all four figures share one anatomy (claim, number, label, proof or
-- link). The owner's choice D5: "Published". Editable in Admin -> Page content ->
-- "Home — hero"; filled only where the owner has not written his own.

UPDATE "SiteContent"
SET "body" = jsonb_set("body", '{ledgerLabels,systems,claim}', to_jsonb('Published'::text), true)
WHERE "key" = 'home-hero'
  AND ("body" -> 'ledgerLabels') ? 'systems'
  AND NOT ("body" -> 'ledgerLabels' -> 'systems' ? 'claim');
