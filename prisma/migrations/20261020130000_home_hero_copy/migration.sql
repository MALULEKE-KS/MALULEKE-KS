-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md, D-030): the home hero's interface
-- wording as owner-edited content (Admin -> Page content -> "Home — hero"), so no
-- label lives in a component. The seeded wording is the hero's shipped wording;
-- the owner can change any of it without a deploy. Only fills a block that has
-- not been given wording yet. Additive only.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object(
  'primaryLabel', 'See the work',
  'secondaryLabel', 'Ask the guide',
  'liveLabel', 'Live · build {commit}',
  'localLabel', 'Local development build',
  'ledgerAria', 'The record, live',
  'ledgerLabels', jsonb_build_object(
    'systems', jsonb_build_object('one', 'system published', 'many', 'systems published'),
    'rules', jsonb_build_object('one', 'rule the database enforces', 'many', 'rules the database enforces'),
    'audited', jsonb_build_object('one', 'change audited this week', 'many', 'changes audited this week'),
    'organisations', jsonb_build_object('one', 'organisation founded', 'many', 'organisations founded')
  )
)
WHERE "key" = 'home-hero' AND NOT ("body" ? 'primaryLabel');
