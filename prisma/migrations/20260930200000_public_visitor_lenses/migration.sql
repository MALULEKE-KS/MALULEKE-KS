-- F5c (PUBLIC-REDESIGN-PLAN §3a, Constitution §4): the visitor lenses the home
-- hero and the AI guide open with — "I'm hiring", "I have a project", "I'm an
-- engineer", "Just exploring". They are VisitorLens rows (EXT-1): the owner
-- adds, renames, reorders and rewrites them in Admin → Settings → Lenses.
-- Additive only.
--
-- sortOrder lets the owner put the chips in the order visitors see them.
-- PublicVisitorLens exposes key, label and order only — never the framing
-- prompt or the priority content, which are the guide's instructions.

ALTER TABLE "VisitorLens" ADD COLUMN "sortOrder" integer NOT NULL DEFAULT 0;

INSERT INTO "VisitorLens" ("id", "key", "label", "sortOrder", "priorityContent", "aiFramingPrompt") VALUES
  (gen_random_uuid()::text, 'hiring', 'I''m hiring', 0,
   '{"pages": ["/cv", "/systems", "/journey"]}',
   'The visitor is hiring. Lead with shipped systems, the stack behind them and the CV; offer the tailored CV and the contact form.'),
  (gen_random_uuid()::text, 'project', 'I have a project', 1,
   '{"pages": ["/systems", "/method", "/contact"]}',
   'The visitor has a project in mind. Lead with delivered venture and client work, how the work is done (the method), and how to start a conversation.'),
  (gen_random_uuid()::text, 'engineer', 'I''m an engineer', 2,
   '{"pages": ["/systems", "/method"]}',
   'The visitor is an engineer. Be technical: architecture, the rules the database enforces, trade-offs, and where the code lives.'),
  (gen_random_uuid()::text, 'exploring', 'Just exploring', 3,
   '{"pages": ["/", "/journey", "/about"]}',
   'The visitor is exploring. Give a short tour: who the owner is, what the owner builds, and where to look first.')
ON CONFLICT ("key") DO NOTHING;

CREATE VIEW "PublicVisitorLens" AS
 SELECT "key", "label", "sortOrder" FROM "VisitorLens";

REVOKE INSERT, UPDATE, DELETE ON "PublicVisitorLens" FROM platform_runtime;
GRANT SELECT ON "PublicVisitorLens" TO platform_public;
