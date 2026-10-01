-- F5c (PUBLIC-REDESIGN-PLAN §3a): the AI guide's switches. Every tool ships
-- disabled (BR-4.4); the owner turns each on in Admin → Settings → Flags.
--   agent.open_page      — the guide opens a page and highlights a section (the tour)
--   agent.draft_inquiry  — the guide fills the contact form for the visitor to send
-- agent.submit_inquiry stays for the record but is not used: the guide never
-- submits an inquiry itself (BR-4.1 as refined 2026-09-30).
-- PublicFlag lets public pages (the platform_public role, F1.8) know which
-- switches are on — keys and on/off only, never notes.

INSERT INTO "Flag" ("id", "key", "enabled", "notes") VALUES
  (gen_random_uuid()::text, 'agent.open_page', false, 'AI guide: open a page and highlight a section for the visitor (read-only)'),
  (gen_random_uuid()::text, 'agent.draft_inquiry', false, 'AI guide: fill the contact form for the visitor to review and send (BR-4.1/4.2)')
ON CONFLICT ("key") DO NOTHING;

UPDATE "Flag" SET "notes" = 'Not used — the AI guide only drafts (agent.draft_inquiry); kept for the record'
 WHERE "key" = 'agent.submit_inquiry' AND "notes" IS NULL;

UPDATE "Flag" SET "notes" = 'The AI guide chat on the public site (PUBLIC-REDESIGN-PLAN §3a)'
 WHERE "key" = 'concierge.enabled' AND "notes" IS NULL;

CREATE VIEW "PublicFlag" AS
 SELECT "key", "enabled" FROM "Flag";

REVOKE INSERT, UPDATE, DELETE ON "PublicFlag" FROM platform_runtime;
GRANT SELECT ON "PublicFlag" TO platform_public;
