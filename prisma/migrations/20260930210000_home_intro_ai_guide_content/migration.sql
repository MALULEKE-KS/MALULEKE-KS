-- F5c (PUBLIC-REDESIGN-PLAN §3): two page content blocks the owner edits in
-- Admin → Page content (#106 — a new block is a row, not a schema change).
--   home-intro — the home page's opening headline and introduction. The
--                owner's brief (2026-09-30): unique, understated, a good
--                first impression without rushing to claim things — so it
--                points at the evidence (this site) instead of describing
--                him. Only facts already on record.
--   ai-guide   — the home page's AI guide section: label, heading,
--                introduction and example questions.
-- Additive only; an existing row (the owner already edited it) is kept.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('home-intro', jsonb_build_object(
    'headline', 'Most of what I''d tell you is already running.',
    'lede', 'I''m Kurhula — a software and AI engineer in South Africa. Rather than a list of claims, this site is the evidence: the systems I''ve shipped, a database that enforces its own rules, and an AI guide that answers from the same live data. Look around, or ask it anything.'
  )),
  ('ai-guide', jsonb_build_object(
    'eyebrow', 'AI · live on this site',
    'heading', 'Ask my AI guide anything.',
    'lede', 'It knows my systems, my journey and how I build — and it''s built the way I build: every answer grounded in this site''s live data, sources cited, guard-railed end to end. Ask about my work, or just test how it thinks.',
    'suggestions', jsonb_build_array(
      'What has he shipped, and what does each system do?',
      'How does this platform enforce its business rules?',
      'Is he a good fit for a full-stack AI role?',
      'Explain retrieval-augmented generation like I''m new to AI.'
    )
  ))
ON CONFLICT ("key") DO NOTHING;
