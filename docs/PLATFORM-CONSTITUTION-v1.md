# MALULEKE-KS — SYSTEM CONSTITUTION v1.0

**Owner:** Kurhula Success Maluleke
**Platform name:** MALULEKE-KS — the technical identity (domain, repo, dev-facing contexts). The human-facing display name used across site content (hero, CV title, meta titles) is "Kurhula Success Maluleke."
**Status:** Locked
**Scope:** This document governs the full system. All schema, route, and implementation decisions must cite back to a rule here. Where later documentation (schema docs, API docs, runbooks) is written, it derives from this file and must not contradict it.

---

## 0. What This System Is

Not a portfolio site. A full-stack, database-backed personal platform: every system Kurhula has built or is building, his CV and academic record, his career and life journey, a unified way for visitors to reach him, and a scoped AI layer — all under one Next.js codebase, built so nothing in it is ever locked to a fixed set of values.

**Audiences it must serve simultaneously:** technical recruiters, non-technical hiring panels, fintech/GovTech/architecture client prospects, academic and grad-school reviewers, fellow engineers, investors/co-founder prospects, press, networking-event scans, returning visitors, and AI crawlers/LLMs summarizing him.

---

## 1. Governing Principles

### Rule EXT-1 — Extension Over Modification
*Any dimension of this system expected to grow must grow through data or configuration, not through a code change and a redeploy.*

Applies at two levels:

**Data level** — open sets are lookup tables, not enums: system status, domain, inquiry type, milestone type, skill category, visitor lens. Analytics events and AI-retrieval sources are generic tables (`Event`, `ContentChunk`) keyed by entity type, so new event types or new indexed content types are rows, not migrations.

**Code level** — Open/Closed Principle enforced via architecture:
- **Ports & Adapters** for every external dependency (AI provider, analytics provider, auth, storage). Core logic calls an interface; only the adapter knows the vendor.
- **Dependency injection** in the AI orchestration layer — model, embedding, and vector-store providers are swappable without touching the tool registry.
- **Feature flags** (`Flag` table) for new agent tools, lenses, or page sections — shippable disabled, activated without a deploy.
- **Additive-only migrations** — never a destructive rename/drop in place; deprecate, migrate readers, then remove.
- **Versioned API** (`/api/v1`) — changes within a version are additive only; breaking changes get a new version, the old one keeps serving.
- **Config/props-driven frontend components** — a component renders what it's given; it doesn't know or hardcode where the content came from.

**Where EXT-1 does NOT apply** — deliberately fixed, not neglected:
- `AdminUser` role model — single owner, one row. A `role` field gives headroom; no RBAC engine for a hypothetical future user.
- Core stack — Next.js, Postgres, Prisma, Vercel. Foundational commitments, not content dimensions.
- `ClientVisibility` — a fixed compliance state machine, not a growing content set. EXT-1 governs open sets, not control states.

Over-abstracting the parts that were never going to change is the same failure as under-engineering the parts that will — both cost real time for no real flexibility.

### Principle — Smart Not Hard
Buy the commodity, build the differentiated. Example applied throughout: raw pageview/referrer tracking is bought (Vercel Analytics); attribution that joins visitor behavior to `System` and `Inquiry` data is built (first-party `Event` table), because only the second part needs to talk to this system's own data.

### Principle — Controlled Imperfection Engineering / Closed-Loop Learning
Reused from Kurhula's own doctrine (as applied on Xkimm Xa Mali): failures are predictable and traceable, not chased into perfection. Every admin action writes to `ActivityLog`. The concierge's most-asked-unanswered questions feed directly into what content gets prioritized next — the platform learns from its own usage the same way an incident produces a runbook.

### Principle — Permission Boundaries
No AI acts autonomously on anything critical. Applied concretely in Section 6.

---

## 2. Framework & Stack

**Single consolidated Next.js App Router platform.** Per Kurhula's own framework-assignment rule — Next.js for content-driven, SEO-critical platforms — this is a Next.js system, full stop.

The existing Angular portfolio is **not rebuilt or merged.** It stays live at its own URL and becomes one row in the `System` table: a case study titled "Cross-framework fluency," linking out to its own repo and live deployment. Proof without a second platform to maintain.

