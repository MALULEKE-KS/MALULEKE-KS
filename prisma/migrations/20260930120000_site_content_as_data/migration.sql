-- #99 (F5.1): site content that lived in code becomes admin-editable data
-- (owner rule: nothing hardcoded).
--
-- 1. PublicAffiliation — the organizations the owner founded or co-founded
--    (Organization.role set), for the home hero and /about. Only name, slug and
--    role; never whether one is a client, never GitHub mapping.
-- 2. Profile.bio — the /about narrative was written in the page's code. It is
--    moved, word for word, into the profile the admin already edits
--    (/admin/profile), and only where the bio is still empty: an owner-written
--    bio is never overwritten. The page reads the bio from now on.

CREATE VIEW "PublicAffiliation" AS
 SELECT o."id", o."name", o."slug", o."role"
   FROM "Organization" o
  WHERE o."role" IS NOT NULL;

REVOKE INSERT, UPDATE, DELETE ON "PublicAffiliation" FROM platform_runtime;
GRANT SELECT ON "PublicAffiliation" TO platform_public;

UPDATE "Profile"
   SET "bio" = 'I’m a final-year Computer Science and Mathematics student building production-grade systems — full-stack web, AI integration, and enterprise automation — across fintech, EdTech, GovTech, and SaaS. Architecture and design come before any code is written; one system gets built at a time, no forward dependencies, no shortcuts taken to hit a date instead of a standard.

This platform is itself one of those systems: a database-backed, full-stack application, not a static portfolio describing one. Every rule it enforces — a publish gate that checks client approval server-side, an audit log every admin action writes to, an AI agent with no privileged write path — is the same discipline applied to client and personal work alike.'
 WHERE "id" = 1 AND ("bio" IS NULL OR btrim("bio") = '');
