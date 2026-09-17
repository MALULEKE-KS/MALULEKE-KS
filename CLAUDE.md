# CLAUDE.md

This file is loaded automatically by Claude Code at the start of every session in this repository. Do not treat anything below as optional context — it is binding for all implementation work here.

## What this project is

MALULEKE-KS — Kurhula Success Maluleke's personal platform. Not a static portfolio: a full-stack, database-backed system that is itself the proof of full-stack capability. See `/docs/PLATFORM-OVERVIEW-AND-RATIONALE.md` for why it's built this way.

## Governing documents — read before any non-trivial change

| Doc | Answers |
|---|---|
| `/docs/PLATFORM-CONSTITUTION-v1.md` | What exists — data model, routes, phases |
| `/docs/PLATFORM-OVERVIEW-AND-RATIONALE.md` | Why it exists this way |
| `/docs/BUSINESS-RULES-v1.md` | What must happen — enforceable behavior, cite by BR-x.x |
| `/openapi-contract.yaml` | The API contract — implement to this, don't improvise shapes |

Every implementation decision should be able to cite a rule from one of these. If it can't, stop and ask rather than inventing new structure.

## Rule EXT-1 — Extension Over Modification

Any dimension expected to grow lives in a lookup table or config, never a hardcoded enum or a code change. `Status`, `Domain`, `InquiryType`, `MilestoneType`, `SkillCategory` are lookup tables — add values via the `/lookups/{type}` endpoint, never by editing an enum.

Deliberately NOT extensible, per the constitution's own exception: `ClientVisibility` and `ContentStatus` stay fixed enums (control states, not growing content). `AdminUser` stays single-owner, no RBAC. The core stack (Next.js, Postgres, Prisma, Vercel) is a foundational commitment, not up for reconsideration per-task.

## Current phase — do not build ahead of this

**V1 = Phase 0 + Phase 1 only.** Systems catalog, CV generation, unified inquiry intake, admin curation, hardened 2FA auth, activity logging.

**Explicitly out of scope right now:** AI concierge, agent tools, testimonials, public API exposure beyond `/systems` read, full analytics dashboard. These are real and specified (Constitution §6, §8) but are V1.1 — do not scaffold them speculatively while V1 is incomplete.

## Stack

TypeScript strict mode, Next.js App Router, Tailwind, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, NextAuth.js, Prisma + PostgreSQL, Vercel, Sentry/Better Stack/Prometheus.

## Commands

```
npm run dev              # local dev server
npm run build             # production build
npm run lint               # eslint
npm run test               # jest/vitest — 70/20/10 unit/integration/E2E
npx prisma migrate dev    # apply schema changes — additive only, see BR-8.2 discipline
npx prisma db seed        # seed lookup tables, orgs, feature flags
```

## Local database setup

Two options — pick whichever is already working for you, neither is required over the other:

- **Docker (easier)**: `docker compose up -d` starts Postgres with `pgvector` already built in (`docker-compose.yml`, same image proven in CI). Set `DATABASE_URL` in `.env.local` to `postgresql://malulekeks:malulekeks_dev@localhost:5432/malulekeks?schema=public` (or match whatever host port you mapped it to), then run the commands above.
- **Native Postgres**: works too, but `pgvector` has no prebuilt Windows binaries — it must be compiled from source (Visual Studio Build Tools + `nmake`, following [pgvector's own Windows build docs](https://github.com/pgvector/pgvector#windows)). Docker sidesteps this entirely, which is why it's the easier default for a fresh clone.

## Non-negotiables when implementing

- BR-1.1: publishing blocked server-side when `clientApproved=false` and `clientVisibility != PUBLIC` — never a client-side-only check.
- BR-3.1: no write action succeeds without verified 2FA on the admin session.
- BR-4.1/4.2: agent tools are read-only except `submit_inquiry`, which goes through the identical validation and rate limit as the human form. No privileged bypass, ever.
- Every admin mutation writes to `ActivityLog` at the middleware layer, not opt-in per route.

## File layout (once scaffolded)

```
/docs/                          governing documents (this list, above)
/openapi-contract.yaml
/prisma/schema.prisma
/prisma/seed.ts
/lib/schemas.ts                 Zod, generated from openapi-contract.yaml
/.env.example
/app/                            Next.js App Router — routes per Constitution §12
/app/admin/                     2FA-gated admin surface
```
