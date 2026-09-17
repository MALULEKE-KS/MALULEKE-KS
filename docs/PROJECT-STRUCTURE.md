# MALULEKE-KS — PROJECT FILE STRUCTURE v1.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md §12 (route map)
**Convention basis:** Next.js App Router, route-group separation by access level, colocation over shared-folder sprawl, Ports & Adapters made visible in the folder tree itself (EXT-1 — the adapter pattern isn't just a coding practice, the structure enforces it)

```
malulekeks/
├── CLAUDE.md                          # Claude Code reads this automatically
├── .env.example
├── .env.local                         # gitignored — real secrets
├── openapi-contract.yaml              # source of truth — schemas.ts is generated from this
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
│
├── docs/                              # the four (now five) governing documents
│   ├── PLATFORM-CONSTITUTION-v1.md
│   ├── PLATFORM-OVERVIEW-AND-RATIONALE.md
│   ├── BUSINESS-RULES-v1.md
│   ├── DESIGN-SYSTEM.md
│   └── PAGE-SPECIFICATIONS.md
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/                    # additive-only, per BR-8.1 — CI enforces this (migration-check job)
│
├── scripts/
│   └── github-sync.ts                 # runner-agnostic — wire one scheduler adapter to it, see lib/adapters/scheduler/
│
├── hooks/
│   └── useTypewriterLines.ts          # sequencing for LedgerHero — see Design System §7
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── proxy.ts                            # session check, rate limiting hook — runs before every request
│                                        # (Next.js 16 renamed "middleware.ts" -> "proxy.ts"; same role)
│
├── lib/
│   ├── db.ts                          # Prisma client singleton
│   ├── schemas.ts                     # Zod, generated from openapi-contract.yaml
│   │
│   ├── adapters/                      # Ports & Adapters, made literal (EXT-1) — every external
│   │   │                              # dependency behind an interface here. Core logic imports
│   │   │                              # the interface, never the vendor SDK directly.
│   │   ├── ai/
│   │   │   ├── ai-provider.interface.ts
│   │   │   └── anthropic-provider.ts  # today's implementation — swappable without touching callers
│   │   ├── analytics/
│   │   │   ├── analytics-provider.interface.ts
│   │   │   └── vercel-analytics-provider.ts
│   │   ├── storage/
│   │   │   ├── storage-provider.interface.ts
│   │   │   └── vercel-blob-provider.ts
│   │   └── scheduler/
│   │       └── vercel-cron-adapter.ts # calls scripts/github-sync.ts — swap for BullMQ later, zero change upstream
│   │
│   ├── auth/
│   │   ├── session.ts                 # 2FA-gated session helpers (BR-3.1)
│   │   ├── rate-limit.ts              # BR-2.4, BR-3.2 — shared limiter, not duplicated per route
│   │   └── activity-log.ts            # BR-3.4 — the one write path every mutation calls through
│   │
│   ├── rules/                         # business rules as enforceable code, not just prose —
│   │   │                              # one file per BR-x.x cluster, so BUSINESS-RULES-v1.md
│   │   │                              # and this folder stay in lockstep
│   │   ├── publishing.ts              # BR-1.1 – BR-1.6
│   │   ├── inquiries.ts               # BR-2.1 – BR-2.5
│   │   └── lookups.ts                 # BR-8.1, BR-8.2
│   │
│   └── flags.ts                       # reads the Flag table — every Tier 2 tool checks here first (BR-4.4)
│
├── components/
│   ├── ui/                            # shadcn/ui primitives — unmodified except via shadcn's own CLI
│   ├── shared/                        # cross-cutting, content-aware components
│   │   ├── StatusBadge.tsx            # color IS the status (Design System §3) — one component, every list
│   │   ├── RuleCitation.tsx           # renders "BR-1.1" style references, mono, linked
│   │   └── VisitorLensProvider.tsx    # session-level lens context (Constitution §4)
│   ├── home/                          # colocated — only ever rendered on / (Design System §7)
│   │   ├── LedgerHero.tsx
│   │   └── ScaleFigure.tsx            # self-drawing scale-figure line art, synced to LedgerHero's typewriter timing
│   └── admin/
│       └── ActivityLogTable.tsx
│
├── app/
│   ├── layout.tsx                     # root layout — fonts, VisitorLensProvider
│   ├── globals.css
│   │
│   ├── (public)/                      # route group — no auth, visitor-facing
│   │   ├── page.tsx                   # / — lens-aware home
│   │   ├── systems/
│   │   │   ├── page.tsx               # /systems — catalog
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # /systems/[slug] — case study
│   │   ├── journey/page.tsx
│   │   ├── cv/page.tsx
│   │   ├── how-i-build/page.tsx
│   │   ├── about/page.tsx
│   │   └── contact/
│   │       ├── page.tsx
│   │       └── _components/
│   │           └── InquiryForm.tsx    # colocated — only used on this route
│   │
│   ├── (admin)/                       # route group — every route here requires 2FA session (proxy.ts)
│   │   └── admin/
│   │       ├── login/
│   │       │   └── page.tsx           # the two-step flow — Design System §5
│   │       ├── page.tsx               # dashboard overview
│   │       ├── systems/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── inquiries/page.tsx     # triage inbox
│   │       ├── timeline/page.tsx
│   │       ├── cv/page.tsx
│   │       ├── settings/page.tsx      # flags, lenses, lookup-table management
│   │       └── activity-log/page.tsx
│   │
│   └── api/
│       └── v1/                        # mirrors openapi-contract.yaml path-for-path — no divergence
│           ├── systems/
│           │   ├── route.ts
│           │   └── [slug]/route.ts
│           ├── inquiries/route.ts
│           ├── lookups/[type]/route.ts
│           ├── admin/
│           │   ├── systems/
│           │   │   ├── route.ts
│           │   │   └── [id]/route.ts
│           │   ├── inquiries/
│           │   │   ├── route.ts
│           │   │   └── [id]/route.ts
│           │   ├── auth/
│           │   │   ├── login/route.ts
│           │   │   └── verify-2fa/route.ts
│           │   ├── timeline/
│           │   │   ├── route.ts
│           │   │   └── [id]/route.ts
│           │   ├── cv/
│           │   │   ├── experience/
│           │   │   │   ├── route.ts
│           │   │   │   └── [id]/route.ts
│           │   │   ├── education/
│           │   │   │   ├── route.ts
│           │   │   │   └── [id]/route.ts
│           │   │   └── skills/
│           │   │       ├── route.ts
│           │   │       └── [id]/route.ts
│           │   ├── settings/
│           │   │   ├── flags/
│           │   │   │   ├── route.ts
│           │   │   │   └── [key]/route.ts
│           │   │   └── lenses/
│           │   │       ├── route.ts
│           │   │       └── [id]/route.ts
│           │   └── activity-log/route.ts
│           ├── timeline/route.ts
│           └── cv/generate/route.ts
│
└── tests/
    ├── unit/                          # 70%
    ├── integration/                   # 20%
    ├── e2e/                           # 10% — Playwright
    └── ai-evals/                      # fourth category, Constitution §6 — not part of the 70/20/10 split
```

## Conventions worth stating explicitly

- **Route groups by access level, not by feature.** `(public)` and `(admin)` split at the top, because the access boundary — not the content type — is the thing that must never leak across a route by accident.
- **`_components/` colocation for single-route components; `components/shared/` only for genuinely cross-cutting ones.** A component used on one page lives next to that page. Promoting it to `shared/` is a deliberate act when a second route needs it, not a default.
- **`lib/adapters/` makes Ports & Adapters visible in the tree, not just in code review.** Anyone — including a future Claude Code session — can see at a glance which three or four files own a vendor dependency, and knows the rest of the codebase should never import that vendor's SDK directly.
- **`lib/rules/` exists so the business rules document and the code can't quietly drift apart.** A rule changing in `BUSINESS-RULES-v1.md` without a corresponding change here is a signal something was missed, not a normal state.
- **`app/api/v1/` mirrors the OpenAPI paths exactly.** If a route exists in code with no matching path in `openapi-contract.yaml`, that's the contract-first rule being violated, not a shortcut.
