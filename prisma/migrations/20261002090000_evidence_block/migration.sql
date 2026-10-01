-- docs/EVIDENCE-SPEC.md — the first evidence entries: the claims the site
-- already makes (the five principles, the Control room's live numbers, the
-- MALULEKE-KS case study), each checked against the code on 2026-10-02 and
-- linked to the files that prove it. Content, not schema: one SiteContent row
-- ("evidence"), edited in the admin afterwards; inserted only if absent, so a
-- replay never overwrites the owner's edits.

INSERT INTO "SiteContent" ("key", "body") VALUES ('evidence', $json$
{
  "claims": [
    {
      "id": "ships-then-improves",
      "claim": "Shipped first, then improved in dated releases",
      "where": "principle:Make It Exist First",
      "status": "verified",
      "proves": "V1 went live, and every change since arrives as a reviewed pull request that must pass the same pipeline; the update log dates each release.",
      "doesNotProve": "That any release is free of defects, or that the order of work was always right.",
      "evidence": [
        { "label": "The release log, newest first", "kind": "source", "href": "repo:docs/ROADMAP-V2.md" },
        { "label": "The pipeline every release passes", "kind": "pipeline", "href": "actions:ci.yml" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "growth-is-data",
      "claim": "What grows is added as data, not as a code change",
      "where": "principle:Extension Over Modification (EXT-1)",
      "status": "verified",
      "proves": "Statuses, domains, inquiry types, skill categories and other growing lists are lookup tables with an API; a test fails if any table has no endpoint.",
      "doesNotProve": "That every future dimension was anticipated — only that the known growing ones are data.",
      "evidence": [
        { "label": "The data model (lookup tables)", "kind": "source", "href": "repo:prisma/schema.prisma" },
        { "label": "The lookups API", "kind": "source", "href": "repo:app/api/v1/lookups" },
        { "label": "Capability coverage test", "kind": "test", "href": "repo:tests/integration/capability-coverage.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "buys-the-commodity",
      "claim": "Solved problems are bought; the platform's own rules are built",
      "where": "principle:Smart Not Hard",
      "status": "verified",
      "proves": "The AI runs through Vercel's AI Gateway and site screenshots through a capture service, while the business rules are written into this database by hand.",
      "doesNotProve": "That each provider was the best choice, or that any provider can be swapped without code changes.",
      "evidence": [
        { "label": "The AI model, via the gateway", "kind": "source", "href": "repo:lib/guide/model.ts" },
        { "label": "Screenshots via a capture service", "kind": "source", "href": "repo:lib/systems/screenshots.ts" },
        { "label": "Rules the database enforces", "kind": "test", "href": "repo:tests/integration/db-enforced-rules.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "every-change-audited",
      "claim": "Every change to the data leaves an audit trail",
      "where": "principle:Controlled Imperfection Engineering",
      "status": "verified",
      "proves": "Database triggers log every insert, update and delete on audited tables; a test fails if a table is neither audited nor deliberately exempt.",
      "doesNotProve": "That failures are prevented — the trail makes them traceable, not impossible.",
      "evidence": [
        { "label": "The audit triggers", "kind": "source", "href": "repo:prisma/migrations/20260919100000_audit_trail_triggers/migration.sql" },
        { "label": "Audit coverage test", "kind": "test", "href": "repo:tests/integration/audit-trail.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "ai-drafts-never-sends",
      "claim": "The AI guide can draft, never send",
      "where": "principle:Permission Boundaries",
      "status": "verified",
      "proves": "Each guide tool is behind a flag and a test fails if a submit tool is ever offered; a draft reaches the same form, validation and rate limit as a person.",
      "doesNotProve": "That the model is never wrong — its answers are grounded in the site's data, not guaranteed.",
      "evidence": [
        { "label": "The guide endpoint", "kind": "source", "href": "repo:app/api/v1/guide/route.ts" },
        { "label": "Guide boundary tests", "kind": "test", "href": "repo:tests/integration/guide-api.test.ts" },
        { "label": "The one form both use", "kind": "source", "href": "repo:app/api/v1/inquiries/route.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "rules-in-the-database",
      "claim": "The business rules live in the database",
      "where": "pulse:rulesEnforcedByDatabase",
      "status": "verified",
      "proves": "Publishing, inquiry and admin-security rules are constraints and triggers that hold whatever calls the database — tested by trying to break them. The number is counted live.",
      "doesNotProve": "That every rule is in the database; some are enforced in the API layer, and the register says which.",
      "evidence": [
        { "label": "Tests that try to break them", "kind": "test", "href": "repo:tests/integration/db-enforced-rules.test.ts" },
        { "label": "Where every rule is enforced", "kind": "source", "href": "repo:docs/ENFORCEMENT-REGISTER.md" },
        { "label": "How the number is counted", "kind": "source", "href": "repo:prisma/migrations/20260930160000_titles_homes_pulse/migration.sql" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "audit-count-is-live",
      "claim": "The audit count is read from the log itself",
      "where": "pulse:auditEventsLast7Days",
      "status": "verified",
      "proves": "The figure is a count over the audit log at the moment the page loads — never a typed-in number.",
      "doesNotProve": "Anything about what the changes were; the log's contents stay private.",
      "evidence": [
        { "label": "How the number is counted", "kind": "source", "href": "repo:prisma/migrations/20260930160000_titles_homes_pulse/migration.sql" },
        { "label": "Audit coverage test", "kind": "test", "href": "repo:tests/integration/audit-trail.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "second-factor-for-writes",
      "claim": "No admin change without a verified second factor",
      "where": "system:maluleke-ks",
      "status": "verified",
      "proves": "Every admin write passes one middleware that requires a session with verified TOTP, and the proxy stops admin pages before they render.",
      "doesNotProve": "That the account can't be phished — two factors raise the bar, they don't remove it.",
      "evidence": [
        { "label": "The admin write middleware", "kind": "source", "href": "repo:lib/auth/with-admin.ts" },
        { "label": "The proxy gate", "kind": "source", "href": "repo:proxy.ts" },
        { "label": "Auth hardening tests", "kind": "test", "href": "repo:tests/integration/auth-hardening.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "every-capability-exposed",
      "claim": "Every database capability has a documented endpoint",
      "where": "system:maluleke-ks",
      "status": "verified",
      "proves": "A test lists every table, view and function and fails if one has neither an endpoint in the API contract nor a written reason to stay internal.",
      "doesNotProve": "That the endpoints are bug-free — only that nothing is hidden or forgotten.",
      "evidence": [
        { "label": "The capability map", "kind": "source", "href": "repo:lib/capabilities/map.ts" },
        { "label": "The API contract", "kind": "contract", "href": "repo:openapi-contract.yaml" },
        { "label": "Capability coverage test", "kind": "test", "href": "repo:tests/integration/capability-coverage.test.ts" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "fits-every-phone",
      "claim": "Every public page fits a phone",
      "where": "system:maluleke-ks",
      "status": "verified",
      "proves": "Each release renders every public page, every system page included, at 360 and 390 px and fails if anything is wider than the screen.",
      "doesNotProve": "That every layout is ideal on every device — only that nothing overflows.",
      "evidence": [
        { "label": "The phone test", "kind": "test", "href": "repo:tests/e2e/mobile.spec.ts" },
        { "label": "Where it runs", "kind": "pipeline", "href": "actions:ci.yml" }
      ],
      "reviewedAt": "2026-10-02"
    },
    {
      "id": "learns-from-questions",
      "claim": "The guide will learn from questions it can't answer",
      "where": "system:maluleke-ks",
      "status": "planned",
      "proves": "It is specified and scheduled (roadmap V2 item 16).",
      "doesNotProve": "Anything about today: the guide records no questions yet.",
      "evidence": [
        { "label": "The roadmap entry", "kind": "source", "href": "repo:docs/ROADMAP-V2.md" }
      ],
      "reviewedAt": "2026-10-02"
    }
  ]
}
$json$::jsonb)
ON CONFLICT ("key") DO NOTHING;
