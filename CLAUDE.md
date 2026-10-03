# CLAUDE.md

This file is loaded automatically by Claude Code at the start of every session in this repository. Do not treat anything below as optional context — it is binding for all implementation work here.

## Start here — V2 is a relay (owner, 2026-10-02)

V1 is finished and released. **All V2 work follows `/docs/V2-IMPROVEMENT-SPEC.md` — LOCKED.** Before any code in any session:

1. Read `/docs/V2-IMPROVEMENT-SPEC.md` in full (Section 0.1 is the relay protocol).
2. Read `/docs/improvements/TRACKER.md` — take the WP named in **Next up**, claim it (status `In progress`, date, branch) in your first commit.
3. Read `/docs/improvements/DECISIONS.md` — the open conflicts and owner answers.

Before you stop — even mid-WP — update the WP's row, append a handoff entry, move **Next up**, and log decisions, so the next session picks up exactly where you left off. `tests/unit/v2-tracker.test.ts` keeps the tracker complete. Never add scope the spec doesn't name (spec Section 2.4); never fabricate owner-supplied content.

## What this project is

MALULEKE-KS — Kurhula Success Maluleke's personal platform. Not a static portfolio: a full-stack, database-backed system that is itself the proof of full-stack capability. See `/docs/PLATFORM-OVERVIEW-AND-RATIONALE.md` for why it's built this way.

## Governing documents — read before any non-trivial change

| Doc | Answers |
|---|---|
| `/docs/PLATFORM-CONSTITUTION-v1.md` | What exists — data model, routes, phases |
| `/docs/PLATFORM-OVERVIEW-AND-RATIONALE.md` | Why it exists this way |
| `/docs/BUSINESS-RULES-v1.md` | What must happen — enforceable behavior, cite by BR-x.x |
| `/openapi-contract.yaml` | The API contract — implement to this, don't improvise shapes |
| `/docs/DESIGN-SYSTEM.md` | What it looks like — the authoritative visual identity, cite by §n |
| `/docs/PAGE-SPECIFICATIONS.md` | What's on each route, section by section |
| `/docs/PUBLIC-REDESIGN-PLAN.md` | The approved public-site redesign (F5c) — decisions D1–D15, the AI guide (§3a), component choices (§7a) |
| `/docs/PAGE-BUILD-PLAYBOOK.md` | **How every public page is built** — the owner's rules, the stages (brief → data → structure → components → copy → build → verify → document → review), the reusable toolkit, the audit checklist, pitfalls, and a sheet per page. Follow it for every page; the home page is the reference build |
| `/docs/EVIDENCE-SPEC.md` | Evidence Density & Proof — every claim leads to honest, inspectable evidence (EV-1…EV-8) |
| `/docs/LETS-TALK-SPEC.md` | Let's Talk — opportunity intake & management on `Inquiry` (LT-1…LT-14), V2 accountless tracking |
| `/docs/V2-IMPROVEMENT-SPEC.md` | **The locked V2 plan** — every work package (WP), in order, with acceptance and verification; the relay protocol (§0.1) |
| `/docs/improvements/TRACKER.md`, `/docs/improvements/DECISIONS.md` | Where V2 stands (status per WP, Next up, handoff log) and why (decisions, conflicts, owner answers) — updated by every session |
| `/docs/ROADMAP-V2.md` | V2 features that wait for a trigger (Part 1, reconciled with the spec in its §1.2.4), and the update log — add to both in the same PR as the change |
| `/docs/DEPLOYMENT.md` | Where it actually runs — Vercel project, Neon database, migration pipeline, local dev/test databases |
| `/docs/ENFORCEMENT-REGISTER.md` | Where every claim is actually enforced — update the row in the same PR that adds, changes or enforces a claim |
| `/docs/BACKEND-API-GUIDE.md`, `/docs/FRONTEND-DATA-GUIDE.md` | Generated from `lib/capabilities/map.ts` (`npm run docs:capabilities`) — every database capability, its endpoints and the page that shows it. Never hand-edit |
| `/docs/PROJECT-STRUCTURE.md` | Where things live in the repo |

Every implementation decision should be able to cite a rule from one of these. If it can't, stop and ask rather than inventing new structure.

## Visual design workflow

`/docs/DESIGN-SYSTEM.md` (v3, "Graphite & International Orange") is the authoritative visual identity: a modern, product-grade interface — graphite and bone surfaces, one International Orange accent, glass on dark, soft layered depth, rounded cards, pill buttons, bento layouts, Lucide icons and real brand marks, purposeful motion. It governs every visual decision. The public-site redesign in progress applies it page by page per `/docs/PUBLIC-REDESIGN-PLAN.md`.

