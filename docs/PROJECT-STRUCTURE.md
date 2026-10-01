# MALULEKE-KS — PROJECT FILE STRUCTURE v2.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md §12 (route map), PUBLIC-REDESIGN-PLAN.md §2
**Convention basis:** Next.js App Router, route-group separation by access level, colocation over shared-folder sprawl, business rules as code beside the database's own enforcement, Ports & Adapters for external services (EXT-1).
**Updated:** 2026-09-30 — rewritten from the real tree (v1.0 was the plan before the build).

```
maluleke-ks/
├── CLAUDE.md                          # read automatically by Claude Code — binding
├── README.md                          # the owner's GitHub profile README — never edited by the platform work
├── Kurhula_Maluleke_CV_2025-1.docx    # the owner's CV — source material for the CV rewrite (street address never published)
├── modern_ui_ux_layout_structuring_guide.md   # working design reference (DESIGN-SYSTEM.md wins)
├── openapi-contract.yaml              # the API contract — lib/schemas.ts and the routes match it
├── proxy.ts                           # Next.js 16 "middleware": admin session gate for /admin and /api/v1/admin
├── next.config.ts                     # redirects (e.g. /how-i-build → /method), image hosts
├── vercel.ts                          # Vercel config as code — cron schedule as literals, build ignore
├── tailwind.config.ts, app/globals.css   # design tokens (DESIGN-SYSTEM.md)
│
├── docs/                              # governing documents — table in CLAUDE.md
│   ├── PLATFORM-CONSTITUTION-v1.md, PLATFORM-OVERVIEW-AND-RATIONALE.md, BUSINESS-RULES-v1.md
│   ├── DESIGN-SYSTEM.md, PAGE-SPECIFICATIONS.md, PUBLIC-REDESIGN-PLAN.md, ROADMAP-V2.md
│   ├── DEPLOYMENT.md, ENFORCEMENT-REGISTER.md, PROJECT-STRUCTURE.md
│   └── BACKEND-API-GUIDE.md, FRONTEND-DATA-GUIDE.md   # generated — npm run docs:capabilities
│
├── design/
│   └── character/                     # the AI guide's master art and the owner-approved portraits
│
├── prisma/
│   ├── schema.prisma                  # models + Public* views (the only thing public pages read)
│   ├── seed.ts                        # lookups, orgs, flags, a small real system set for local dev
│   └── migrations/                    # additive only — CI migration guard; business rules as CHECKs/triggers
│
├── scripts/                           # operator scripts (run in the owner's terminal where secrets are involved)
│   ├── github-sync.ts, backup-drill.ts, create-admin.ts, reset-admin-password.ts, create-db-roles.ts
│   ├── generate-capability-docs.ts, migration-guard.mjs, cv-continuity.mjs
│   └── vercel-build.mjs, vercel-ignore.mjs, run-e2e-if-present.mjs
│
├── .github/workflows/                 # ci.yml (typecheck, lint, tests, build, migration guard), cv-continuity.yml
│
├── lib/
│   ├── db.ts                          # Prisma clients: db (platform_runtime) and dbPublic (platform_public, views only)
│   ├── audit.ts, db-errors.ts         # audited transactions (actor context for the DB audit trigger); rule-violation mapping
│   ├── schemas.ts                     # Zod schemas, matching openapi-contract.yaml
│   ├── flags.ts                       # reads the Flag table — every agent tool checks here first (BR-4.4)
│   ├── site-url.ts, og.tsx, utils.ts
│   ├── adapters/                      # Ports & Adapters: ai/, analytics/, storage/, scheduler/ (vercel-cron-adapter)
│   ├── admin/request.ts               # the admin screens' one way to call the admin API
│   ├── auth/                          # session.ts (signed cookies + session version), with-admin.ts, totp.ts,
│   │                                  # reauth.ts, recovery-codes.ts, rate-limit.ts, activity-log.ts, current-admin.ts, crypto.ts
│   ├── capabilities/                  # map.ts — every capability: DB objects, endpoints, rules, pages; render.ts
│   ├── content/                       # blocks.ts (SiteContent registry), sheets.ts (page list + nav)
│   ├── cv/                            # the CV engine: model, check, tailor, render-pdf, render-docx, uploads, options
│   ├── jobs/                          # registry, schedule, run-job, github-sync, maintenance (retention)
│   ├── metrics/                       # curated numbers (BR-5.3)
│   ├── profile/photos.ts              # photo processing and versions (BR-1.17)
│   ├── queries/                       # read models: site, profile (titles, homes, pulse, photos), systems, search, …
│   ├── rules/                         # business rules as code, one file per cluster (publishing, inquiries, lookups,
│   │                                  # slugs, revisions, scheduling, titles, organizations, cv, timeline, profile)
│   ├── security/                      # csrf.ts (BR-3.9), keyed-hash.ts, client-ip.ts
│   └── settings/                      # registry.ts — every admin-editable tunable, typed with bounds; index.ts
│
├── hooks/                             # usePrefersReducedMotion, useTypewriterLines
│
├── components/
│   ├── ui/                            # shadcn/ui + Magic UI primitives, converted to the tokens
│   ├── shared/                        # cross-page: PublicShell, SiteHeader + HeaderFrame + NavLinks, SiteFooter +
│   │                                  # DitheredWordmark, SearchPalette, SystemCard, PageHero, Consent, SocialLinks, …
│   ├── home/                          # home-page sections (being rebuilt in F5c)
│   └── admin/                         # AdminNav, ui.tsx (the admin kit), ConfirmDelete, ActivityLogTable
│
├── app/
│   ├── layout.tsx, not-found.tsx, globals.css
│   ├── sitemap.ts, robots.ts, icon.svg, opengraph-image.tsx
│   ├── (public)/                      # visitor-facing — no auth
│   │   ├── page.tsx                   # /
│   │   ├── systems/page.tsx, systems/[slug]/page.tsx
│   │   ├── journey/, cv/, method/, about/, contact/     # /method was /how-i-build (redirect)
│   │   └── (planned, F5c) now/, organizations/[slug]/
│   ├── (admin)/admin/
│   │   ├── login/                     # outside the panel — two-step sign-in
│   │   └── (panel)/                   # layout re-checks the session; one page per admin capability:
│   │       # overview, systems (+ editor), organizations, timeline, cv, profile, content, inquiries,
│   │       # numbers, freshness, jobs, settings, activity-log, account
│   └── api/
│       ├── cron/[job]/                # Vercel cron entry (CRON_SECRET)
│       └── v1/                        # mirrors openapi-contract.yaml path for path
│           ├── systems, organizations, homes, platform/pulse, profile (+ photo/[purpose]), home, search,
│           │   skills, achievements, metrics, timeline, cv, content/[key], inquiries, lookups/[type]
│           └── admin/…                # every admin endpoint, each wrapped in withAdmin (session, CSRF, audit)
│
└── tests/
    ├── unit/                          # pure logic (session, CV engine, migration guard, display names, vercel config)
    ├── integration/                   # route handlers + the real local test database (.env.test.local)
    ├── e2e/                           # Playwright — reserved
    ├── ai-evals/                      # the AI guide's evals (Constitution §6) — to be filled in F5c
    └── helpers/
```

## Conventions worth stating explicitly

- **Route groups by access level, not by feature.** `(public)` and `(admin)` split at the top, because the access boundary — not the content type — is the thing that must never leak.
- **Public pages read only `Public*` views through `dbPublic`** (the `platform_public` role can't see raw tables). Admin and writes use `db` as `platform_runtime`, which can't undo the database's rules.
- **`_components/` colocation for single-route components; `components/shared/` only for genuinely cross-cutting ones.**
- **Business rules live in two places on purpose:** the database (CHECKs, triggers, views — can't be bypassed) and `lib/rules/` (friendly messages, workflow). `BUSINESS-RULES-v1.md` and `ENFORCEMENT-REGISTER.md` say which is which.
- **`app/api/v1/` mirrors the OpenAPI paths exactly**, and `lib/capabilities/map.ts` names every endpoint and database object — the coverage test fails on anything missing.
- **Tunables are data:** a new limit or window is a `lib/settings/registry.ts` entry, editable in Admin → Settings; a new growing list is a lookup table.
