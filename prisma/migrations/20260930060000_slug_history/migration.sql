-- #87 / BR-1.14: a renamed system keeps its old links working. Every slug a
-- system gives up is recorded by the database and answered with a permanent
-- redirect to its current slug — whether the admin renamed it or the GitHub
-- sync followed a repo rename. An old slug stays reserved for the system that
-- used it (another system taking it would hijack those links); the same system
-- may take it back.

CREATE TABLE "SystemSlugHistory" (
  "slug"      text PRIMARY KEY,
  "systemId"  text NOT NULL REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "SystemSlugHistory_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
CREATE INDEX "SystemSlugHistory_systemId_idx" ON "SystemSlugHistory" ("systemId");

-- Before a slug is set: refuse another system's old slug; reclaiming your own
-- old slug removes it from the history (it's current again, not a redirect).
CREATE FUNCTION enforce_br_1_14_slug_reserved() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owner_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."slug" = OLD."slug" THEN
    RETURN NEW;
  END IF;
  SELECT "systemId" INTO owner_id FROM "SystemSlugHistory" WHERE "slug" = NEW."slug";
  IF owner_id IS NOT NULL AND owner_id <> NEW."id" THEN
    RAISE EXCEPTION 'BR-1.14: the slug "%" is reserved — it used to belong to another system and still redirects there', NEW."slug"
      USING ERRCODE = 'check_violation';
  END IF;
  IF owner_id IS NOT NULL THEN
    -- migration-guard: allow a system taking back its own old slug removes only that redirect row (#87)
    DELETE FROM "SystemSlugHistory" WHERE "slug" = NEW."slug";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "System_br_1_14_slug_reserved" BEFORE INSERT OR UPDATE OF "slug" ON "System"
  FOR EACH ROW EXECUTE FUNCTION enforce_br_1_14_slug_reserved();

-- After a rename: the slug given up now redirects to this system.
CREATE FUNCTION record_system_slug_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."slug" IS DISTINCT FROM OLD."slug" THEN
    INSERT INTO "SystemSlugHistory" ("slug", "systemId") VALUES (OLD."slug", NEW."id");
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "System_slug_history" AFTER UPDATE OF "slug" ON "System"
  FOR EACH ROW EXECUTE FUNCTION record_system_slug_change();

-- Public: old slug → current slug, for live systems only (BR-1.13), so a
-- redirect never reveals a system the visitor can't see.
CREATE VIEW "PublicSlugRedirect" AS
 SELECT h."slug" AS "fromSlug", s."slug" AS "toSlug"
   FROM "SystemSlugHistory" h
   JOIN "System" s ON s."id" = h."systemId"
  WHERE is_live(s."contentStatus", s."publishAt");

REVOKE INSERT, UPDATE, DELETE ON "PublicSlugRedirect" FROM platform_runtime;
GRANT SELECT ON "PublicSlugRedirect" TO platform_public;

CREATE TRIGGER "SystemSlugHistory_audit" AFTER INSERT OR UPDATE OR DELETE ON "SystemSlugHistory"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