| Layer | Choice |
|---|---|
| Language | TypeScript, strict mode |
| Frontend | Next.js App Router, React, Tailwind, shadcn/ui |
| State | TanStack Query (server), Zustand (client), React Hook Form + Zod |
| Backend | Next.js API Routes, NextAuth.js |
| Database | PostgreSQL via Prisma; pgvector extension for AI retrieval |
| AI | Vercel AI SDK, kept inside the Next.js app — not a separate FastAPI/LangChain microservice. Revisit only if the AI layer itself later earns flagship status on its own |
| Infra | Vercel (app), GitHub Actions (CI, incl. AI evals) |
| Monitoring | Sentry, Better Stack, Prometheus |
| Testing | Jest/Vitest/Playwright, 70/20/10 unit/integration/E2E, plus a fourth category — AI evals (Section 6) |

---

## 3. Data Model

### Core entities

- **Organization** — KSDRILL-SA, GrowthCore Solutions, Personal. `isClient` flag for entities like Sunduza.
- **System** — every project across every org. GitHub-synced where public, curated where private. Linked to `Status` and `Domain` (both lookup tables), carries `clientVisibility`, `clientApproved`, `contentStatus`, `isFlagship`, `sortOrder`.
- **Timeline** — unified life/career/academic milestones, typed via `MilestoneType` lookup table.
- **Experience** / **Education** — CV backbone.
- **Skill** — linked to the `System` and `Experience` rows that actually prove it, not a floating tag.
- **DocumentGen** — CV/resume, generated from the structured data above on demand. One source of truth.
- **Impact** — quantified metrics per system (audit findings closed, uptime, records processed).
- **Testimonial** — client/partner quotes, gated by `hasPermission`.
- **Inquiry** — one table, `InquiryType` lookup (hire/partnership/service/contribution/recruitment/collaboration, extendable), `source` for attribution.
- **ActivityLog** — every admin mutation, automatic.
- **AdminUser** — single owner, 2FA-hardened (Section 5).
- **VisitorLens** — persona config (Section 4): priority content + AI framing prompt per lens.
- **Event** — generic analytics event table (Section 7).
- **ContentChunk** — generic AI-retrieval index across any entity type (Section 6).
- **Flag** — feature flags.

### Prisma schema

*The block below is the conceptual model. `prisma/schema.prisma` is the authoritative, implementation-level source of truth — it refines this with enums in place of loose strings, explicit `onDelete` behavior, indexes, and a small number of hardening fields (e.g. a stable GitHub repo identifier, lookup-table color tokens) that exist to satisfy BR-x.x rules precisely. Where the two differ, the Prisma file wins; this block should not be hand-copied into migrations.*

