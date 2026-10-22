-- Sprint 2 (docs/improvements/DECISIONS.md D-043): the home page's AI guide band,
-- rebuilt on the owner's choice "A" — the guide ready beside the owner's introduction.
-- Beside the guide, three things that make its answers worth trusting, each one
-- enforced elsewhere, never a promise:
--   * answers from this site's data only           — BR-4.3 (the guide states nothing about
--     the owner that isn't in the site's data; grounding in lib/guide)
--   * every answer lists the records it used        — Receipts (lib/guide/receipts.ts),
--     each checked against the site's index, or "none on this site"
--   * it drafts a message, never sends one           — BR-4.2
-- And the label above the example questions. The eyebrow loses its second "AI": the
-- band already shows the AI label (BR-4.3), so it read "AI AI · live on this site".
-- Each field is filled or changed only while the owner has not written his own.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object(
  'points', jsonb_build_array(
    jsonb_build_object('title', 'Answers from this site''s live data', 'text', 'Built from the published systems, the journey and the profile — nothing from outside this site, nothing made up.'),
    jsonb_build_object('title', 'Shows where every answer came from', 'text', 'Each answer lists the records it used, each one opening the real page — or says plainly that it used none.'),
    jsonb_build_object('title', 'Never acts for you', 'text', 'It can draft a message for you to read and send yourself. It never sends one.')
  )
)
WHERE "key" = 'ai-guide' AND NOT ("body" ? 'points');

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('tryLabel', 'Try asking')
WHERE "key" = 'ai-guide' AND NOT ("body" ? 'tryLabel');

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('eyebrow', 'Live on this site')
WHERE "key" = 'ai-guide' AND "body"->>'eyebrow' = 'AI · live on this site';
