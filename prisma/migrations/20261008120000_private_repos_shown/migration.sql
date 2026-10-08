-- Every repo in the owner's GitHub homes, public and private, reaches the site
-- (owner, 2026-10-08): private ones show as private — never linked, nothing
-- read from them for the AI guide (BR-1.7) — the way FundsLink Academy and
-- Governova do. Client and collaborated work still waits for approval
-- (BR-1.2, BR-1.11). Still a setting: Admin → Settings → GitHub sync.
INSERT INTO "PlatformSetting" ("key", "value") VALUES
  ('github.sync.newRepoVisibility', '"public-and-private"'::jsonb)
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now();
