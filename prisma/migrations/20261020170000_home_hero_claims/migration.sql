-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md §16, D-035): the home hero's record is
-- built as the proof of its statement. The statement says three things — runs in
-- production, enforces its own rules, shows its proof — and each figure on the hero
-- sits under the matching claim, in the owner's words. Additive data only, on the
-- owner-edited "home-hero" block (Admin -> Page content -> "Home — hero"); the owner can
-- rewrite any claim, or leave one out to make a figure a supporting one.
--
-- Only fills a block whose labels have no claims yet.

UPDATE "SiteContent"
SET "body" = jsonb_set(
  "body" || jsonb_build_object('previewLabel', 'Preview build {commit}'),
  '{ledgerLabels}',
  jsonb_build_object(
    'shipped', jsonb_build_object('one', 'system shipped to production', 'many', 'systems shipped to production', 'claim', 'Runs in production'),
    'rules', jsonb_build_object('one', 'rule the database enforces', 'many', 'rules the database enforces', 'claim', 'Enforces its own rules'),
    'audited', jsonb_build_object('one', 'change audited this week', 'many', 'changes audited this week', 'claim', 'Shows its proof'),
    'systems', jsonb_build_object('one', 'system published', 'many', 'systems published')
  ),
  true
)
WHERE "key" = 'home-hero'
  AND NOT ("body" -> 'ledgerLabels' -> 'shipped' ? 'claim');