```prisma
// ============================================================
// AUTH & ACCESS
// ============================================================

model AdminUser {
  id               String    @id @default(cuid())
  email            String    @unique
  passwordHash     String
  role             String    @default("owner")
  twoFactorSecret  String?
  twoFactorEnabled Boolean   @default(false)
  recoveryCodes    String[]
  failedLoginCount Int       @default(0)
  lockedUntil      DateTime?
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  activityLogs     ActivityLog[]
}

model ActivityLog {
  id          String    @id @default(cuid())
  adminUserId String
  adminUser   AdminUser @relation(fields: [adminUserId], references: [id])
  action      String    // "system.update" | "auth.login" | "auth.login_failed" | ...
  entityType  String?
  entityId    String?
  before      Json?
  after       Json?
  createdAt   DateTime  @default(now())
}

// ============================================================
// ORGANIZATIONS & SYSTEMS
// ============================================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  role      String?  // "Founder", "Co-founder"
  isClient  Boolean  @default(false)
  systems   System[]
  createdAt DateTime @default(now())
}

model Status {
  id      String   @id @default(cuid())
  key     String   @unique // "finished" | "in_progress" | "planned" — extendable
  label   String
  systems System[]
}

model Domain {
  id      String   @id @default(cuid())
  key     String   @unique // "fintech" | "govtech" | "edtech" — extendable
  label   String
  systems System[]
}

enum ClientVisibility {
  PUBLIC
  REQUIRES_APPROVAL
  NDA_RESTRICTED
  ANONYMIZED_ONLY
}

model System {
  id               String    @id @default(cuid())
  name             String
  slug             String    @unique
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])
  statusId         String
  status           Status    @relation(fields: [statusId], references: [id])
  domainId         String?
  domain           Domain?   @relation(fields: [domainId], references: [id])
  description      String
  repoUrl          String?
  liveUrl          String?
  techStack        String[]
  isFlagship       Boolean   @default(false)
  sortOrder        Int       @default(0)
  clientVisibility ClientVisibility @default(PUBLIC)
  clientApproved   Boolean   @default(false)
  contentStatus    String    @default("draft") // draft | published
  caseStudyBody    String?   // MDX
  impacts          Impact[]
  testimonials     Testimonial[]
  skills           SkillOnSystem[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model Impact {
  id        String @id @default(cuid())
  systemId  String
  system    System @relation(fields: [systemId], references: [id])
  label     String // "Audit findings closed"
  value     String // "58"
  sortOrder Int    @default(0)
}

model Testimonial {
  id            String   @id @default(cuid())
  systemId      String?
  system        System?  @relation(fields: [systemId], references: [id])
  authorName    String
  authorRole    String?
  organization  String?
  quote         String
  hasPermission Boolean  @default(false)
  createdAt     DateTime @default(now())
}

// ============================================================
// CAREER & ACADEMIC RECORD
// ============================================================

model MilestoneType {
  id              String     @id @default(cuid())
  key             String     @unique // "education" | "job" | "launch" | "achievement" | "personal"
  label           String
  timelineEntries Timeline[]
}

model Timeline {
  id              String        @id @default(cuid())
  milestoneTypeId String
  milestoneType   MilestoneType @relation(fields: [milestoneTypeId], references: [id])
  title           String
  description     String?
  date            DateTime
  media           String?
  tags            String[]
  createdAt       DateTime      @default(now())
}

model Experience {
  id           String   @id @default(cuid())
  title        String
  organization String
  startDate    DateTime
  endDate      DateTime?
  description  String
  skills       SkillOnExperience[]
}

model Education {
  id            String    @id @default(cuid())
  institution   String
  qualification String
  startDate     DateTime
  endDate       DateTime?
  honors        String?
}

model SkillCategory {
  id     String  @id @default(cuid())
  key    String  @unique
  label  String
  skills Skill[]
}

model Skill {
  id              String   @id @default(cuid())
  name            String   @unique
  categoryId      String
  category        SkillCategory @relation(fields: [categoryId], references: [id])
  yearsExperience Float?
  systems         SkillOnSystem[]
  experiences     SkillOnExperience[]
}

model SkillOnSystem {
  skillId  String
  systemId String
  skill    Skill  @relation(fields: [skillId], references: [id])
  system   System @relation(fields: [systemId], references: [id])
  @@id([skillId, systemId])
}

model SkillOnExperience {
  skillId      String
  experienceId String
  skill        Skill      @relation(fields: [skillId], references: [id])
  experience   Experience @relation(fields: [experienceId], references: [id])
  @@id([skillId, experienceId])
}

model DocumentGen {
  id          String   @id @default(cuid())
  type        String   // "cv" | "resume-tailored"
  targetRole  String?
  generatedAt DateTime @default(now())
  fileUrl     String
}

// ============================================================
// VISITOR INTAKE
// ============================================================

model InquiryType {
  id        String    @id @default(cuid())
  key       String    @unique // "hire" | "partnership" | "service" | "contribution" | "recruitment" | "collaboration"
  label     String
  inquiries Inquiry[]
}

model Inquiry {
  id            String      @id @default(cuid())
  inquiryTypeId String
  inquiryType   InquiryType @relation(fields: [inquiryTypeId], references: [id])
  name          String
  email         String
  message       String
  source        String?     // referring page/system — attribution
  status        String      @default("new") // new | reviewed | responded | closed
  createdAt     DateTime    @default(now())
}

// ============================================================
// VISITOR SEGMENTATION, AI, ANALYTICS
// ============================================================

model VisitorLens {
  id              String @id @default(cuid())
  key             String @unique // "recruiter" | "client-fintech" | "academic" | ...
  label           String
  priorityContent Json   // which systems/sections surface first
  aiFramingPrompt String
}

model Event {
  id         String   @id @default(cuid())
  eventType  String   // "page_view" | "system_viewed" | "concierge_message" | "resume_downloaded"
  entityType String?
  entityId   String?
  sessionId  String
  metadata   Json?
  createdAt  DateTime @default(now())
}

model ContentChunk {
  id         String                    @id @default(cuid())
  entityType String                    // "system" | "timeline" | "skill" | "document"
  entityId   String
  content    String
  embedding  Unsupported("vector(1536)")
  createdAt  DateTime                  @default(now())
}

model Flag {
  id      String  @id @default(cuid())
  key     String  @unique
  enabled Boolean @default(false)
  notes   String?
}
```

