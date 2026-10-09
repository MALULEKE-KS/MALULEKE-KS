-- AI guide phase 2, P2-5: the words of Fit Check's honest notes are the owner's
-- content, not code — "guide-fit", edited in Admin -> Page content. The logic
-- (a requirement for more years than he has been building is never "evidenced";
-- seniority is not met by building alone) stays in code and is tested; only the
-- wording lives here. {years} and {since} are filled in. An existing row is kept.
-- Additive only.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('guide-fit', jsonb_build_object(
    'yearsNote', 'Asks for {years}+ years — he has been building since {since}.',
    'seniorityNote', 'Asks for seniority or leadership — he is a final-year student; the site shows building, not seniority.',
    'noneNote', 'Nothing in the published data shows this yet.'
  ))
ON CONFLICT ("key") DO NOTHING;
