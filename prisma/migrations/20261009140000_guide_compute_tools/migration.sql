-- AI guide phase 2, P2-5 (docs/AI-GUIDE-PHASE2-PLAN.md §5, §7): two read-only tools
-- that compute rather than recall, each behind its own flag (BR-4.4), shipped OFF.
--   compare_systems — two published systems side by side (status, stack overlap,
--                     activity), read from the public views;
--   fit_check       — a visitor's needs against the site's evidence, matched in code:
--                     evidenced / partial / not evidenced yet, never a score.
-- The owner switches them on in Admin -> Flags after seeing them.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'agent.compare_systems', false, 'AI guide: compare two published systems side by side — status, stack overlap, activity (read-only)'),
  (gen_random_uuid()::text, 'agent.fit_check', false, 'AI guide: map a visitor''s needs (e.g. a job description) against the evidence on the site — evidenced, partial or not yet, never a score (read-only)')
ON CONFLICT ("key") DO NOTHING;
