-- Sprint 1 (docs/improvements/HOME-HERO-PLAN.md §17, D-037): the public header's own
-- wording as owner-edited content (Admin -> Page content -> "Site header"), so no label
-- in it lives in a component. The header's Systems preview (the owner's featured systems
-- with their live status) is drawn from the public views; its size is a setting.
-- An existing block is kept. Additive only.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('site-header', jsonb_build_object(
    'contactLabel', 'Let’s talk',
    'cvLabel', 'CV',
    'homeLabel', 'MALULEKE-KS — home',
    'skipLabel', 'Skip to content',
    'menuLabel', 'Menu',
    'menuCloseLabel', 'Close the menu',
    'cvMenuLabel', 'Download my CV',
    'reviewPromise', 'Every inquiry is reviewed within {hours} hours',
    'pageHints', jsonb_build_object(
      '/', 'Where it all starts',
      '/systems', 'Everything built, straight from GitHub',
      '/journey', 'From school to now, and what''s next',
      '/about', 'The person, and how he builds',
      '/contact', 'Let''s talk — one conversation, any reason'
    ),
    'systemsPreviewLabel', 'Featured systems',
    'systemsAllLabel', 'All systems ({count})'
  ))
ON CONFLICT ("key") DO NOTHING;
