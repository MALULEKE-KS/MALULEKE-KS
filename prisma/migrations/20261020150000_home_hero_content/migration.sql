-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md, D-030, D-034): the home hero's
-- content, improved at the owner's request ("think of a better hero content").
-- Additive data only, on the owner-edited "home-hero" block (Admin -> Page
-- content -> "Home — hero"); the owner can change any of it without a deploy.
--
--   * The statement says what is true of the work, with no figure in it (a number in
--     a sentence goes stale; the record under it is computed). It replaces the
--     first wording ("Full-stack systems that enforce their own rules, in
--     production, with the proof one click away.").
--   * "Building now" — the line before the repository being worked on right now.
--   * The record gains "systems shipped to production"; the unused organisations
--     label is dropped from the block.
--
-- Only touches a block that has not been given the shipped-systems label yet.

UPDATE "SiteContent"
SET "body" = jsonb_set(
    "body" || jsonb_build_object(
      'statement', 'I design and ship full-stack systems that run in production, enforce their own rules and show their proof.',
      'nowLabel', 'Building now'
    ),
    '{ledgerLabels}',
    (COALESCE("body" -> 'ledgerLabels', '{}'::jsonb) - 'organisations')
      || jsonb_build_object('shipped', jsonb_build_object('one', 'system shipped to production', 'many', 'systems shipped to production'))
  )
WHERE "key" = 'home-hero' AND NOT (COALESCE("body" -> 'ledgerLabels', '{}'::jsonb) ? 'shipped');
