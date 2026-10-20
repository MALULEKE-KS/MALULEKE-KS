-- Sprint 1 follow-up (docs/improvements/DECISIONS.md D-039): the hero's two lines
-- above the name say only what is true.
--   * The live line carries the real date again, as the previous hero did
--     ("Live, as of 20 Oct 2026"); {date} is today's date in the site's time zone
--     (the setting site.timeZone).
--   * "Building now" was drawn from GitHub's last-push time, which moves for pushes
--     that are not work; the line is now the repo with the latest real commit and
--     is worded for what it is — "Latest commit".
-- Each field is changed only while it still holds the wording first shipped, so an
-- edit the owner has made in Admin -> Page content is never overwritten.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('liveLabel', 'Live, as of {date}')
WHERE "key" = 'home-hero' AND "body"->>'liveLabel' = 'Live · build {commit}';

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('previewLabel', 'Preview, as of {date} · build {commit}')
WHERE "key" = 'home-hero' AND "body"->>'previewLabel' = 'Preview build {commit}';

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('nowLabel', 'Latest commit')
WHERE "key" = 'home-hero' AND "body"->>'nowLabel' = 'Building now';