`/modern_ui_ux_layout_structuring_guide.md` (repo root) is a **working reference** — layout rhythm, 60-30-10 colour, glass, card anatomy, micro-interactions. Apply it through DESIGN-SYSTEM.md's tokens, never by copying its raw colour values.

Component sources, in order: this codebase's own components → shadcn/ui → Magic UI and 21st.dev. Browse both on their sites (the owner keeps them open in Chrome) or through their MCP servers; 21st.dev's free tier allows **2 code retrievals a day**, so shortlist visually first. Anything brought in is converted to the design tokens and IBM Plex before it ships — no bundled fonts, colours or CDN assets — and recorded in PUBLIC-REDESIGN-PLAN §7a. Figma for layout decisions before code; Gemini Canvas / ChatGPT for quick prototypes and image generation only — their output is re-implemented, never pasted in.

Browser work (viewing the local site, the owner's accounts) happens in the owner's **already-open Chrome** through Claude in Chrome — never a separate Playwright Chrome or new windows. The machine has limited RAM: check free memory before starting the dev server or a build, and run one dev server at a time.

**Personal information:** nothing about the owner goes on the site unless it's already in the repo (docs, seed data, existing copy, the CV file at the repo root) or the owner has said it. Ask before adding any personal detail. Never publish the owner's street address or placeholder referees from the CV file.

When the doc and a reference disagree, DESIGN-SYSTEM.md wins.

## Rule EXT-1 — Extension Over Modification

Any dimension expected to grow lives in a lookup table or config, never a hardcoded enum or a code change. `Status`, `Domain`, `InquiryType`, `MilestoneType`, `SkillCategory`, `RepoRelationship`, `TitleKind` and `OrganizationKind` are lookup tables — add values via the `/lookups/{type}` endpoint (or Admin → Settings → Lookups), never by editing an enum. The owner's titles and qualifications (`ProfileTitle`), photos (`ProfilePhoto`), page copy (`SiteContent`) and every tunable (`PlatformSetting`) are data too.

Deliberately NOT extensible, per the constitution's own exception: `ClientVisibility` and `ContentStatus` stay fixed enums (control states, not growing content). `AdminUser` stays single-owner, no RBAC. The core stack (Next.js, Postgres, Prisma, Vercel) is a foundational commitment, not up for reconsideration per-task.

## Current phase — do not build ahead of this

**V1 is complete, closed and live in production (final release 2026-10-03, build `c0eb952`, PRs #152 and #154):**
- the systems catalog synced from GitHub, with monorepo manifests, skill evidence and real brand marks;
- the uploaded CV (generation switched off, code kept);
- Let's Talk intake and management;
- the admin panel with 2FA, activity logging, scheduled jobs and generated write-ups;
- the redesigned public site (F5c: Home, Systems with its spotlight and dropdown filters, Journey, About, Let's talk);
- the AI guide.

See `/docs/DEPLOYMENT.md`, the update log in `/docs/ROADMAP-V2.md`, and the last handoff entry in `/docs/improvements/TRACKER.md` (owner to-dos and open questions). **README.md is the owner's profile README; any change to it is discussed with the owner first.**

**V2 is in progress, one work package at a time:** `/docs/V2-IMPROVEMENT-SPEC.md`, tracked in `/docs/improvements/TRACKER.md` (see "Start here" above).

**Still out of scope:** testimonials, public API exposure beyond `/systems` read, full analytics dashboard, and everything else in `/docs/ROADMAP-V2.md` — real and specified, but not scaffolded until its trigger.

## Stack

In use: TypeScript (strict), Next.js App Router (16, Turbopack), Tailwind CSS v4 with the v3 design tokens, shadcn/ui (Radix), Magic UI / 21st.dev components converted to tokens, `motion` for animation, Zod, Prisma + PostgreSQL (Neon in production, Postgres 16 locally), Vercel (Fluid Compute, cron, Analytics behind consent), `@react-pdf/renderer` + `docx` for the CV, `sharp` for photos, `otpauth` for TOTP, `bcryptjs`, Vitest + Testing Library + Playwright.

Admin authentication is **hand-rolled**: HMAC-signed session cookies with a per-admin session version (`lib/auth/session.ts`, `lib/auth/with-admin.ts`, `proxy.ts`) — not NextAuth.js. `NEXTAUTH_SECRET` is only the name of the signing key.

Sentry / Better Stack / Prometheus are planned observability, not wired yet. (Unused packages — next-auth, TanStack Query, Zustand, React Hook Form, qrcode — were removed 2026-09-30; don't reintroduce a library without a use.)

## Commands

```
npm run dev                  # local dev server (reads .env.development.local → local dev database, never production)
npm run build                # production build (reads .env.local — production URLs; reproduce CI with DATABASE_URL= empty)
npm run lint                 # eslint
npm run typecheck            # tsc --noEmit
npm run test:unit            # vitest — tests/unit
npm run test:integration     # vitest — tests/integration, against the local test database (.env.test.local)
npm run docs:capabilities    # regenerate BACKEND-API-GUIDE.md and FRONTEND-DATA-GUIDE.md from lib/capabilities/map.ts
npm run prisma:migrate       # new migration against the local dev database — additive only (CI migration guard)
npm run prisma:deploy        # apply migrations to the local dev database
npm run db:seed              # seed lookups, orgs, flags into the local dev database
npm run sync:github          # GitHub sync into the local dev database (needs GITHUB_SYNC_TOKEN, GITHUB_SYNC_ORGS)
node scripts/migration-guard.mjs origin/main   # the CI migration guard, locally
```

The test database needs migrations too: `npx dotenv -e .env.test.local -- npx prisma migrate deploy`. A bare `npx prisma …` has no env file and touches no database.

## Non-negotiables when implementing

- **Mobile by default** (owner's rule, 2026-10-01). Every public page is designed for a phone first, then widened — never a desktop layout squeezed down. `tests/e2e/mobile.spec.ts` (every public page at 360 and 390 px, and the phone menu) must pass; see PAGE-BUILD-PLAYBOOK §1 and §7.
- **Nothing hardcoded unless hardcoding is the recommended practice** (owner's rule). Tunables — limits, windows, durations, SLAs, copy, owner details, titles, photos — are data (admin-editable settings/profile/lookup tables) or env config. Business *laws* (an inquiry starts NEW, systems are never deleted) are database constraints, which is the recommended practice, not hardcoding; if a law contains a tunable number, the constraint reads it from settings.
- **Every database capability is callable and shown.** A table, view or function without an endpoint fails `capability-coverage.test.ts` unless exempted in `NOT_EXPOSED` with a reason; every public capability names the page that shows it (PUBLIC-REDESIGN-PLAN D2). Update `lib/capabilities/map.ts`, the contract and the generated guides in the same PR.
- Every claim the platform makes is enforced somewhere real — see `/docs/ENFORCEMENT-REGISTER.md`, and update its row in the same PR.
- BR-1.1: publishing blocked server-side when `clientApproved=false` and `clientVisibility != PUBLIC` — never a client-side-only check.
- BR-3.1: no write action succeeds without verified 2FA on the admin session.
- BR-4.1/4.2/4.3: the AI guide is read-only; it may **draft** an inquiry for the visitor to review and send through the normal form (same validation and rate limit) but never submits one itself. It states nothing about the owner that isn't in the site's data, is always labelled as AI, and speaks about the owner in the third person. Every tool ships disabled behind a `Flag` (BR-4.4).
- Every admin mutation writes to `ActivityLog` — database audit triggers plus `withAdmin`, never opt-in per route.
- **Deploys are batched.** Build and verify on one local release branch; release in sensible batches against the Vercel daily and monthly deploy limits — the agent plans the timing (owner, 2026-10-01). No AI attribution in commits, PRs or issues. `README.md` is the owner's GitHub profile README — never touch it.

## File layout

```
/docs/                          governing documents (the table above)
/design/character/              the AI guide's source art and the owner-approved portraits
/openapi-contract.yaml
/prisma/schema.prisma           models + public views; migrations in /prisma/migrations (additive only)
/prisma/seed.ts
/lib/schemas.ts                 Zod input/output schemas, matching openapi-contract.yaml
/lib/capabilities/map.ts        the capability map (source of the generated guides and the coverage test)
/lib/settings/registry.ts       every admin-editable tunable, typed, with bounds and defaults
/app/(public)/                  the public site — routes per Constitution §12 and PUBLIC-REDESIGN-PLAN §2
/app/(admin)/admin/(panel)/     the admin panel (2FA-gated); /app/(admin)/admin/login outside the panel
/app/api/v1/                    the API — public, /admin (withAdmin), /lookups, /cron
/components/shared, /components/admin, /components/home
/tests/unit, /tests/integration
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
