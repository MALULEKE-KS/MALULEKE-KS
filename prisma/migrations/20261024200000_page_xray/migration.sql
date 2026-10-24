-- D-067, the owner's request (2026-10-24: "something unique and outstanding" where the record
-- used to be in the home hero): the page's receipt and the "See how this page works" X-ray.
-- Their words, in Admin -> Page content -> Home ("Home — the receipt and the X-ray"); the facts
-- they label come from the capability map and the enforcement register. An existing block is
-- kept. Additive only.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('page-xray', jsonb_build_object(
    'receiptLabel', 'Receipt',
    'renderedLabel', 'this copy rendered {time}',
    'firstByteLabel', 'first byte in {seconds} s',
    'edgeLabel', 'served from {region}',
    'cacheLabel', 'edge cache {cache}',
    'buildLabel', 'build {commit}',
    'rulesLabel', '{count} rules held by the database',
    'switchLabel', 'See how this page works',
    'onLabel', 'X-ray on: every section shows its wiring',
    'offLabel', 'Turn off',
    'intro', 'What this section reads, the endpoint that serves it, the rules it keeps and its source, from the same map the tests check.',
    'showsLabel', 'What it puts here',
    'readsLabel', 'Reads',
    'servedLabel', 'Served by',
    'rulesHeading', 'Rules it keeps',
    'sourceLabel', 'Source at this build',
    'statusLabels', jsonb_build_object(
      'enforced', 'Enforced',
      'partial', 'One layer so far',
      'missing', 'Not enforced yet',
      'building', 'Being built',
      'deferred', 'Deferred'
    ),
    'sectionLabels', jsonb_build_object(
      'hero', 'The hero',
      'work', 'Selected work',
      'guide', 'The AI guide',
      'principles', 'How I build',
      'map', 'How it all connects',
      'contact', 'Let''s talk'
    )
  ))
ON CONFLICT ("key") DO NOTHING;