---

## 4. Visitor Segmentation

One adaptive lens, not per-persona pages. A short intent signal (2-tap picker or the concierge reading the opening message) sets a session-level `VisitorLens`, which reorders the same underlying data.

| Lens | Priority content |
|---|---|
| Technical recruiter / hiring manager | Skills matrix backed by shipped systems |
| Non-technical HR / hiring panel | Plain-language career story, credibility signals |
| Fintech client prospect | Xkimm Xa Mali, FundsLink-Academy |
| GovTech client prospect | Governova |
| Architecture/construction client prospect | Sunduza |
| Grad school / academic reviewer | Coursework, algorithmic projects, research framing |
| Fellow engineer / OSS collaborator | Code quality, contribution paths |
| Investor / co-founder prospect | Org structure, traction |
| Press / media | Bio, quotable facts |
| Networking-event scan | Single-screen digital card, no scroll |
| Returning visitor | Session-remembered context, no login required |
| AI crawlers / other LLMs | Structured JSON-LD, `llms.txt`, clean OpenGraph |

---

## 5. Security & Access

- **AdminUser**: TOTP 2FA, mandatory, 10 recovery codes generated once at setup (BR-3.11). Progressive delay on failed logins (reusing the existing brute-force pattern), plus independent rate-limiting on the 2FA verification step itself so a stolen login-challenge token can't be brute-forced (BR-3.5, BR-3.6). Session timeout on inactivity (30 min) *and* a hard 12-hour absolute session lifetime regardless of activity (BR-3.7). Session ID is re-minted after 2FA success, not reused from the pre-2FA state (BR-3.8, anti-fixation). Every mutating admin request is CSRF-protected (BR-3.9). Every login attempt — success or failure — writes to `ActivityLog`. Account recovery from total lockout (password + all recovery codes lost) is a documented manual operator procedure, not a self-serve flow — there is deliberately no email-based password reset in V1 for a single-owner account (BR-3.13).
- **Visitors**: read-only across the entire public surface except the single unified `Inquiry` submission path. No visitor accounts.
- **Permission boundary applied to AI** (Section 6): the only write path an AI agent can ever trigger is `submit_inquiry` — the same path the human form uses. Nothing resembling an L3/L4 action is ever autonomous.

---

## 6. AI Layer

**Tier 1 — Concierge (visitor-facing).** A top-tier current model, grounded via retrieval over `ContentChunk` (spanning System, Timeline, Skill, DocumentGen), free to draw on its own general CS/mathematics knowledge otherwise. Framed per active `VisitorLens`.

**Tier 2 — Agentic, on a short leash.** A tool registry, not a hardcoded allow-list — each tool self-declares name, scope, and risk tier, and can be enabled/disabled via `Flag`.

| Tool | Type |
|---|---|
| `search_systems(query)` | read |
| `tailor_cv(role_type)` | read + synthesize, never invents facts |
| `check_availability()` | read (if calendar connected) |
| `submit_inquiry(type, details)` | **the one write action** |

Everything else — editing `System`, `Timeline`, `Skill`, or any content — stays admin-panel-only, human-approved.

**Admin copilot** (assists Kurhula, not visitors): drafts case studies from README/commit history, flags skills with no supporting system behind them, drafts inquiry replies.

**AI eval strategy** — a fourth test category alongside 70/20/10: an `EvalCase` fixture set (prompt, category — factual grounding / scope boundary / tone — expected-behavior assertion), run in CI on every change to the system prompt or grounding data. A failing eval blocks merge like a failing unit test.

---

## 7. Content Governance

- `System.clientVisibility` defaults to `REQUIRES_APPROVAL` for any system linked to a client `Organization`.
- The `contentStatus` transition `draft → published` is blocked at the API level unless `clientApproved = true`.
- Applies immediately to Sunduza, and to FundsLink-Academy/Governova if either has a client relationship behind it.

---

## 8. Analytics

