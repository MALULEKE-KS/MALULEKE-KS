-- AI guide phase 2, P2-2 (docs/AI-GUIDE-PHASE2-PLAN.md §3 A3): the instant lane.
-- Questions that are pure site data (how to contact him, the CV, how many systems,
-- the platform's live numbers) are answered from the data with no model: no wait,
-- no spend, nothing to hallucinate, and they still work while every model is busy.
--   - a Flag (BR-4.4) — Admin -> Flags switches the whole lane off;
--   - a content block, "guide-instant", holding the wording of each reply. It is
--     filled in with live figures ({reviewSlaHours}, {email}, {systems}, ...) and is
--     the owner's to edit in Admin -> Page content. An existing row is kept.
-- Additive only.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'concierge.instant_lane', true, 'AI guide: answer questions that are pure site data (contact, CV, system counts, platform numbers) straight from the data, with no model (read-only)')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('guide-instant', jsonb_build_object(
    'contact', '{owner} can be reached through the contact form at /contact — no account needed. Every message is reviewed within {reviewSlaHours} hours, and you get a reference straight away.',
    'contactEmail', '{owner} can be reached through the contact form at /contact — no account needed. Every message is reviewed within {reviewSlaHours} hours, and you get a reference straight away. His public email is {email}.',
    'cv', '{owner}''s CV is on the CV page, /cv — available as {cvOptions}.',
    'cvNone', 'No CV is published on the site right now. The contact form at /contact is the way to ask.',
    'counts', '{owner} has {systems} published on this site — {breakdown}. {privateNote} The full list is at /systems.',
    'pulse', 'This platform enforces {rules} business rules in its database. {audited7} changes were audited in the last 7 days, {auditedTotal} in all.'
  ))
ON CONFLICT ("key") DO NOTHING;
