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
| BR-1.1 | No publish while `clientVisibility ≠ PUBLIC` and `clientApproved = false`, server-side | `canPublish` + 409 in the API; CHECK `System_br_1_1_publish_requires_approval` — enforced in the database too (F1.2, #60) | ✅ | App + DB CHECK | — |
| BR-1.2 | `REQUIRES_APPROVAL` default for client orgs | API + sync; trigger `System_br_1_2_client_default` — enforced in the database too (F1.2, #60) | ✅ | App + DB trigger | — |
| BR-1.3 | `NDA_RESTRICTED` never exposes repo/live URL publicly | View `PublicSystem` nulls repo, live link and screenshot; every public read uses the view (#72); tested | ✅ | DB public view | Role lock-down → F1.8 |
| BR-1.4 | `ANONYMIZED_ONLY` never exposes the org name unless `nameDisclosureApproved` — including through the organization list and filter | View `PublicSystem` masks the name and drops the org slug; `PublicOrganization` lists only disclosed organizations; `PublicTestimonial` masks the organization. **Fixed a live leak:** the organization list named an anonymized client (#72); tested | ✅ | DB public views | Role lock-down → F1.8 |
| BR-1.5 | `contentStatus` fixed draft/published/archived | Prisma enum | ✅ | DB | — |
| BR-1.6 | Sync-created systems land `DRAFT` + `needsCuration` | `github-sync.ts` (sync never run) | 🟡 | App + DB default | F1.6 / F4 |
| BR-1.7 | **Revised by owner (2026-09-19):** private repos are synced too, shown as private with access on request; repo URL never exposed | Rule text rewritten (#70); `System.repoPrivate`; the public serializer returns `repoUrl: null` + `repoPrivate: true` (tested). The sync still skips private repos until it is rebuilt | 🟡 | DB public view + sync | F1.7 / F4 |
| BR-1.8 | `needsCuration` cleared on admin save | `PATCH /admin/systems/[id]` | ✅ | App | — |
| BR-1.9 | `System` never hard-deleted | No DELETE route; trigger `System_br_1_9_no_delete` — enforced in the database too (F1.2, #60) | ✅ | DB trigger | — |
| BR-1.10 | Publish evaluated inside one transaction, re-reading state | `db.$transaction` in `PATCH /admin/systems/[id]`; the BR-1.1 CHECK now makes the race moot | ✅ | App + DB | — |
| BR-1.11 | A collaborated system is published only with the repo owner's recorded permission; relationships are a lookup | Trigger `System_br_1_11_owner_permission` (normalises the answer, stamps its time, refuses publishing without GRANTED), CHECK `System_br_1_11_answer_has_source`, trigger `RepoRelationship_br_1_11_recheck`; API answers 409 `OWNER_PERMISSION_REQUIRED` (#69); tested | ✅ | DB triggers + App | — |
| BR-1.12 | A journey entry about a system is public only while that system is published; first ships are auto-drafted, never auto-published | Trigger `System_status_history` drafts the entry (DRAFT, one per system — partial unique index); public reads use the `PublicTimeline` view (#72); tested | ✅ | DB trigger + public view | — |

## 2. Inquiries (BR-2.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-2.1 | `new → reviewed → responded/closed`, never skipped | `lib/rules/inquiries.ts`; trigger `Inquiry_br_2_1_workflow` (start NEW, valid transitions only) — enforced in the database too (F1.2, #60) | ✅ | App + DB trigger | — |
| BR-2.2 | Every `new` inquiry reviewed within 48 hours | Nothing surfaces overdue inquiries | ❌ | Admin surfacing (overdue flag/query) | F2 |
| BR-2.3 | Name, valid email, message 20–5000 chars, type | Zod; CHECKs `Inquiry_br_2_3_*` (length, name, email shape) — enforced in the database too (F1.2, #60). The 20/5000 bounds become settings in F1.6 | ✅ | App + DB CHECK | F1.6 (tunable) |
| BR-2.4 | Max 5 per IP per 24h, no privileged bypass | `rate_limit_hit()` — one atomic call per request, serialised per key (#64); proven: 20 simultaneous requests → exactly 5 allowed. Limit and window are admin-editable settings (#67), bounded 1–100 per 1–168h | ✅ | DB function + settings table | Done |
| BR-2.5 | `source` captured server-side, `"direct"` fallback | `POST /inquiries` | ✅ | App | — |
| BR-2.6 | Idempotency key dedupes within 10 minutes | `POST /inquiries` + unique index | ✅ | App + DB unique | — |
| BR-2.7 | Honeypot returns an identical 201, creates nothing | `POST /inquiries` | ✅ | App | — |

## 3. Admin security (BR-3.x) — re-verified end to end in F3

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-3.1 | No write without verified 2FA | `proxy.ts` session gate + `getSessionAdminId` per route | 🟡 | App (verify every route) | F3 |
| BR-3.2 | Progressive delay → lockout on failed logins | Failed-attempt counter now incremented atomically (#62), so simultaneous guesses can't slip past the lock; flow re-verified end to end in F3 | 🟡 | App + atomic counter | F3 |
| BR-3.3 | 30-minute idle expiry | `lib/auth/session.ts`, `proxy.ts` | 🟡 | App (verify) | F3 |
| BR-3.4 | Every mutation and every login attempt logged | 18/18 mutating routes log; unknown-email failures now logged as ANONYMOUS with keyed hashes (#62); `ActivityLog` append-only in the database (UPDATE/DELETE/TRUNCATE refused); actor consistency CHECK. Moving the calls into one shared layer is F2 | 🟡 | DB append-only ✅ · shared app layer → F2 | F2 |
| BR-3.5 | Challenge token: 5 minutes, single use | Routes; CHECK `LoginChallenge_br_3_5_ttl` caps lifetime at 5 min — enforced in the database too (F1.2, #60). App flow re-verified in F3 | 🟡 | App + DB CHECK | F3 |
| BR-3.6 | 5 failed TOTP attempts invalidate the token | verify-2fa route (`attempts`) | 🟡 | App + atomic increment | F3 |
| BR-3.7 | 12-hour absolute session lifetime | `lib/auth/session.ts` | 🟡 | App (verify) | F3 |
| BR-3.8 | New session ID minted after 2FA | `verify-2fa` + `session.ts` | 🟡 | App (verify) | F3 |
| BR-3.9 | CSRF protection on admin mutations | `SameSite=Strict` cookie | 🟡 | App + origin check | F3 |
| BR-3.10 | Admin email lowercase on write and lookup | App `toLowerCase`; CHECK `AdminUser_br_3_10_email_lowercase` — enforced in the database too (F1.2, #60) | ✅ | App + DB CHECK | — |
| BR-3.11 | Exactly 10 recovery codes, hashed, single-use | `create-admin.ts`, verify-2fa | 🟡 | App (verify) | F3 |
| BR-3.12 | Dashboard warns when < 3 recovery codes remain | **Not implemented** | ❌ | App | F3 |
| BR-3.13 | No self-serve reset; manual operator procedure | `scripts/reset-admin-password.ts` — confirm-twice, verifies the stored hash, clears the lock, audited as a SYSTEM actor; documented in DEPLOYMENT.md (#65). Used for real on 2026-09-19 | ✅ | Ops script + runbook | — |

## 4. AI & agents (BR-4.x)

| Rule | Claim | Status |
|---|---|---|
| BR-4.1 – BR-4.5 | Read-only tools except `submit_inquiry`; grounded answers; tools ship disabled; copilot drafts only | ⏳ V1.1 (no AI layer built). `Flag` rows seeded disabled ✅ (BR-4.4 default) |

## 5. Analytics & privacy (BR-5.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-5.1 / 5.4 | No event before consent; applies to Vercel Analytics too | No events are collected yet; no consent banner | 🟡 (vacuously true) | App — required before any analytics ships | F5 |
| BR-5.2 | `Inquiry`/`Event` anonymized or purged after 24 months; scheduled | **Not implemented** — `JobRun` (run history + database lock) is ready (#70); the job itself is F4 | ❌ | DB function + scheduled job + `JobRun` log | F1.6 / F4 |
| BR-5.3 | Public statistics are admin-approved; live counts are content facts | `Metric` + `MetricSnapshot`: `propose_metric_snapshot` / `approve_metric_snapshot`, value fixed once proposed, forward-only transitions, one approved + one pending per metric, never deleted; public reads the `PublicMetric` view only (#72); tested. Homepage counts read the `PublicLedger` view | ✅ | DB | Admin endpoints → F2 |
| BR-5.5 | Deletion right honoured manually; stated on confirmation | Contact confirmation states the removal route (email) — #58 | ✅ | App copy | — |
| BR-2.4 (privacy) | IP kept only as long as the window needs | Keys hold a keyed hash (HMAC, HKDF subkey) of the IP, never the raw address (#64); expired rows not yet pruned | 🟡 | Hashed keys ✅ · prune job → F4 | F4 |

## 6. Testimonials (BR-6.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-6.1 | `hasPermission = false` never public | View `PublicTestimonial` (#72); tested | ✅ | DB public view | — |
| BR-6.2 | Only for published systems | View `PublicTestimonial` (#72); tested | ✅ | DB public view | — |

## 7. CV & documents (BR-7.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-7.1 | Generated from live data at generation time | `lib/cv/model.ts` builds from the public views on every request; `POST /cv/generate` (#74) | ✅ | App | — |
| BR-7.2 | Prior documents superseded, not deleted | `lib/rules/cv.ts` (per format, #74); trigger `DocumentGen_br_7_2_no_delete` — enforced in the database too (F1.2, #60) | ✅ | App + DB trigger | — |
| BR-7.3 | The CV shows only what the site shows, and never invents | Reads `PublicSystem`/`PublicExperience`/`PublicEducation`/`PublicAchievement`/`PublicProfile*` only; completeness check reports gaps, suggested summary is offered not saved (#74); tested incl. hidden roles, drafts, excluded projects | ✅ | DB views + App | — |
| BR-7.4 | ATS-safe, identical PDF and Word | Shared model + formatting; PDF: text operators asserted (a blank render fails), hyphenation off; DOCX: real headings and hyperlinks, asserted table-free (#74) | ✅ | App | — |

## 8. Extension governance (BR-8.x) & Constitution

| Claim | Source | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| New lookup values without a deploy | BR-8.1 | `POST /lookups/{type}` for every type; a status gets its stage and a palette colour by default (#52); tested | ✅ | DB default + API | — |
| In-use lookup values soft-deprecated, never hard-deleted | BR-8.2 | Deprecate route; no delete route | ✅ | App (+ FK RESTRICT) | — |
| Re-creating a deprecated key returns `LOOKUP_KEY_DEPRECATED` | BR-8.3 | POST `/lookups/{type}` answers 409 `LOOKUP_KEY_DEPRECATED` or `LOOKUP_KEY_EXISTS` with the existing id, from the DB unique key (#52); tested | ✅ | DB unique + App | Done |
| Open sets are lookup tables, not enums | EXT-1 | Status/Domain/InquiryType/MilestoneType/SkillCategory are tables; homepage counts group by each status's `stage` (`PipelineStage`), and the homepage selection is admin-curated (`featuredOnHome`, `homeOrder`) — no status keys in code (#52) | ✅ | DB | Done |
| Additive-only migrations | EXT-1 | CI `migration-guard` on every PR: an applied migration can never be edited or deleted; a new one can't drop, rename, retype, truncate, delete or disable a trigger without a reviewed `-- migration-guard: allow <reason>` line (#78); plus the drift check | ✅ | CI | — |
| Every admin mutation logged at the middleware layer | CLAUDE.md, BR-3.4 | Per-route calls (18/18), not a shared layer | 🟡 | One shared layer | F2 |
| New tools/lenses/sections ship disabled | EXT-1, BR-4.4 | `Flag.enabled` defaults false | ✅ | DB default | — |
| Versioned API `/api/v1` | EXT-1 | All routes under `/api/v1` | ✅ | App | — |
| Nothing hardcoded unless that's the recommended practice — tunables are data | Owner directive 2026-09-19 | `PlatformSetting` table + typed registry with bounds (#67): inquiry and CV rate limits are read from it; retention and review SLA are stored there, read once their jobs exist (F2/F4); status keys are gone from queries. Laws stay in code on purpose: challenge TTL, message bounds, 2FA and lockout policy | 🟡 | DB settings table, admin-editable | F2/F4 (consumers) |
| Nothing about the owner hardcoded | Owner directive 2026-09-18 | `Profile` (one row, CHECK), `ProfileLink`, `Achievement` hold the owner's data, moved from `lib/content/sheets.ts` using only what the repo already stated (#70). Pages still read the constants until the frontend switches over | 🟡 | DB tables ✅ · pages read them | F5 |
| Pre-launch: sitemap, OG images, JSON-LD, canonical URLs | Constitution §9 | Not verified | ❌/? | App | F5 |
| Pre-launch: static CV PDF hosted independently | Constitution §9 | Not verified | ❌/? | Ops | F4 |
| Backup / restore drill | Constitution §11 Phase 2 | Neon point-in-time recovery exists; never drilled | 🟡 | Ops runbook + drill | F4 |

## 8a. Platform qualities (added by F1.3–F1.5)

| Claim | Enforced today | Status |
|---|---|---|
| Login timing doesn't reveal whether an email is the admin's | Unknown emails run the same bcrypt work (cost 12) against a fixed dummy hash (#62); test asserts > 50 ms | ✅ |
| Timestamps are unambiguous | Every timestamp column is `timestamptz(3)`, converted explicitly from UTC (#63); verified on a non-UTC machine: same instants | ✅ |
| Every mutable row records when it was created and last changed | `createdAt` / `updatedAt` on every mutable table (#63) | ✅ |
| Request context in the audit log can't be read back | IP, user agent and attempted emails stored as keyed hashes only (#62) | ✅ |
| The admin can change their own password while logged in | Owner request 2026-09-19 — backend endpoint (current password + 2FA, ends older sessions) not built | ❌ → F3 |
| An admin account exists in production | Created 2026-09-19 by the owner in their own terminal; verified read-only (2FA on, codes hashed) | ✅ |
| Every status change of a system is on record, and can't be rewritten | Trigger `System_status_history` writes `SystemStatusChange` with the stage at the time; append-only triggers; history that predates it is marked `backfilled` and never read as a date (#70) | ✅ |
| Shipped dates and pace are computed, not typed | View `SystemPace` over real transitions (#70) | ✅ |
| Every skill shows what proves it | View `SkillEvidence`: published systems (BR-1.1), roles and published education per skill (#70) | ✅ |
| Education appears only when the admin shows it, with proof links https-only | `Education.contentStatus`; `/cv` and the generated CV read `PUBLISHED_EDUCATION_WHERE`; CHECKs `Education_certificateUrl_format`, `Education_required_present` (#70) | ✅ |
| A scheduled job never runs twice at once, and its history can't be edited | `JobRun`: partial unique index (one RUNNING per job), CHECKs (finished ⇔ finishedAt, failed ⇒ error), finished runs immutable (#70) | ✅ |
| Public pages can only see public data | Every public read goes through `dbPublic`, connected as `platform_public`: SELECT on the ten masked views and public lookups only — raw tables refused by the database (#72, #76). Proven in tests and CI (the whole suite's public reads run restricted). Production: active once the owner sets `DATABASE_URL_PUBLIC` | 🟡 → owner step |
| The application can't undo the database's rules | Runtime connects as `platform_runtime`: no ALTER/DROP/TRUNCATE, no disabling triggers, no UPDATE/DELETE on audit or status history, no DELETE of systems/documents/metric history (#76). The full suite passes as that role except the tests that deliberately attempt those. Production: active once the owner sets `DATABASE_URL_RUNTIME` | 🟡 → owner step |
| Instant search never finds hidden work | `search_public()` reads the public views only: full-text + pg_trgm (typos, partial words), trigram GIN indexes (#72); tested incl. drafts and masked clients | ✅ |
| GitHub metadata and weekly activity per system | Columns + `SystemActivityWeek` with format/bound CHECKs (#70); filled by the sync in F4 | 🟡 → F4 |

## 9. Claims the public site makes

| Where | Claim | Backed by | Status |
|---|---|---|---|
| Footer, home contact band, contact confirmation | "Reviewed within 48 hours" (owner chose to keep BR-2.2 as written — #58) | Copy now matches BR-2.2; the review SLA itself is surfaced to the admin in F2 (BR-2.2 row) | ✅ copy / ❌ SLA → F2 |
| Home hero | "Live data, as of …" | Counts computed per request | ✅ |
| Home stack card | "Type-checked end to end", "Tested in CI on every change", "Deployed on Vercel from main" | `tsc --noEmit` in CI; CI on every PR; Vercel Git integration | ✅ |
| Home pipeline | "N shipped / N in progress / N queued" | Counted by each status's pipeline stage, archived excluded (#52) | ✅ |

---

*A claim moves to ✅ only with a test that would fail if the enforcement were removed.*
