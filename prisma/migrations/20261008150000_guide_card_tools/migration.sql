-- The AI guide's card tools (docs/AI-GUIDE-PHASE1-PLAN.md §7): read-only,
-- server-executed — the model picks which records, the cards are read from the
-- public views. Each behind its own flag (BR-4.4); switched on at release at
-- the owner's word (2026-10-08: "for 1 yes on"). Admin → Flags turns any off.
INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'agent.show_systems', true, 'AI guide: show live system cards (status, stack, last activity) from the public data (read-only)'),
  (gen_random_uuid()::text, 'agent.show_journey', true, 'AI guide: show a span of the journey as a timeline card (read-only)'),
  (gen_random_uuid()::text, 'agent.show_skills', true, 'AI guide: show skills with the systems that prove them (read-only)'),
  (gen_random_uuid()::text, 'agent.show_pulse', true, 'AI guide: show this site''s live pulse — rules enforced by the database, audited changes (read-only)')
ON CONFLICT ("key") DO NOTHING;
