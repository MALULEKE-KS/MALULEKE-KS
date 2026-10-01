-- F5c (PUBLIC-REDESIGN-PLAN §3.4, the system map: homes → systems → skills).
-- Which of the owner's GitHub homes each PUBLISHED system belongs to — the
-- same rule PublicHome uses to count them: the system's organisation is the
-- home, or its repo lives under one of the home's GitHub accounts (so client
-- work built in GrowthCore's GitHub belongs to GrowthCore's home). When both
-- apply to different homes, where the code lives wins. Published systems only
-- (the join to PublicSystem carries every visibility and masking rule).
-- Additive only.

CREATE VIEW "PublicSystemHome" AS
SELECT DISTINCT ON (p."slug") p."slug", o."slug" AS "homeSlug"
  FROM "PublicSystem" p
  JOIN "System" s ON s."id" = p."id"
  JOIN "Organization" o
    ON cardinality(o."githubLogins") > 0
   AND (s."organizationId" = o."id"
        OR lower(s."githubOwnerLogin") IN (SELECT lower(l) FROM unnest(o."githubLogins") l))
 ORDER BY p."slug",
          (lower(s."githubOwnerLogin") IN (SELECT lower(l) FROM unnest(o."githubLogins") l)) DESC,
          o."slug";

REVOKE INSERT, UPDATE, DELETE ON "PublicSystemHome" FROM platform_runtime;
GRANT SELECT ON "PublicSystemHome" TO platform_public;
