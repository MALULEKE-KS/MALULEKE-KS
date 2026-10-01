-- F5c (PUBLIC-REDESIGN-PLAN §2 "/now", §3 selected work): weekly commit
-- activity of PUBLISHED systems for the public site — the sparkline on each
-- selected-work card and, later, /now. Counts only: no commit content, no
-- author, nothing for a system that isn't live (the join to PublicSystem
-- applies BR-1.1/1.13 and every masking rule). The last 26 weeks.
-- Additive only.

CREATE VIEW "PublicSystemActivity" AS
SELECT p."slug", w."weekStart", w."commits"
  FROM "SystemActivityWeek" w
  JOIN "PublicSystem" p ON p."id" = w."systemId"
 WHERE w."weekStart" > current_date - 182;

REVOKE INSERT, UPDATE, DELETE ON "PublicSystemActivity" FROM platform_runtime;
GRANT SELECT ON "PublicSystemActivity" TO platform_public;
