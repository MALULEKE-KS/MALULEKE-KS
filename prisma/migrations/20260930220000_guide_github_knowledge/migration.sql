-- F5c (PUBLIC-REDESIGN-PLAN §3a) — the AI guide's GitHub knowledge. The
-- owner (2026-09-30): the guide must know his GitHub "from zero to here" —
-- every repo in his three homes, what changes day to day — and stay current.
-- The daily sync (F4.2) already keeps languages, topics, stars and weekly
-- activity; this adds what a repo is and what's changing in it:
--   System.githubCreatedAt      when the repo began ("from zero")
--   System.githubReadmeExcerpt  the start of its README, plain text
--   RepoCommit                  recent commits: first line of the message, date
-- Privacy (BR-1.3/1.4/1.7): the sync stores README and commits for PUBLIC
-- repos only — a private repo's history never enters the database — and the
-- public views below expose only public repos in the owner's own homes whose
-- work isn't client-restricted. A draft the owner hasn't written up yet is
-- known as "on GitHub", never as a published system.
-- Additive only.

ALTER TABLE "System" ADD COLUMN "githubCreatedAt" timestamptz(3);
ALTER TABLE "System" ADD COLUMN "githubReadmeExcerpt" text;
ALTER TABLE "System" ADD CONSTRAINT "System_readme_excerpt_length" CHECK (char_length("githubReadmeExcerpt") <= 4000);

CREATE TABLE "RepoCommit" (
  "id"          text PRIMARY KEY,
  "systemId"    text NOT NULL REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Unique per repo, not globally: the same commit can live in two repos
  -- (a template, a copy), and each keeps its own history.
  "sha"         text NOT NULL,
  "message"     text NOT NULL,
  "committedAt" timestamptz(3) NOT NULL,
  "authorLogin" text,
  "createdAt"   timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT "RepoCommit_message_length" CHECK (char_length("message") BETWEEN 1 AND 500),
  CONSTRAINT "RepoCommit_sha_format" CHECK ("sha" ~ '^[0-9a-f]{7,64}$')
);
CREATE UNIQUE INDEX "RepoCommit_systemId_sha_key" ON "RepoCommit" ("systemId", "sha");
CREATE INDEX "RepoCommit_systemId_committedAt_idx" ON "RepoCommit" ("systemId", "committedAt" DESC);
-- RepoCommit is a mirror of GitHub, refreshed and pruned by the sync — not
-- owner-curated content — so it has no audit trigger (it would bury the
-- audit trail in sync noise); the sync run itself is recorded in JobRun.

-- The repos the guide may talk about: public, in one of the owner's homes
-- (not a client organisation), never archived, and not client-restricted.
CREATE VIEW "PublicGithubRepo" AS
SELECT s."githubFullName"                          AS "fullName",
       s."name",
       o."name"                                    AS "home",
       o."slug"                                    AS "homeSlug",
       (p."id" IS NOT NULL)                        AS "published",
       p."slug"                                    AS "slug",
       COALESCE(p."description", s."description") AS "description",
       s."githubLanguages"                         AS "languages",
       s."githubTopics"                            AS "topics",
       COALESCE(s."githubStars", 0)                AS "stars",
       s."githubCreatedAt"                         AS "createdAt",
       s."githubPushedAt"                          AS "pushedAt",
       s."githubReadmeExcerpt"                     AS "readmeExcerpt",
       COALESCE((SELECT sum(w."commits") FROM "SystemActivityWeek" w
                  WHERE w."systemId" = s."id" AND w."weekStart" > current_date - 28), 0)::int  AS "commitsLast4Weeks",
       COALESCE((SELECT sum(w."commits") FROM "SystemActivityWeek" w
                  WHERE w."systemId" = s."id" AND w."weekStart" > current_date - 364), 0)::int AS "commitsLastYear"
  FROM "System" s
  JOIN "Organization" o ON o."id" = s."organizationId"
  LEFT JOIN "OrganizationKind" k ON k."id" = o."kindId"
  LEFT JOIN "PublicSystem" p ON p."id" = s."id"
 WHERE s."githubFullName" IS NOT NULL
   AND s."repoPrivate" = false
   AND s."contentStatus" <> 'ARCHIVED'
   AND s."clientVisibility" = 'PUBLIC'
   AND o."isClient" = false
   AND COALESCE(k."key", '') <> 'client';

-- Recent changes in those repos: the last 90 days.
CREATE VIEW "PublicRepoCommit" AS
SELECT r."fullName", c."message", c."committedAt"
  FROM "RepoCommit" c
  JOIN "System" s ON s."id" = c."systemId"
  JOIN "PublicGithubRepo" r ON r."fullName" = s."githubFullName"
 WHERE c."committedAt" > now() - interval '90 days';

REVOKE INSERT, UPDATE, DELETE ON "PublicGithubRepo", "PublicRepoCommit" FROM platform_runtime;
GRANT SELECT ON "PublicGithubRepo", "PublicRepoCommit" TO platform_public;

-- "Plex, elevated" (owner, 2026-09-30): accent words in headlines are marked
-- *like this* in the content. Mark the two new headings — only while they
-- still read exactly as seeded, so an owner edit is never overwritten.
UPDATE "SiteContent"
   SET "body" = jsonb_set("body", '{headline}', to_jsonb('Most of what I''d tell you is *already running.*'::text))
 WHERE "key" = 'home-intro' AND "body"->>'headline' = 'Most of what I''d tell you is already running.';
UPDATE "SiteContent"
   SET "body" = jsonb_set("body", '{heading}', to_jsonb('Ask my AI guide *anything.*'::text))
 WHERE "key" = 'ai-guide' AND "body"->>'heading' = 'Ask my AI guide anything.';
