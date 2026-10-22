-- Sprint 2, the AI guide band (D-044): the owner approved a two-line introduction in his
-- own voice ("use it", 2026-10-22) in place of the five-line one. Changed only while the
-- band still holds the first-shipped wording, so an edit the owner has made in
-- Admin -> Page content is never overwritten.

UPDATE "SiteContent"
SET "body" = "body" || jsonb_build_object('lede', 'Ask what I''ve built, how this platform works, or whether I''m a fit for your team. It answers only from this site''s live data — and shows you where every answer came from.')
WHERE "key" = 'ai-guide'
  AND "body"->>'lede' = 'It knows my systems, my journey and how I build — and it''s built the way I build: every answer grounded in this site''s live data, sources cited, guard-railed end to end. Ask about my work, or just test how it thinks.';
