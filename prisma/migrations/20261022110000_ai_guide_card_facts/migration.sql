-- Sprint 2, the AI guide band's premium pass (D-043, owner-approved 2026-10-22): proof
-- instead of adjectives. Under the guide's name, what it reads right now — filled on
-- the server with live figures ({systems}: published systems; {synced}: when GitHub was
-- last synced) — and beside the "/" key on a desktop, what the key does. Owner wording,
-- editable in Admin -> Page content -> Home — AI guide section; filled only where the
-- owner has not written his own.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('knowsLine', 'Reads {systems} published systems · GitHub synced {synced}')
WHERE "key" = 'ai-guide' AND NOT ("body" ? 'knowsLine');

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('shortcutLabel', 'to ask from anywhere on this page')
WHERE "key" = 'ai-guide' AND NOT ("body" ? 'shortcutLabel');
