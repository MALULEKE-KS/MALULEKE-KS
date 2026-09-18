# MALULEKE-KS — ENFORCEMENT REGISTER

**Derives from:** PLATFORM-CONSTITUTION-v1.md, BUSINESS-RULES-v1.md, PAGE-SPECIFICATIONS.md, DESIGN-SYSTEM.md, and the claims the public site itself makes.
**Purpose:** every promise this platform makes, mapped to *where it is actually enforced* — verified against the code, not assumed. A claim with no enforcement is a false statement in the owner's name; this register exists so there are none.
**Maintained:** every PR that adds, changes or enforces a claim updates its row here.

## How to read it

| Status | Meaning |
|---|---|
| ✅ | Enforced and verified in code |
| 🟡 | Enforced in one layer only, where a second (usually the database) is warranted — or enforced but unverified end to end |
| ❌ | Claimed but not enforced |
| ⏳ | Deferred to V1.1 by the Constitution (§13) — not a gap |

**Target layer** follows one principle — *put each guarantee where it can't be bypassed*: data invariants in the **database** (constraints, triggers, views, roles), workflow and authorization in the **app** (API/middleware), both where a bypass would be costly.

## 1. Content publishing (BR-1.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-1.1 | No publish while `clientVisibility ≠ PUBLIC` and `clientApproved = false`, server-side | `lib/rules/publishing.ts` `canPublish`, `PATCH /admin/systems/[id]` (409) | 🟡 | App + DB CHECK | F1.2 |
| BR-1.2 | `REQUIRES_APPROVAL` default for client orgs | `POST /admin/systems`, `github-sync.ts` | 🟡 | App + DB trigger | F1.2 |
| BR-1.3 | `NDA_RESTRICTED` never exposes repo/live URL publicly | Serialization in `publishing.ts` | 🟡 | DB public view | F1.7 |
| BR-1.4 | `ANONYMIZED_ONLY` never exposes the org name unless `nameDisclosureApproved` | Serialization in `publishing.ts` | 🟡 | DB public view | F1.7 |
| BR-1.5 | `contentStatus` fixed draft/published/archived | Prisma enum | ✅ | DB | — |
| BR-1.6 | Sync-created systems land `DRAFT` + `needsCuration` | `github-sync.ts` (sync never run) | 🟡 | App + DB default | F1.6 / F4 |
| BR-1.7 | **Revised by owner (2026-09-19):** private repos are synced too, shown as private with access on request; repo URL never exposed | Current code skips private repos; rule text not yet updated | ❌ | Rule text + DB flag + public view | F1.6 / F1.7 / F4 |
| BR-1.8 | `needsCuration` cleared on admin save | `PATCH /admin/systems/[id]` | ✅ | App | — |
| BR-1.9 | `System` never hard-deleted | No DELETE route exists | 🟡 | DB trigger blocks DELETE | F1.2 |
| BR-1.10 | Publish evaluated inside one transaction, re-reading state | `db.$transaction` in `PATCH /admin/systems/[id]` | ✅ | App (+ DB CHECK makes the race moot) | F1.2 |

## 2. Inquiries (BR-2.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-2.1 | `new → reviewed → responded/closed`, never skipped | `lib/rules/inquiries.ts`, `PATCH /admin/inquiries/[id]` | 🟡 | App + DB trigger | F1.2 |
| BR-2.2 | Every `new` inquiry reviewed within 48 hours | Nothing surfaces overdue inquiries | ❌ | Admin surfacing (overdue flag/query) | F2 |
| BR-2.3 | Name, valid email, message 20–5000 chars, type | Zod `InquiryCreateInputSchema` | 🟡 | App + DB CHECK | F1.2 |
| BR-2.4 | Max 5 per IP per 24h, no privileged bypass | `lib/auth/rate-limit.ts` — **check-then-increment race**; raw IP stored | ❌ | Atomic DB function, hashed key | F1.5 |
| BR-2.5 | `source` captured server-side, `"direct"` fallback | `POST /inquiries` | ✅ | App | — |
| BR-2.6 | Idempotency key dedupes within 10 minutes | `POST /inquiries` + unique index | ✅ | App + DB unique | — |
| BR-2.7 | Honeypot returns an identical 201, creates nothing | `POST /inquiries` | ✅ | App | — |

## 3. Admin security (BR-3.x) — re-verified end to end in F3

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-3.1 | No write without verified 2FA | `proxy.ts` session gate + `getSessionAdminId` per route | 🟡 | App (verify every route) | F3 |
| BR-3.2 | Progressive delay → lockout on failed logins | `failedLoginCount`/`lockedUntil` in login route | 🟡 | App + atomic counter | F3 |
| BR-3.3 | 30-minute idle expiry | `lib/auth/session.ts`, `proxy.ts` | 🟡 | App (verify) | F3 |
| BR-3.4 | Every mutation and every login attempt logged | 18/18 mutating routes call `logActivity`; **unknown-email failures not logged** (required FK); log is editable | ❌ | DB: append-only trigger, nullable actor; App: one shared layer | F1.3 / F2 |
| BR-3.5 | Challenge token: 5 minutes, single use | Login + verify-2fa routes | 🟡 | App + DB CHECK | F3 |
| BR-3.6 | 5 failed TOTP attempts invalidate the token | verify-2fa route (`attempts`) | 🟡 | App + atomic increment | F3 |
| BR-3.7 | 12-hour absolute session lifetime | `lib/auth/session.ts` | 🟡 | App (verify) | F3 |
| BR-3.8 | New session ID minted after 2FA | `verify-2fa` + `session.ts` | 🟡 | App (verify) | F3 |
| BR-3.9 | CSRF protection on admin mutations | `SameSite=Strict` cookie | 🟡 | App + origin check | F3 |
| BR-3.10 | Admin email lowercase on write and lookup | App `toLowerCase` | 🟡 | DB CHECK / citext | F1.2 |
| BR-3.11 | Exactly 10 recovery codes, hashed, single-use | `create-admin.ts`, verify-2fa | 🟡 | App (verify) | F3 |
| BR-3.12 | Dashboard warns when < 3 recovery codes remain | **Not implemented** | ❌ | App | F3 |
| BR-3.13 | No self-serve reset; manual operator procedure | No reset route exists; procedure documented? | 🟡 | Docs runbook | F3 |