**Admin (private, full detail):** traffic sources, per-`System` view counts, view → concierge → `Inquiry` funnel by source, concierge question trends feeding the closed-loop-learning principle.

**Public (curated, not raw):** a "By the numbers" section on About/How-I-Build — systems shipped, organizations run, audit findings closed. No live visitor counter — it undercuts the production-grade story rather than supporting it.

**Supporting requirements:** Vercel Analytics for commodity traffic metrics; first-party `Event` table only for what must join to `System`/`Inquiry`; bot/AI-crawler filtering (crawlers are now a legitimate audience, not just noise); consent banner tied to the POPIA work below; async/non-blocking collection; retention window shared with `Inquiry`.

---

## 9. Pre-Launch Requirements

| Item | Requirement |
|---|---|
| Privacy (POPIA) | Privacy policy, stated retention period on `Inquiry` and `Event`, consent for chat logs and analytics |
| AI abuse protection | Per-session rate limiting, injection-attempt sanitization, daily token/cost cap, logging of flagged inputs |
| Canonical domain | One custom domain; every other URL 301-redirects to it |
| Draft/publish states | `contentStatus` separate from `Status` (build lifecycle) — a case study can be written and previewed before it's public |
| SEO | Sitemap, dynamic OG images per case study, JSON-LD, canonical URLs |
| Performance | ISR for near-static case studies, dynamic rendering for concierge/admin, image optimization |
| Accessibility | WCAG attention, relevant given Governova's GovTech angle |
| Continuity fallback | A static CV PDF hosted independently of the platform |

---

## 10. Extension Points Registry

The direct index of every deliberate seam — read this instead of rediscovering the architecture from code:

- Lookup tables: `Status`, `Domain`, `InquiryType`, `MilestoneType`, `SkillCategory`
- Config tables: `VisitorLens`, `Flag`
- Generic tables: `Event`, `ContentChunk`
- Tool registry: Tier 2 agent tools
- Adapter interfaces: AI provider, analytics provider, auth provider, storage
- Section registry: frontend page composition
- API versioning: `/api/v1`

---

## 11. Build Phases & V1 Scope

| Phase | Scope |
|---|---|
| **0 — Foundation** | Full schema, GitHub sync job, admin auth + 2FA, App Router shell, design tokens |
| **1 — Core Architecture** | Systems catalog (filterable by org/domain/status), CV generation, unified inquiry intake, admin curation UI, activity logging live |
| **2 — Quality & Reliability** | Sentry/Better Stack/Prometheus, 70/20/10 + AI evals, rate limiting, backup drill |
| **3 — Product** | Concierge, agent tools, admin copilot, testimonials, impact fields, public API, full analytics, "How I Build" page |

**V1 = Phase 0 + Phase 1.** Systems catalog, CV, unified inquiry, admin curation, hardened auth. A genuine, launchable platform on its own.

**V1.1 = Phase 2 + Phase 3.** Concierge, agent tools, testimonials, public API, full analytics. Nothing here blocks first launch.

---

## 12. Information Architecture / Route Map

**Public**
```
/                        lens-aware home
/systems                 catalog — filter by org, domain, status
/systems/[slug]          case study
/journey                 timeline
/cv                      view + generated download
/how-i-build             methodology & principles
/about
/contact                 unified inquiry form
/api/v1/systems          public read API
/api/v1/systems/[slug]
```

**Admin** (2FA-gated, under `/admin`)
```
/admin/login
/admin                   dashboard overview
/admin/systems
/admin/systems/[id]
/admin/inquiries         triage inbox
/admin/timeline
/admin/cv                Experience / Education / Skill management
/admin/testimonials
/admin/analytics
/admin/settings          flags, lenses, lookup-table management
/admin/activity-log
```

**V1.1 additions**
```
concierge widget         embedded component, all public pages
/api/v1/agent/*           scoped tool endpoints
```

---

## 13. Deferred to V1.1 — Explicitly, Not Forgotten

Concierge and agent tools, testimonials, impact fields, public API exposure, full analytics dashboard, "How I Build" page, i18n (structure left open, not built), self-serve visitor data-deletion endpoint (BR-5.5 — the *right* is honored manually from launch, the automated path is deferred). Every item here is a locked decision to defer, not an open question.

---

*End of Constitution v1.0. All future documentation — schema migrations, API reference, runbooks — derives from and must not contradict this document.*
