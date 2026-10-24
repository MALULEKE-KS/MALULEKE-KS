-- D-074: email addresses are stored as one spelling (trimmed, lower-case). Resend's test sender delivers only to
-- the account's own address as written: an owner alert to "Kurhula04s@gmail.com" was refused where
-- "kurhula04s@gmail.com" was delivered. Mail that is waiting or gave up gets the normalised address and a fresh
-- try; sent mail is left as it is. Additive only (no row is removed).

UPDATE "Notification"
SET "recipient" = lower(trim("recipient")), "attempts" = 0, "nextAttemptAt" = now()
WHERE "state" IN ('PENDING', 'FAILED') AND "recipient" <> lower(trim("recipient"));

-- D-074 also: on a phone one finger now turns the Orbit any way. Its heading says so, where it still reads as shipped.
UPDATE "SiteContent"
SET "body" = jsonb_set("body", '{touchHint}', '"Drag to turn it any way · pinch to zoom · tap a world"')
WHERE "key" = 'home-orbit' AND "body"->>'touchHint' = 'Swipe to turn it · two fingers to spin it any way · tap a world';
