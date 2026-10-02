-- V1 finalization (owner, 2026-10-02).
--
-- 1. Repos deleted on GitHub leave every public list. The sync retired only a
--    *published* system whose repo vanished; a public repo that was never
--    written up stayed in "every public repo" (PublicGithubRepo) forever — the
--    owner's two deleted portfolio repos were still listed. githubGoneAt
--    records GitHub's own "not found"; the sync sets it, clears it if the repo
--    comes back, and the view leaves those rows out.
ALTER TABLE "System" ADD COLUMN "githubGoneAt" TIMESTAMPTZ(3);

CREATE OR REPLACE VIEW "PublicGithubRepo" AS
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
   AND s."githubGoneAt" IS NULL
   AND s."contentStatus" <> 'ARCHIVED'
   AND s."clientVisibility" = 'PUBLIC'
   AND o."isClient" = false
   AND COALESCE(k."key", '') <> 'client';

-- GitHub's state on 2026-10-02 (checked against the GitHub API): the owner
-- deleted these two repos. The daily sync confirms and keeps this current.
UPDATE "System" SET "githubGoneAt" = now()
 WHERE "githubFullName" IN ('MALULEKE-KS/my-angular-portfolio', 'MALULEKE-KS/my-nextjs-portfolio')
   AND "githubGoneAt" IS NULL;

-- 2. FundsLink-Academy and Governova are public on GitHub now (they were
--    private when first synced, so they were created hidden — and the sync
--    never re-decided that). The owner: shown, in progress. Their words are
--    GitHub's own descriptions until the daily write-up job generates the
--    full case study from each repo (BR-4.5, labelled as AI).
UPDATE "System" s
   SET "repoPrivate" = false,
       "contentStatus" = 'PUBLISHED',
       "statusId" = (SELECT "id" FROM "Status" WHERE "key" = 'in_progress'),
       "description" = d.description
  FROM (VALUES
    ('KSDRILL-SA/fundslink-Academy', 'A platform connecting students to bursaries, scholarships, and funding opportunities using intelligent matching.'),
    ('KSDRILL-SA/governova', '10 constitutions, 355 rules. Complete governance framework for building production-grade systems — from team process to deployment.')
  ) AS d(full_name, description)
 WHERE s."githubFullName" = d.full_name
   AND s."contentStatus" = 'DRAFT'
   AND EXISTS (SELECT 1 FROM "Status" WHERE "key" = 'in_progress');

-- 3. The version the site is on, and what's next — data, editable in
--    Admin → Page content → Release.
INSERT INTO "SiteContent" ("key", "body") VALUES
  ('release', '{"current": "V1", "next": "V2", "nextNote": "on the way", "link": "/systems/maluleke-ks"}'::jsonb)
ON CONFLICT ("key") DO NOTHING;

-- 4. Every page's section copy as data (owner: "everything shouldn't be
--    hardcoded"). Exactly the words the pages shipped with, so nothing changes
--    on screen — except the map, which no longer counts the homes in words.
INSERT INTO "SiteContent" ("key", "body") VALUES ('page-copy', $json$
{
  "home.selected-work": { "eyebrow": "Selected work", "title": "Shipped, running, and *still moving.*", "description": "Each system here is read live from this site's data — its status, its stack, and its commits straight from GitHub." },
  "home.map": { "eyebrow": "The map", "title": "How it all *connects.*", "description": "The GitHub homes, the work in each, and what it's built with — drawn live from GitHub and this site's data." },
  "home.control-room": { "eyebrow": "Proof, not claims", "title": "The platform, *reporting on itself.*", "description": "Counted live from this site's own database when you loaded the page — the rules it refuses to break, every change it records, and when it last checked GitHub." },
  "home.method": { "eyebrow": "The method", "title": "How I *build.*" },
  "system.activity": { "eyebrow": "Activity", "title": "How it's moving." },
  "system.proves": { "eyebrow": "Skills", "title": "What it proves." },
  "system.impact": { "eyebrow": "Impact", "title": "What it changed." },
  "system.words": { "eyebrow": "In their words", "title": "From the people it was built for." },
  "system.more": { "eyebrow": "More systems", "title": "Related work." },
  "about.story": { "eyebrow": "In my own words" },
  "about.method": { "eyebrow": "How I build", "title": "The *method.*" },
  "about.skills": { "eyebrow": "What I work with", "title": "Skills, *with proof.*", "description": "A number shows how many published systems use a skill — open it to see them. The rest are part of his toolkit, not yet in a published system." },
  "about.close": { "title": "Let's build *something real.*" },
  "journey.ahead": { "eyebrow": "Ahead" },
  "contact.hero": { "eyebrow": "Let's talk", "title": "Let's *talk.*", "description": "Hiring, a project, a collaboration, or a question — tell me what brings you here, and the form asks only what that needs." },
  "contact.steps": { "items": [
    { "title": "You choose", "body": "What it's about — the form adapts." },
    { "title": "You send", "body": "And get a reference, right away." },
    { "title": "Reviewed within {reviewSlaHours} h", "body": "{owner} reads it himself." },
    { "title": "You hear back", "body": "The way you said you prefer." }
  ] },
  "contact.picker": { "title": "What brings you here?", "description": "Pick the closest — the form asks only what that needs." },
  "contact.email": { "title": "Prefer email?" },
  "contact.details": { "title": "Your details", "description": "No account, no password. What you send is kept for {retentionMonths} months, then anonymised automatically — attachments deleted." }
}
$json$::jsonb)
ON CONFLICT ("key") DO NOTHING;

-- 5. The guide's home suggestions (spec WP-107, D-007): no question asks it to
--    judge its own owner, and the general-AI one becomes broad *and* about his
--    work. Changed only while they still read exactly as seeded.
UPDATE "SiteContent" c
   SET "body" = jsonb_set(c."body", '{suggestions}', (
         SELECT jsonb_agg(
                  CASE v.q
                    WHEN 'Is he a good fit for a full-stack AI role?' THEN to_jsonb('What evidence supports a full-stack AI role?'::text)
                    WHEN 'Explain retrieval-augmented generation like I''m new to AI.' THEN to_jsonb('How does he use AI in what he builds?'::text)
                    ELSE to_jsonb(v.q)
                  END ORDER BY v.n)
           FROM jsonb_array_elements_text(c."body"->'suggestions') WITH ORDINALITY AS v(q, n)))
 WHERE c."key" = 'ai-guide'
   AND jsonb_typeof(c."body"->'suggestions') = 'array';
