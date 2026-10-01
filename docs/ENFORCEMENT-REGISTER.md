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
| 🚧 | Being built in the current phase (F5c) — enforcement lands with the feature |
| ⏳ | Deferred by decision — tracked with its trigger in ROADMAP-V2.md — not a gap |

**Target layer** follows one principle — *put each guarantee where it can't be bypassed*: data invariants in the **database** (constraints, triggers, views, roles), workflow and authorization in the **app** (API/middleware), both where a bypass would be costly.

## 1. Content publishing (BR-1.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-1.1 | No publish while `clientVisibility ≠ PUBLIC` and `clientApproved = false`, server-side | `canPublish` + 409 in the API; CHECK `System_br_1_1_publish_requires_approval` — enforced in the database too (F1.2, #60) | ✅ | App + DB CHECK | — |
| BR-1.2 | `REQUIRES_APPROVAL` default for client orgs | API + sync; trigger `System_br_1_2_client_default` — enforced in the database too (F1.2, #60) | ✅ | App + DB trigger | — |
| BR-1.3 | `NDA_RESTRICTED` never exposes repo/live URL publicly | View `PublicSystem` nulls repo, live link and screenshot; every public read uses the view (#72); tested | ✅ | DB public view + `platform_public` role (#76) | — |
| BR-1.4 | `ANONYMIZED_ONLY` never exposes the org name unless `nameDisclosureApproved` — including through the organization list and filter | View `PublicSystem` masks the name and drops the org slug; `PublicOrganization` lists only disclosed organizations; `PublicTestimonial` masks the organization. **Fixed a live leak:** the organization list named an anonymized client (#72); tested | ✅ | DB public views + `platform_public` role (#76) | — |
| BR-1.5 | `contentStatus` fixed draft/published/archived | Prisma enum | ✅ | DB | — |
| BR-1.6 | The owner's own synced repos are shown by default (setting), flagged new; client and collaborated repos wait for approval | `lib/jobs/github-sync.ts` `showByDefault()` + the `github.sync.newRepoVisibility` setting; status *On GitHub* (lookup); client/collaborator publishing is refused by the database (BR-1.1, BR-1.11); PublicLedger excludes uncurated rows; tested against a fake GitHub | ✅ | App + DB constraints | — |
| BR-1.7 | **Revised by owner (2026-09-19):** private repos are synced too, shown as private with access on request; repo URL never exposed | Rule text rewritten (#70); `System.repoPrivate`; view `PublicSystem` returns `repoUrl: null` for a private repo (tested). The daily `github.sync` (#95) syncs private repos as drafts with `repoPrivate` set (tested) | ✅ | DB public view + sync | — |
| BR-1.8 | `needsCuration` cleared on admin save | `PATCH /admin/systems/[id]` | ✅ | App | — |
| BR-1.9 | `System` never hard-deleted | No DELETE route; trigger `System_br_1_9_no_delete` — enforced in the database too (F1.2, #60) | ✅ | DB trigger | — |
| BR-1.10 | Publish evaluated inside one transaction, re-reading state | `db.$transaction` in `PATCH /admin/systems/[id]`; the BR-1.1 CHECK now makes the race moot | ✅ | App + DB | — |
| BR-1.11 | A collaborated system is published only with the repo owner's recorded permission; relationships are a lookup | Trigger `System_br_1_11_owner_permission` (normalises the answer, stamps its time, refuses publishing without GRANTED), CHECK `System_br_1_11_answer_has_source`, trigger `RepoRelationship_br_1_11_recheck`; API answers 409 `OWNER_PERMISSION_REQUIRED` (#69); tested | ✅ | DB triggers + App | — |
| BR-1.12 | A journey entry about a system is public only while that system is published; first ships are auto-drafted, never auto-published | Trigger `System_status_history` drafts the entry (DRAFT, one per system — partial unique index); public reads use the `PublicTimeline` view (#72); tested | ✅ | DB trigger + public view | — |
| BR-1.13 | Scheduled content is public exactly at its time, everywhere, and every publish gate is checked when it's scheduled | `publishAt` on System/Timeline/Achievement/Experience/Education; function `is_live()` in every public view and `SkillEvidence`/`PublicLedger` (so search and the CV follow); trigger `*_br_1_13_publish_at` refuses a time on unpublished content and drops it on unpublish; CHECK backstop; `withAdmin` answers the refusal as a 400. Public pages render per request (build shows ƒ), so nothing waits on a cache or a cron (#86); tested | ✅ | DB function + trigger + CHECK | — |
| BR-1.14 | Renamed systems keep their old links; old slugs stay reserved | `SystemSlugHistory` written by trigger `System_slug_history` on every slug change (admin or GitHub sync); trigger `System_br_1_14_slug_reserved` refuses another system's old slug and releases one its own system takes back; view `PublicSlugRedirect` (live systems only); `/systems/{slug}` page (permanentRedirect) and API (308, incl. `/related`); `isSlugAvailable` keeps the sync off reserved slugs; admin PATCH answers 409 SLUG_TAKEN / SLUG_RESERVED (#87); tested | ✅ | DB triggers + view + App | — |
| BR-1.15 | Case-study and description history, append-only, attributed, restorable | Trigger `System_content_revisions` writes `SystemContentRevision` on every change (any path), attributed from the transaction's actor like the audit trail; append-only by trigger and the runtime role's grants; current texts backfilled when history began; admin list + restore (a restore is a new version) (#88); tested | ✅ | DB triggers + grants + App | — |
| BR-1.16 | Freshness: only real edits or "mark reviewed" count; stale live content surfaced | `contentReviewedAt` on System/Experience/Education/Profile, stamped by trigger `*_content_reviewed` only when a visitor-facing column changes (sync-written columns excluded), never in the future; backfilled from the last known change with the audit trigger paused for the backfill only; `stale_content(days)` (live content, BR-1.13) with setting `content.freshnessDays`; admin list, mark-reviewed, overview count (#89); tested | ✅ | DB trigger + function + setting | — |
| BR-1.17 | Photos: decoded images only, re-encoded without metadata; versions superseded, never altered or deleted | `lib/profile/photos.ts` decodes with sharp, applies orientation, resizes to setting `profile.photo.maxEdgePixels`, re-encodes to WebP (no EXIF/GPS); size setting `profile.photo.maxMegabytes`; table `ProfilePhoto` with CHECKs (WebP only, size = bytes, hash shape), one current per purpose (partial unique index), trigger `ProfilePhoto_br_1_17` refuses delete/truncate and any change but alt text and current-ness, runtime role has no DELETE; public reads through `PublicProfilePhoto`; bytes never in the audit log (F5c); tested | ✅ | App + DB trigger + role | — |

## 2. Inquiries (BR-2.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-2.1 | `new → reviewed → responded/closed`, never skipped | `lib/rules/inquiries.ts`; trigger `Inquiry_br_2_1_workflow` (start NEW, valid transitions only) — enforced in the database too (F1.2, #60) | ✅ | App + DB trigger | — |
| BR-2.2 | Every `new` inquiry reviewed within the configured deadline (48 hours by default) | `GET /admin/inquiries?overdue=true` filters `NEW` inquiries past the admin-editable `inquiry.reviewSlaHours` deadline; every admin inquiry shape also exposes `reviewDueAt` and `overdue`. Integration-tested (#82) | ✅ | Admin query + setting | — |
| BR-2.3 | Name, valid email, message 20–5000 chars, type | Zod; CHECKs `Inquiry_br_2_3_*` (length, name, email shape) — enforced in the database too (F1.2, #60). The 20/5000 bounds become settings in F1.6 | ✅ | App + DB CHECK | F1.6 (tunable) |
| BR-2.4 | Max 5 per IP per 24h, no privileged bypass | `rate_limit_hit()` — one atomic call per request, serialised per key (#64); proven: 20 simultaneous requests → exactly 5 allowed. Limit and window are admin-editable settings (#67), bounded 1–100 per 1–168h | ✅ | DB function + settings table | Done |
| BR-2.5 | `source` captured server-side, `"direct"` fallback | `POST /inquiries` | ✅ | App | — |
| BR-2.6 | Idempotency key dedupes within 10 minutes | `POST /inquiries` + unique index | ✅ | App + DB unique | — |
| BR-2.7 | Honeypot returns an identical 201, creates nothing | `POST /inquiries` | ✅ | App | — |

## 3. Admin security (BR-3.x) — re-verified end to end in F3

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-3.1 | No write without verified 2FA | Sessions are minted only by verify-2fa (login returns a challenge, never a cookie — `tests/integration/admin-auth-api.test.ts`); `proxy.ts` refuses admin API/pages without a current session (JSON 401 / sign-in redirect), including sessions from before a password change; every admin handler is wrapped in `withAdmin` (structure test in `audit-trail.test.ts`) (#91); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App (proxy + withAdmin) | — |
| BR-3.2 | Lockouts escalate; failures never reveal the admin's email | Atomic failure counter (#62); lockout at 5 doubles per consecutive lockout (`lockoutCount`), capped at 24 h, reset on success; wrong-password and unknown-email answers are byte-identical (#91); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App + atomic counter | — |
| BR-3.3 | 30-minute idle expiry | `lib/auth/session.ts` (`checkSession`), applied by `proxy.ts` and `withAdmin`; tested in `tests/unit/session.test.ts` | ✅ | App | — |
| BR-3.4 | Every mutation and every login attempt logged | The database logs every insert/update/delete on 27 tables by trigger `audit_row_change` — changed columns only, secrets and inquiry PII redacted; actor (ADMIN/ANONYMOUS/SYSTEM) and hashed request context set per transaction by `withActor`/`withAdmin` (#80). Login attempts logged explicitly (#62). `ActivityLog` append-only in the database; the app role can't disable triggers (F1.8) | ✅ | DB triggers + App | — |
| BR-3.5 | Challenge token: 5 minutes, single use | Routes; CHECK `LoginChallenge_br_3_5_ttl` caps lifetime at 5 min in the database (#60); expired → 401 (`tests/integration/admin-auth-api.test.ts`); a challenge that already signed in can't be reused (`tests/integration/auth-hardening.test.ts`) (#91) | ✅ | App + DB CHECK | — |
| BR-3.6 | 5 failed TOTP attempts invalidate the token | verify-2fa route (`attempts`, atomic); tested in `tests/integration/admin-auth-api.test.ts` | ✅ | App + atomic increment | — |
| BR-3.7 | 12-hour absolute session lifetime | `lib/auth/session.ts` (`iat` fixed for the session's life); tested in `tests/unit/session.test.ts` | ✅ | App | — |
| BR-3.8 | New session ID minted after 2FA | verify-2fa mints a fresh signed session with a random `sid` per login — two logins never share a value, and it's never derived from the challenge (#91); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App | — |
| BR-3.9 | CSRF protection on admin mutations | `SameSite=Strict` cookie, plus `lib/security/csrf.ts`: every state-changing admin request (`withAdmin`, login, verify-2fa) is refused (403 CSRF_REJECTED) when its Origin or Sec-Fetch-Site names another site (#91); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App + cookie attribute | — |
| BR-3.10 | Admin email lowercase on write and lookup | App `toLowerCase`; CHECK `AdminUser_br_3_10_email_lowercase` — enforced in the database too (F1.2, #60) | ✅ | App + DB CHECK | — |
| BR-3.11 | Exactly 10 recovery codes, hashed, single-use | `lib/auth/recovery-codes.ts` (one generator for setup and regeneration): ten unique codes, bcrypt-hashed; each consumed on use (`tests/integration/admin-auth-api.test.ts`); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App | — |
| BR-3.12 | Dashboard warns when < 3 recovery codes remain; regenerating invalidates old codes | Overview `attention.recoveryCodesLow` + `security.recoveryCodesRemaining`; `GET/POST /admin/auth/recovery-codes` — regeneration re-authenticates (password + single-use TOTP, per-session failure limit), verifies before any hashing, returns ten codes once, replaces every old one (#91); tested in `tests/integration/auth-hardening.test.ts` | ✅ | App | — |
| BR-3.13 | No self-serve reset; manual operator procedure | `scripts/reset-admin-password.ts` — confirm-twice, verifies the stored hash, clears the lock, audited as a SYSTEM actor; documented in DEPLOYMENT.md (#65). Used for real on 2026-09-19 | ✅ | Ops script + runbook | — |
| BR-3.14 | TOTP codes are single-use | `lib/auth/totp.ts` `verifyTotpOnce`: validate + record `AdminUser.lastTotpStep` in one conditional `UPDATE` (atomic, no replay race); used by verify-2fa and change-password (#84); tested | ✅ | App + atomic DB update | — |
| BR-3.15 | Password change: current password + TOTP, ends older sessions, 5 failures end the session, every attempt logged | `POST /admin/auth/change-password`; `AdminUser.sessionVersion` checked by `proxy.ts` and `withAdmin` on every admin request; per-session failure count via `rate_limit_hit()` (#84); tested | ✅ | App + DB counter | — |

## 4. AI & agents (BR-4.x)

| Rule | Claim | Status |
|---|---|---|
| BR-4.1, 4.2, 4.4 | Read-only tools; the guide *drafts* an inquiry the visitor sends through the normal form (stricter than `submit_inquiry`); every tool ships disabled | ✅ `app/api/v1/guide/route.ts` registers `open_page` (site paths only, as an enum), `search_systems` (`search_public()`, public views) and `draft_inquiry` (fills the form; the visitor sends it) — each only while its `Flag` is on; there is no submit tool. Tested: `tests/integration/guide-api.test.ts` |
| BR-4.3 | Answers grounded in the site's public data; "I don't know" over a guess; no commitments on his behalf | ✅ grounding: `lib/guide/corpus.ts` reads only the public views (public role) — tested that unpublished systems, the phone and lens prompts never reach the model. 🟡 behaviour: `tests/ai-evals/guide.eval.test.ts` (30 cases, judge-graded) runs when `AI_GATEWAY_API_KEY` is set — not yet in CI |
| BR-4.6 | Nothing a visitor sends changes what the guide is or may do | ✅ `lib/guide/request.ts` whitelist (user text + the guide's own parts; no system/file/unknown-tool parts; size and `concierge.*` bounds), per-visitor and daily limits in `rate_limit_hit()`, provider errors never reach the browser, answers rendered as text never HTML (`GuideText`). Tested: `tests/unit/guide-request.test.ts`, `tests/unit/guide-text.test.tsx`, `tests/integration/guide-api.test.ts`. 🟡 attack evals as BR-4.3 |
| BR-4.5 | The admin copilot drafts only | ⏳ V2 (ROADMAP-V2) |
| F5c GitHub knowledge | The guide knows the owner's public GitHub work and nothing private or client-restricted | ✅ the sync reads README and commits for public repos only and wipes them if a repo turns private (`lib/jobs/github-sync.ts`); `PublicGithubRepo` / `PublicRepoCommit` expose only public, non-archived, non-client repos in the owner's homes. Tested: `tests/integration/github-knowledge.test.ts` |

## 5. Analytics & privacy (BR-5.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-5.1 / 5.4 | No analytics before consent; applies to Vercel Analytics too | `components/shared/Consent.tsx`: a non-blocking banner on the public site; Vercel Web Analytics renders only after "Allow"; "No thanks" is honoured everywhere and "Privacy choices" (footer) reopens it; nothing stored before a choice but the choice itself; never on the admin. First-party `Event` collection stays off until the V1.1 dashboard uses it (data minimisation) (#102); verified in the browser | ✅ | App | — |
| BR-5.2 | `Inquiry`/`Event` anonymised after the retention period; scheduled | Function `apply_retention(months)` (personal data replaced, aggregates kept, idempotent), run daily by the `maintenance.daily` job with setting `data.retentionMonths` (default 24, floor 6); trigger `*_br_5_2_anonymized` makes it one-way (#96); tested | ✅ | DB function + trigger + scheduled job | — |
| BR-5.3 | Public statistics are admin-approved; live counts are content facts | `Metric` + `MetricSnapshot`: `propose_metric_snapshot` / `approve_metric_snapshot`, value fixed once proposed, forward-only transitions, one approved + one pending per metric, never deleted; public reads the `PublicMetric` view only (#72); tested. Homepage counts read the `PublicLedger` view | ✅ | DB | Admin endpoints → F2 |
| BR-5.5 | Deletion right honoured manually; stated on confirmation | Contact confirmation states the removal route (email) — #58 | ✅ | App copy | — |
| BR-2.4 (privacy) | IP kept only as long as the window needs | Keys hold a keyed hash (HMAC, HKDF subkey) of the IP, never the raw address (#64); expired windows deleted daily by `prune_expired()` in `maintenance.daily` (#96); tested | ✅ | Hashed keys + daily prune | — |

## 6. Testimonials (BR-6.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-6.1 | `hasPermission = false` never public | View `PublicTestimonial` (#72); tested | ✅ | DB public view | — |
| BR-6.2 | Only for published systems | View `PublicTestimonial` (#72); tested | ✅ | DB public view | — |

## 7. CV & documents (BR-7.x)

| Rule | Claim | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| BR-7.1 | Two labelled CVs: generated from live data at request time, or the owner's uploaded file with its date | Generated: `lib/cv/model.ts` builds from the public views on every request; `POST /cv/generate` (#74). Both: `GET /cv/options` lists each with its label, note and (uploaded) date, from view `PublicCvOption` (#92); tested | ✅ | App + DB view | — |
| BR-7.2 | Prior documents and uploads superseded, not deleted; an upload can't be altered | Generated: `lib/rules/cv.ts` (per format, #74); trigger `DocumentGen_br_7_2_no_delete` (F1.2, #60). Uploads: trigger `CvUpload_br_7_2` refuses altering, deleting or truncating a version; partial unique index keeps one current per format; the runtime role has no DELETE (#92); tested | ✅ | App + DB triggers + grants | — |
| BR-7.3 | The CV shows only what the site shows, and never invents | Reads `PublicSystem`/`PublicExperience`/`PublicEducation`/`PublicAchievement`/`PublicProfile*` only; completeness check reports gaps, suggested summary is offered not saved (#74); tested incl. hidden roles, drafts, excluded projects | ✅ | DB views + App | — |
| BR-7.4 | ATS-safe, identical PDF and Word | Shared model + formatting; PDF: text operators asserted (a blank render fails), hyphenation off; DOCX: real headings and hyperlinks, asserted table-free (#74) | ✅ | App | — |
| BR-7.5 | Admin chooses which CV options show; never none; a hidden option is refused everywhere | `CvOptions` (one row): CHECKs + trigger `CvOptions_br_7_5` (never both hidden, first is visible, generated hidden only once an upload exists). Views `PublicCvOption`/`PublicCvUpload` expose visible options only; `GET /cv`, `POST /cv/generate` and `GET /cv/documents/{id}` refuse while the generated option is hidden; `withAdmin` answers refusals as 400 (#92); tested | ✅ | DB CHECK + trigger + views + App | — |
| BR-7.6 | Uploads are real PDF/Word files within the size limit, served only as attachments | `lib/cv/uploads.ts` checks content (PDF header + EOF; DOCX: well-formed ZIP with `word/document.xml`, no `vbaProject.bin`); `cv.upload.maxMegabytes` setting capped at 4 (Vercel's 4.5 MB body limit), checked before the body is read; CHECK on format and size; downloads `attachment` + `nosniff` + rate limit `cv.download.rateLimit.*` (#92); tested | ✅ | App + DB CHECK | — |

## 8. Extension governance (BR-8.x) & Constitution

| Claim | Source | Enforced today | Status | Target | Step |
|---|---|---|---|---|---|
| New lookup values without a deploy | BR-8.1 | `POST /lookups/{type}` for every type; a status gets its stage and a palette colour by default (#52); tested | ✅ | DB default + API | — |
| In-use lookup values soft-deprecated, never hard-deleted | BR-8.2 | Deprecate route; no delete route | ✅ | App (+ FK RESTRICT) | — |
| Re-creating a deprecated key returns `LOOKUP_KEY_DEPRECATED` | BR-8.3 | POST `/lookups/{type}` answers 409 `LOOKUP_KEY_DEPRECATED` or `LOOKUP_KEY_EXISTS` with the existing id, from the DB unique key (#52); tested | ✅ | DB unique + App | Done |
| Open sets are lookup tables, not enums | EXT-1 | Status/Domain/InquiryType/MilestoneType/SkillCategory are tables; homepage counts group by each status's `stage` (`PipelineStage`), and the homepage selection is admin-curated (`featuredOnHome`, `homeOrder`) — no status keys in code (#52) | ✅ | DB | Done |
| Additive-only migrations | EXT-1 | CI `migration-guard` on every PR: an applied migration can never be edited or deleted; a new one can't drop, rename, retype, truncate, delete or disable a trigger without a reviewed `-- migration-guard: allow <reason>` line (#78); plus the drift check | ✅ | CI | — |
| Every admin mutation logged at the middleware layer | CLAUDE.md, BR-3.4 | `withAdmin` wraps every admin handler (auth + attributed `write`); the database writes the log. Tests fail if a table is neither audited nor exempt, if a handler isn't wrapped, or if a route logs by hand (#80) | ✅ | DB + one middleware layer | — |
| New tools/lenses/sections ship disabled | EXT-1, BR-4.4 | `Flag.enabled` defaults false | ✅ | DB default | — |
| The owner's titles and qualifications are data, many and dated | Owner 2026-09-30 (PUBLIC-REDESIGN-PLAN D13) | `ProfileTitle` (CHECKs: label/detail length, dates ordered) + `TitleKind` lookup; `PublicProfileTitle` shows current ones only (started, not ended, kind active); admin CRUD; audited (F5c); tested | ✅ | DB tables + view | — |
| The three GitHub homes, with honest system counts | Owner 2026-09-30 (D12) | `OrganizationKind` lookup; `PublicHome` counts only live, publishable systems and never an unnamed client (BR-1.4, BR-1.13) — counted in the database (F5c); tested with a draft that adds nothing until published | ✅ | DB view | — |
| Versioned API `/api/v1` | EXT-1 | All routes under `/api/v1` | ✅ | App | — |
| Nothing hardcoded unless that's the recommended practice — tunables are data | Owner directive 2026-09-19 | `PlatformSetting` table + typed registry with bounds (#67): rate limits, retention (read by the F4 retention job), the review promise (read by every public page and the form, #99), freshness, job and upload limits. Inquiry types come from their lookup end to end (#99). Laws stay in code on purpose: challenge TTL, message bounds, 2FA and lockout policy | ✅ | DB settings table, admin-editable | — |
| Nothing about the owner hardcoded | Owner directive 2026-09-18 | `Profile`, `ProfileLink`, `PublicAffiliation`, `Achievement` hold the owner's data; every public page reads them — name, role, headline, location, email, links, organizations, the /about narrative (moved into `Profile.bio`) — and `OWNER` is gone from code (#99). The mission and principles moved into `SiteContent` (key-format and object-body CHECKs, audited, read through `PublicSiteContent`), validated per key on write and on read, edited at /admin/content (#106); tested in `tests/integration/site-content-and-logout.test.ts` | ✅ | DB tables + validated blocks | — |
| Pre-launch: sitemap, OG images, JSON-LD, canonical URLs | Constitution §9 | `app/sitemap.ts` (live content only — PublicSystem), `app/robots.ts` (admin + API disallowed), `metadataBase` + per-page canonical from `lib/site-url.ts` (SITE_URL → Vercel production domain), `opengraph-image` for the site and per case study (masked view; a hidden system gets the site card), JSON-LD Person/WebSite/CreativeWork, `app/icon.svg` (#101); tested (sitemap, robots) | ✅ | App | — |
| Pre-launch: static CV PDF hosted independently | Constitution §9 | `cv-continuity` workflow publishes the CV the site offers to the `cv-latest` GitHub release weekly; a failed run keeps the last good copy (#97) | ✅ | GitHub Actions + release asset | — |
| Backup / restore drill | Constitution §11 Phase 2 | Runbook (DEPLOYMENT.md, Backup & restore: Neon point-in-time branch → verify → recover) and `scripts/backup-drill.ts` (read-only comparison: migrations, every table/view readable, row counts) (#97). A production drill is recorded in DEPLOYMENT.md when run | 🟡 | Ops runbook + drill script | F4 drill |

## 8a. Platform qualities (added by F1.3–F1.5)

| Claim | Enforced today | Status |
|---|---|---|
| Login timing doesn't reveal whether an email is the admin's | Unknown emails run the same bcrypt work (cost 12) against a fixed dummy hash (#62); test asserts > 50 ms | ✅ |
| Timestamps are unambiguous | Every timestamp column is `timestamptz(3)`, converted explicitly from UTC (#63); verified on a non-UTC machine: same instants | ✅ |
| Every mutable row records when it was created and last changed | `createdAt` / `updatedAt` on every mutable table (#63) | ✅ |
| Request context in the audit log can't be read back | IP, user agent and attempted emails stored as keyed hashes only (#62) | ✅ |
| The admin can change their own password while logged in | `POST /admin/auth/change-password` — BR-3.15 (#84); /admin/account (password change, recovery codes shown once) (#104) | ✅ |
| Signing out really signs out | `POST /admin/auth/logout` bumps `AdminUser.sessionVersion` (the BR-3.15 mechanism), so every copy of every session stops working, not just this browser's cookie; audited as `auth.logout` (#104); tested | ✅ |
| Every admin page re-checks the session where it reads data | `app/(admin)/admin/(panel)/layout.tsx` and pages call `requireAdminId()` — signature, idle/absolute expiry and session version — on top of `proxy.ts` (#104) | ✅ |
| Everything the admin API can do, the admin can do from a screen | /admin: overview, systems (full editor: scheduling, slug rename, revisions, impacts, skills, ownership, facts), organisations, journey (approve drafts, schedule), CV (options, uploads, completeness check, roles/education/skills with scheduling), profile + links + achievements, page content, inquiries (overdue filter), numbers, freshness, jobs, settings (platform, all lookups, flags, lenses), activity log, account (#104–#107) | ✅ |
| An admin account exists in production | Created 2026-09-19 by the owner in their own terminal; verified read-only (2FA on, codes hashed) | ✅ |
| Every status change of a system is on record, and can't be rewritten | Trigger `System_status_history` writes `SystemStatusChange` with the stage at the time; append-only triggers; history that predates it is marked `backfilled` and never read as a date (#70) | ✅ |
| Shipped dates and pace are computed, not typed | View `SystemPace` over real transitions (#70) | ✅ |
| Every skill shows what proves it — and only what the public can see | View `SkillEvidence`: published systems (BR-1.1), published roles and published education per skill (#70). **Fixed a leak (#90):** hidden roles counted towards role count, dates and "current role"; `PublicLedger.firstExperienceAt` read hidden roles too. Tested with a hidden role | ✅ |
| "N business rules enforced by the database" (site footer / control room) is true | F5c §3.2 | `PublicPlatformPulse` counts the distinct BR-x.y named in the database's own constraints, triggers and plpgsql function bodies — computed live from `pg_catalog`, never typed; aggregates only (no rows, no actors) (F5c); tested | ✅ | DB view | — |
| Every public capability is shown on a page | Owner 2026-09-30 (D2) | Each public capability in `lib/capabilities/map.ts` names its page; the redesign adds a frontend-coverage test that fails when a public capability has no page using it | 🟡 | Test in CI | F5c |
| Every database object is callable or deliberately exempt | `capability-coverage.test.ts` fails when a table, view or (non-trigger, non-extension) function is missing from `lib/capabilities/map.ts` or its `NOT_EXPOSED` reasons, or when the map names something that doesn't exist (#90) | ✅ |
| Education appears only when the admin shows it, with proof links https-only | `Education.contentStatus`; `/cv` and the generated CV read `PUBLISHED_EDUCATION_WHERE`; CHECKs `Education_certificateUrl_format`, `Education_required_present` (#70) | ✅ |
| A scheduled job never runs twice at once, and its history can't be edited | `JobRun`: partial unique index (one RUNNING per job), CHECKs (finished ⇔ finishedAt, failed ⇒ error), finished runs immutable (#70) | ✅ |
| Public pages can only see public data | Every public read goes through `dbPublic`, connected as `platform_public`: SELECT on the ten masked views and public lookups only — raw tables refused by the database (#72, #76). Proven in tests and CI (the whole suite's public reads run restricted). Production: verified 2026-09-19 — public reads connect as `app_public` | ✅ |
| The application can't undo the database's rules | Runtime connects as `platform_runtime`: no ALTER/DROP/TRUNCATE, no disabling triggers, no UPDATE/DELETE on audit or status history, no DELETE of systems/documents/metric history (#76). The full suite passes as that role except the tests that deliberately attempt those. Production: verified 2026-09-19 — writes connect as `app_runtime`; the owner isn't used at runtime | ✅ |
| Instant search never finds hidden work | `search_public()` reads the public views only: full-text + pg_trgm (typos, partial words), trigram GIN indexes (#72); tested incl. drafts and masked clients | ✅ |
| GitHub metadata and weekly activity per system | Filled by the daily `github.sync` job (#95): full name, owner, privacy, last push, languages, topics, stars; commit activity re-bucketed by day into ISO weeks; stats still computing (202) retried next run; tested | ✅ |

## 9. Claims the public site makes

| Where | Claim | Backed by | Status |
|---|---|---|---|
| Footer, home contact band, contact confirmation | "Reviewed within 48 hours" (owner chose to keep BR-2.2 as written — #58) | Copy now matches BR-2.2; the review SLA itself is surfaced to the admin in F2 (BR-2.2 row) | ✅ copy / ❌ SLA → F2 |
| Home hero | "Live data, as of …" | Counts computed per request | ✅ |
| Home stack card | "Type-checked end to end", "Tested in CI on every change", "Deployed on Vercel from main" | `tsc --noEmit` in CI; CI on every PR; Vercel Git integration | ✅ |
| Home pipeline | "N shipped / N in progress / N queued" | Counted by each status's pipeline stage, archived excluded (#52) | ✅ |

---

*A claim moves to ✅ only with a test that would fail if the enforcement were removed.*
