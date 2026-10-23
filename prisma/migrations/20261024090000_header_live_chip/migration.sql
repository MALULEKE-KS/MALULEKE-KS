-- The header's live chip (D-058, the owner's U12 and the "MALULEKE-KS Header Plan"):
-- its words join the "site-header" block (Admin -> Page content -> "Site header"), so
-- none lives in a component. Only labels the block doesn't already hold are added;
-- anything the owner has written stays. Additive only.

UPDATE "SiteContent"
SET "body" = jsonb_build_object(
    'liveLabel', 'Live',
    'previewLabel', 'Preview',
    'vitalsTitle', 'The platform, right now',
    'vitalsBuild', 'Build running',
    'vitalsSync', 'Synced with GitHub',
    'vitalsRules', 'Rules the database enforces',
    'vitalsAudited', 'Changes audited, 7 days',
    'vitalsLink', 'How it''s built'
  ) || "body"
WHERE "key" = 'site-header';
