-- #106 (F5b.3): page content blocks — site copy the owner edits in the admin
-- instead of in code (owner rule: nothing hardcoded; PAGE-SPECIFICATIONS
-- /how-i-build: "admin-editable as a single content block"). One row per
-- block, keyed (EXT-1: a new block is a row, not a schema change); the body's
-- shape per key is validated by the app (lib/content/blocks.ts) and must be a
-- JSON object here. Seeded with the mission and principles exactly as they
-- were written in lib/content/principles.ts.

CREATE TABLE "SiteContent" (
  "key"       text PRIMARY KEY,
  "body"      jsonb NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
  "updatedAt" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "SiteContent_key_format" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "SiteContent_body_object" CHECK (jsonb_typeof("body") = 'object')
);

CREATE VIEW "PublicSiteContent" AS SELECT "key", "body", "updatedAt" FROM "SiteContent";

REVOKE INSERT, UPDATE, DELETE ON "PublicSiteContent" FROM platform_runtime;
GRANT SELECT ON "PublicSiteContent" TO platform_public;

CREATE TRIGGER "SiteContent_audit" AFTER INSERT OR UPDATE OR DELETE ON "SiteContent"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

INSERT INTO "SiteContent" ("key", "body") VALUES ('how-i-build', jsonb_build_object(
  'mission', 'I build systems disciplined enough to be trusted with real money, real institutions, and real people’s outcomes — engineered in South Africa, held to a global standard.',
  'principles', jsonb_build_array(
    jsonb_build_object(
      'name', 'Extension Over Modification (EXT-1)',
      'summary', 'Anything expected to grow lives in data, never in a hard-coded list.',
      'body', 'Anything expected to grow — a new project category, a new type of visitor, a new skill — lives in a lookup table or config, never a hard-coded list. A new chapter of the work shouldn''t require rebuilding the platform to fit it.'),
    jsonb_build_object(
      'name', 'Smart Not Hard',
      'summary', 'Buy the commodity, build the differentiated.',
      'body', 'Buy the commodity, build the differentiated. Off-the-shelf tools handle what''s already a solved problem; real engineering time goes into the parts that actually need building.'),
    jsonb_build_object(
      'name', 'Controlled Imperfection Engineering',
      'summary', 'Failures made predictable and traceable, not chased into an impossible zero.',
      'body', 'Failures are made predictable and traceable, not chased into an impossible zero. Every admin action on this platform writes to an audit log — what goes wrong feeds directly into what gets fixed next, the same discipline an incident produces a runbook.'),
    jsonb_build_object(
      'name', 'Permission Boundaries',
      'summary', 'No AI acts autonomously on anything that matters.',
      'body', 'No AI acts autonomously on anything that matters. The one write path an automated agent can ever trigger here is the same inquiry form a human uses — never a more privileged shortcut.')
  )
));
