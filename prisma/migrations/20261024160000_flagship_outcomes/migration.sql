-- D-065, the owner's plan Phase 2 ("three flagship cards, each with an outcome line, not a
-- tech list"): what each flagship achieved, one line each, in Admin -> Page content -> Home
-- ("Home — what each flagship achieved"). Owner, 2026-10-24: "use the best possible
-- professional humanized writing … based on the system its talking about" — so each line
-- says only what that system's own case study says (no figures it doesn't state). An
-- existing block is kept. Additive only.

INSERT INTO "SiteContent" ("key", "body") VALUES
  ('flagship-outcomes', jsonb_build_object('outcomes', jsonb_build_object(
    'xkimi-xa-mali', 'Turned a family savings group''s contributions from chat messages and memory into a ledger every member can trust — each rand recorded, reversible but never erased, and reconciled every night.',
    'sunduza-architectural', 'Gave an architectural practice one place to win work: its projects on show, every enquiry and consultation booking captured, and a back office to follow each lead through.',
    'maluleke-ks', 'A live portfolio that proves its own claims — rules enforced in the database, every change audited, and visitors shown only what has been approved.'
  )))
ON CONFLICT ("key") DO NOTHING;