## 4. AI & agents (BR-4.x)

| Rule | Claim | Status |
|---|---|---|
| BR-4.1 – BR-4.5 | Read-only tools except `submit_inquiry`; grounded answers; tools ship disabled; copilot drafts only | ⏳ V1.1 (no AI layer built). `Flag` rows seeded disabled ✅ (BR-4.4 default) |

## 5. Analytics & privacy (BR-5.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-5.1 / 5.4 | No event before consent; applies to Vercel Analytics too | No events are collected yet; no consent banner | 🟡 (vacuously true) | App — required before any analytics ships | F5 |
| BR-5.2 | `Inquiry`/`Event` anonymized or purged after 24 months; scheduled | **Not implemented** (scheduler is a `TODO`) | ❌ | DB function + scheduled job + `JobRun` log | F1.6 / F4 |
| BR-5.3 | Public stats are curated, point-in-time | Home counts come from curated `System` rows | ✅ | App | — |
| BR-5.5 | Deletion right honoured manually; stated on confirmation | Confirmation copy doesn't state it | ❌ | App copy | F5 |
| BR-2.4 (privacy) | IP kept only as long as the window needs | Raw IPs stored; expired rows never pruned | ❌ | Hashed keys + prune job | F1.5 / F4 |

## 6. Testimonials (BR-6.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-6.1 | `hasPermission = false` never public | Query filter in `publishing.ts` | 🟡 | DB public view | F1.7 |
| BR-6.2 | Only for published systems | Query filter | 🟡 | DB public view | F1.7 |

## 7. CV & documents (BR-7.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-7.1 | Generated from live data at generation time | `POST /cv/generate` | ✅ | App | — |
| BR-7.2 | Prior documents superseded, not deleted | `lib/rules/cv.ts` | 🟡 | App + DB trigger blocks DELETE | F1.2 |

## 8. Extension governance (BR-8.x) & Constitution

| Claim | Source | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| New lookup values without a deploy | BR-8.1 | `POST /lookups/{type}` — **fails for `status`** (`colorToken` required, not supplied) | ❌ | DB default + API | F1.6 |
| In-use lookup values soft-deprecated, never hard-deleted | BR-8.2 | Deprecate route; no delete route | ✅ | App (+ FK RESTRICT) | — |
| Re-creating a deprecated key returns `LOOKUP_KEY_DEPRECATED` | BR-8.3 | **Not implemented** — raw unique-constraint error | ❌ | App | F2 |
| Open sets are lookup tables, not enums | EXT-1 | Status/Domain/InquiryType/MilestoneType/SkillCategory are tables — but homepage stats hardcode status keys | 🟡 | DB `PipelineStage` on `Status` | F1.6 |
| Additive-only migrations | EXT-1 | CI `migration-check` (drift) + review | 🟡 | CI + docs | F1.9 |
| Every admin mutation logged at the middleware layer | CLAUDE.md, BR-3.4 | Per-route calls (18/18), not a shared layer | 🟡 | One shared layer | F2 |
| New tools/lenses/sections ship disabled | EXT-1, BR-4.4 | `Flag.enabled` defaults false | ✅ | DB default | — |
| Versioned API `/api/v1` | EXT-1 | All routes under `/api/v1` | ✅ | App | — |
| Nothing about the owner hardcoded | Owner directive 2026-09-18 | Name, role, links, mission, principles in `lib/content/*` | ❌ | DB `Profile`, `Achievement`, content | F1.6 |
| Pre-launch: sitemap, OG images, JSON-LD, canonical URLs | Constitution §9 | Not verified | ❌/? | App | F5 |
| Pre-launch: static CV PDF hosted independently | Constitution §9 | Not verified | ❌/? | Ops | F4 |
| Backup / restore drill | Constitution §11 Phase 2 | Neon point-in-time recovery exists; never drilled | 🟡 | Ops runbook + drill | F4 |

## 9. Claims the public site makes

| Where | Claim | Backed by | Status |
|---|---|---|---|
| Footer, home contact band, contact confirmation | "Reply within 48 hours" / "I'll get back to you within 48 hours" | BR-2.2 promises **review** within 48h, not a reply — and nothing enforces even that | ❌ owner decision |
| Home hero | "Live data, as of …" | Counts computed per request | ✅ |
| Home stack card | "Type-checked end to end", "Tested in CI on every change", "Deployed on Vercel from main" | `tsc --noEmit` in CI; CI on every PR; Vercel Git integration | ✅ |
| Home pipeline | "N shipped / N in the queue" | Status keys hardcoded; "in progress" not counted separately | 🟡 → F1.6 |

---

*A claim moves to ✅ only with a test that would fail if the enforcement were removed.*
