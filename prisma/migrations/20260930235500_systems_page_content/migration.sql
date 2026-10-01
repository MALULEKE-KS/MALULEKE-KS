-- /systems (PAGE-BUILD-PLAYBOOK §9): the catalog's opening copy as a content
-- block the owner edits in Admin → Page content (#106), with one accent phrase
-- written *like this*. Additive; an existing row is kept.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('systems-page', jsonb_build_object(
    'heading', 'Everything I''ve built, *straight from GitHub.*',
    'lede', 'Written-up case studies alongside every repo in my three GitHub homes, refreshed daily. Filter by home, status or what it''s built with.'
  ))
ON CONFLICT ("key") DO NOTHING;
