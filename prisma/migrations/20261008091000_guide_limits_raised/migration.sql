-- The AI guide's limits, raised (owner, 2026-10-08: visitors hit the limit
-- after a few questions). The guide runs on a free gateway model, so more
-- answers cost nothing; the free models' own pace (~5 requests a minute) is
-- the real ceiling, and the fallback models absorb it. Still admin-editable
-- in Admin → Settings. Only raised, never lowered below what's set.
INSERT INTO "PlatformSetting" ("key", "value") VALUES
  ('concierge.dailyMessageCap', '500'::jsonb),
  ('concierge.rateLimit.maxPerWindow', '60'::jsonb),
  ('concierge.maxMessagesPerConversation', '40'::jsonb)
ON CONFLICT ("key") DO UPDATE
   SET "value" = EXCLUDED."value", "updatedAt" = now()
 WHERE ("PlatformSetting"."value" #>> '{}')::int < (EXCLUDED."value" #>> '{}')::int;
