# MALULEKE-KS V2 — Locked Improvement Specification

Audience: Claude Code (implementer). Owner: Kurhula Success Maluleke.
**V2 PLAN — LOCKED (owner, 2026-10-02).** V1 is finished and released; this is everything V2 builds. Every Claude Code session reads this file first (CLAUDE.md points here), works the relay in Section 0.1, and updates `docs/improvements/TRACKER.md` before it stops. Formerly titled "v1.1"; REVISION 3 (Section 1.2) records the re-scope and the statuses checked against the repo.
Status history: LOCKED 2026-10-02. REVISION 2 (2026-10-02): re-verified against the live site (builds 6b32ac6 and afed2f6) and re-scoped. Section 1.1 lists what changed. Changes follow Section 2.4.
Target: raise the platform from a reviewed 8/10 to a defensible 10/10 on one axis: **verifiability** — a skeptical reviewer can confirm any claim on the site in under two minutes.

---

## 0. How to use this document

1. Read this file in full before touching code.
2. This spec EXTENDS the existing system documentation (CLAUDE.md, PROJECT-STRUCTURE.md, DESIGN-SYSTEM.md, PAGE-SPECIFICATIONS.md, the Business Rules Document, the OpenAPI contract, schema.prisma). It never overrides them. If anything here conflicts with them, STOP and ask the owner. Do not resolve conflicts silently.
3. Do not assume file paths, model names, or rule IDs. Discover them from the repo and cite what you found. Where this spec says "verify in repo", that is mandatory.
4. Work one work package (WP) per branch and per pull request, in the order given. No forward dependencies.
5. Every WP has: Why, What, How, Acceptance, Verify, Rollback. A WP is done only when all Acceptance items pass and Verify has been run and its output recorded in the PR description.
6. Repo facts seen via the site's own public evidence links (verify before relying on them): `lib/auth/with-admin.ts`, `proxy.ts`, `openapi-contract.yaml`, `lib/capabilities/map.ts`, `tests/integration/auth-hardening.test.ts`, `tests/integration/capability-coverage.test.ts`, `tests/e2e/mobile.spec.ts`, `.github/workflows/ci.yml`, `docs/ROADMAP-V2.md`. Stack per the site: Next.js 16 App Router, TypeScript strict, PostgreSQL (Neon) with Prisma, public views under a separate read-only role, Vercel AI Gateway for the guide, a daily scheduler for jobs.

### 0.1 The relay — how every engineer picks up, works and hands off

V2 is built by a relay of Claude Code sessions, one after another. No session holds the plan in its head; the plan lives in three files, and every session leaves them exactly as current as it found them:

| File | Holds |
|---|---|
| `docs/V2-IMPROVEMENT-SPEC.md` (this file) | **What** to build — LOCKED. Changes only with the owner's approval (Section 2.4), recorded as a new revision at the top of Section 1.1. |
| `docs/improvements/TRACKER.md` | **Where we are** — every WP's status, branch/PR, the **Next up** pointer, and the append-only handoff log. |
| `docs/improvements/DECISIONS.md` | **Why** — every decision, conflict resolution and owner answer, append-only. |

**At the start of every session (before any code):**
1. Read `CLAUDE.md`, then this spec in full, then `TRACKER.md` (Next up + the last three handoff entries), then `DECISIONS.md`.
2. Take the WP named in **Next up** — not another one. If it's blocked on owner input, take the next unblocked WP in Section 13 order and say why in the handoff log.
3. Claim it: set its row to `In progress` with today's date and your branch name, in the same first commit on the branch.

**While working:** one WP per branch and per PR; the spec's Section 2.3 non-negotiables apply; anything you discover that the spec gets wrong goes into `DECISIONS.md` (and to the owner if it changes scope) — never silently "fixed" in this file.

**Before you stop — even mid-WP, even if the session is cut short:**
1. Update the WP's row: status, PR link, one-line note.
2. Append a handoff entry to `TRACKER.md`: date, WP, what was done, what was verified (with numbers), what's left, the exact next step, any blocker.
3. Move **Next up** to what the next session should take.
4. Record any decision in `DECISIONS.md`.
5. Commit these with your work. A WP left `In progress` without a handoff entry is the one thing this relay can't recover from.

`tests/unit/v2-tracker.test.ts` keeps the tracker honest: every WP in this spec appears in the tracker exactly once with a valid status, and Next up names a real WP.

### 0.2 Conflicts

Item 2 above is the rule: this spec never overrides the governing documents in CLAUDE.md. A conflict is written into `docs/improvements/DECISIONS.md` as *Awaiting owner*, the existing convention is followed meanwhile, and the handoff log says so.

## 1. Why this exists

A review of the live site found a strong core (live self-reporting stats, deep Xkimi case study, enforced business rules, audit trail) and eight gaps that cap the score:

| # | Gap | Effect on a visitor |
|---|-----|---------------------|
| 1 | Skills listed without proof (C++, Java, MATLAB, Angular, FastAPI, LangChain, etc.) | Contradicts the site's "evidence, not claims" thesis |
| 2 | AI-role evidence is mostly coursework; roster incomplete | Weak case for AI/ML roles |
| 3 | No third-party proof, no impact numbers, Sunduza card is one generic line | Credibility ceiling |
| 4 | Old portfolio repos and thin projects clutter the work map | Signals indecision |
| 5 | Homepage lacks og:image and uses the small twitter card; description appears truncated | Weak link previews on the most-shared URL |
| 6 | Four character images requested at w=3840 | Heavy on South African mobile data |
| 7 | Raw email and WhatsApp number in every footer | Scraping risk; undercuts single-form intake |
| 8 | Case studies are AI-written only; guide answers "is he a good fit" about its owner | Voice and self-assessment credibility |

### 1.1 Revision 2: re-verification against the live site

Re-fetched the home, About, Journey and Contact pages and the Xkimi, Sunduza and MALULEKE-KS case studies. Two different builds were served at once (see WP-110); statuses below use the newest build seen (afed2f6, latest commit #142) where a page had it. Rev 1 of this spec was written without having read the MALULEKE-KS case study page, which is why several items below were mis-scoped.

**Already in place: extend, do not rebuild**

| Existing capability | Where seen | Effect on this spec |
|---|---|---|
| Evidence layer: Verified or Planned status, review date, "what it proves / what it doesn't prove", pinned commit-SHA permalinks to source, tests, OpenAPI contract and CI pipeline | `/systems/maluleke-ks` | WP-201 becomes an extension, not a new model |
| Page-specific AI guide prompt sets (Contact and system pages differ from the homepage) | Contact, case studies | WP-107 is an admin-data edit, not a code change |
| Additive-only migrations enforced by a CI guard, capability-coverage test, OpenAPI contract, 360 and 390 px phone test, feature flags, admin TOTP | MALULEKE-KS case study | Several rev 1 rules corrected (Section 2.3) |
| Five-path contact intake with question counts, 24-month retention note, CV on About and Journey, skip link, skills linked to `/systems?tech=` | Contact, About, Journey | WP-105, 106, 103, 204 narrowed |
| Flagship and client cards labeled Finished | Home, case studies | WP-108 partly done |
| Sunduza case study with problem, how it works, decisions, status | `/systems/sunduza-architectural` | WP-404 rescoped |

**Corrections to rev 1**
1. Rev 1 required a down-migration per schema change. The repo enforces additive-only migrations and rejects destructive ones. Replaced by expand/contract plus flags (Sections 2.3 and 12).
2. Rev 1 assumed no evidence ledger existed. It exists for one system. WP-201 is rescoped to extend it.
3. Rev 1 proposed a new Audience table. Audience-like data already exists (guide choices, contact paths). WP-401 extends it.
4. Rev 1 said jobs use the existing mechanism, implying Inngest. Inngest belongs to Xkimi. This platform uses a daily scheduler. Verify in repo.
5. Rev 1 pointed the decision log at Section 9. It is Section 12.

**Status board (as observed)**

| WP | Status | | WP | Status |
|---|---|---|---|---|
| 101 Homepage metadata | Open | | 201 Evidence layer | Partial, extend |
| 102 Image performance | Open | | 202 Verified numbers | Open |
| 103 Skill tiers | Open | | 203 Trust surface | Not observed, verify |
| 104 Work-map curation | Open | | 204 Accessibility | Partial |
| 105 Contact exposure | Open | | 301 to 303 Guide hardening | Open |
| 106 CV on homepage | Partial | | 401 Audience paths | Partial |
| 107 Guide prompts | Open | | 402 Case study fields | Partial |
| 108 Activity labels | Partial | | 404 Sunduza depth | Partial |
| 109 Domain-ready config | Open | | 405 Roster | Open |
| 110 Deploy consistency | New | | 406 to 409, 501, 502 | Open |

### 1.2 Revision 3: verified against the repo and the live site, locked as the V2 plan (2026-10-02)

**Re-scoped by the owner:** V1 is finished and released (PRs #144 and #146, production build `afed2f6`). Nothing in this spec is built in V1. This spec — formerly titled "v1.1" — is the **V2 plan**, locked, built by the relay in Section 0.1. Where an older line says "v1.1", read "V2"; what it deferred to "v2" is now deferred **beyond V2**. The owner asked for every claim to be checked and for improvements to be added: Section 1.2.1 is the check, 1.2.2 the corrections, 1.2.3 the conflicts, 1.2.4 the reconciliation with ROADMAP-V2, 1.2.5 the additions. **The live status of every WP is `docs/improvements/TRACKER.md`; the board in Section 1.1 is history.**

#### 1.2.1 What was checked, and how

Every repo fact in Section 0 item 6 exists (`lib/auth/with-admin.ts`, `proxy.ts`, `openapi-contract.yaml`, `lib/capabilities/map.ts`, `tests/integration/auth-hardening.test.ts`, `tests/integration/capability-coverage.test.ts`, `tests/e2e/mobile.spec.ts`, `.github/workflows/ci.yml`, `docs/ROADMAP-V2.md`). The 70/20/10 split and the AI eval strategy are Constitution §6/§2 (`docs/PLATFORM-CONSTITUTION-v1.md`): an `EvalCase` fixture set run in CI, a failing eval blocking merge — that is "the existing decision" Section 6 refers to. Scheduler: one Vercel cron, `/api/cron/daily` at 03:00 (`vercel.ts`), running the jobs in `lib/jobs/schedule.ts`. Flags: the `Flag` table (`lib/flags.ts`), new tools default off (BR-4.4). Seeds: `prisma/seed.ts` for lookups; owner content arrives by additive data migrations. Audit: database triggers plus `withAdmin`. Live checks were made against production on 2026-10-02 (HTML fetched, headers read, real image downloads measured in headless Chromium at 390 px DPR 3 and 1280 px DPR 1, public API read).

| WP | Claim in rev 2 | Verified finding | Status now |
|---|---|---|---|
| 101 | Homepage has no og:image, `summary` card, cut description | **Confirmed.** No `og:image`, `twitter:card=summary`, description ends "a database that…". Case studies: `summary` and alt "A system on MALULEKE-KS" | Open |
| 102 | Four character images requested at `w=3840` | **Corrected (1.2.2).** `w=3840` is only a `srcset` candidate; the browser downloads 640–750 px versions (`sizes` is set). The real weight is elsewhere, measured: 9 images, 562 KB on a phone | Open, re-scoped |
| 103 | Many skills without proof | **Confirmed:** 31 of 48 skills have no linked system (`GET /skills`). Several (Vitest, Playwright, Zod, shadcn/ui, GitHub Actions) are used by this very platform — its stack data is incomplete, which 1.2.5 addresses | Open |
| 104 | Portfolios and thin projects in the map | **Confirmed:** `my-angular-portfolio` and `my-nextjs-portfolio` are public repos in the map, not written up | Open |
| 105 | Raw email and WhatsApp in every footer | **Confirmed:** the homepage HTML carries 3 `mailto:` and 1 `wa.me` link. Conflicts with D11 (1.2.3) | Open — owner confirms |
| 106 | CV absent from homepage and Contact | **Superseded by PR #144:** a CV button in the header on every page (desktop), *Download my CV* in the phone menu, *Get my CV* in the home hero, all to the uploaded CV | **Done** |
| 107 | Page-specific prompt sets exist | **Confirmed, and now all data:** `ai-guide.suggestions` (home) and `ai-guide.pageSuggestions` (per page, PR #146). Conflicts with the owner's guide brief on the RAG chip (1.2.3) | Open — data edit only |
| 108 | Coursework cards show stale pushes | **Confirmed:** catalog shows "Quiet this month" ×4 and "Last push 6/7 months ago" ×4 | Open |
| 109 | URLs may be hard-coded | **Mostly done:** `siteUrl()` (`lib/site-url.ts`) is the one source; no `vercel.app` host in `app/`, `lib/`, `components/` | Partial — cutover doc and built-output test remain |
| 110 | Two builds served at once | **Explained:** `6b32ac6` = PR #144 and `afed2f6` = PR #146, two production deploys the same day; public pages are `force-dynamic` (no route cache). The fetch straddled the second deploy; the sync-time mismatch points at the fetch tool's cache. `/api/v1/platform/pulse` already reports the running commit | Likely not a defect — smoke test closes it |
| 201 | Evidence on one system; link checking missing | **Partial, and the model differs:** evidence is the `evidence` content block (`SiteContent`, schema `lib/evidence/schema.ts`, EV-1…EV-8 in `docs/EVIDENCE-SPEC.md`), not a table. EV-3 already runs in CI (`tests/integration/evidence.test.ts` resolves every published link against the checkout). Links pin **at render** to the running commit, so they don't age (1.2.2) | Partial |
| 202 | Stats strip undersells | **Confirmed** as described. Owner-approved numbers already have a home: `Metric` / `PublicMetric` | Open |
| 203 | Not observed | **Partial since PR #146:** `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP and a CSP limited to `frame-ancestors`/`base-uri`/`form-action`/`object-src` on every response (`next.config.ts`) | Partial |
| 204 | Skip link, phone tests | **Confirmed** | Partial |
| 205 | — | A designed 404 exists (`app/not-found.tsx`), a public error boundary (`app/(public)/error.tsx`), one `@media print` block in `app/globals.css` | Partial |
| 301 | Open | The guide is told to cite page paths and only paths/URLs in its knowledge; the chat renders them as links | Partial |
| 302 | Open | A 39-case judged eval suite exists (`tests/ai-evals/guide.eval.test.ts`): 39/39 on the production model, 2026-10-02. CI's `ai-eval` job skips without a key; no `EvalCase` table yet | Partial |
| 303 | Open | Limits, a "busy" message with *Try again*, all tested in `tests/integration/guide-api.test.ts` | Partial |
| 401 | Discover | Both are lookups: `VisitorLens` (key, label, private `aiFramingPrompt`), `InquiryType` (+ `InquirySubtype`) | Partial |
| 402 | AI label exists | **Confirmed:** "Written by AI from the repository" | Partial |
| 405 | FundsLink-Academy, Governova, Spotball absent | **Confirmed absent; and none is a public repo** (`GET /github/repos`: 10 public repos). Private work is never shown (BR), so these cards need the owner's own words | Open — owner input |
| 406 | Seed from Xkimi PR #533 | Not verifiable from this repo (Xkimi is a separate repository) | Open — verify in that repo |

#### 1.2.2 Corrections

1. **WP-102 is re-scoped by measurement.** Real downloads on the live homepage (phone, DPR 3): `guide-master.webp` **twice** — raw, 116 KB, as the rig's WebGL texture, and again resized, 56 KB, as the `<img>`; and all three pose images (~160 KB) up front although they only appear on interaction. That is ~330 KB of 562 KB the first view doesn't need. New acceptance: the rig's texture is a pre-sized asset (no raw 1024×1536 download), poses load after first interaction or idle (the pattern `components/about/GuideInvite.tsx` already uses), and the homepage's first-view image weight drops by at least 250 KB on a phone, measured against WP-001. Keep the `srcset` cap as a secondary item.
2. **WP-201 item 2 (currency) changes meaning.** Links are pinned at render to the running commit, so they never fall behind. What *can* rot is the claim itself (the file changed, the claim didn't). Replace "commits behind" with: flag a claim stale when its `reviewedAt` is older than the owner's window **or** any linked file changed since `reviewedAt` (from git history at build time). The CI link check (EV-3) already exists; extend it rather than adding a scheduler job, and keep the scheduled check only for external links.
3. **WP-302 stores results per the Constitution.** "Store results in the database" means the Constitution's `EvalCase` (the fixtures) plus an `EvalRun` (each run's per-case verdicts), additive, behind a capability entry — not an ad-hoc table.
4. **WP-203's CSP report-only cycle must not add a public write path** (Section 2.3). Report to the platform's logs (Vercel) or an owner-approved, rate-limited endpoint; never store reports from an open route without that approval.
5. **WP-302's scheduled runs share the guide's model quota.** The free gateway models allow ~5 requests a minute for the whole team (measured 2026-10-02): schedule eval runs off-peak, paced (`AI_EVAL_PACE_MS`), or on a separate key — never against visitors' capacity.
6. **L3/L4.** The Constitution uses "L3/L4 action" (§5) but defines no levels. Until the owner defines them, read "L3" in this spec as *owner approval in admin before anything public* and "L4" as *never automated*.

#### 1.2.3 Conflicts with earlier owner decisions — follow the existing decision until the owner answers

| # | Spec says | Existing decision | Recommendation | Logged |
|---|---|---|---|---|
| 1 | Zod generated from the contract (2.3) | `lib/schemas.ts` is hand-written, kept in step with `openapi-contract.yaml` by review and `capability-coverage.test.ts` (CLAUDE.md) | Keep hand-written; add a contract-sync test instead of a generator | D-004 |
| 2 | Conventional Commits with the WP id (2.3) | Squash-merged PRs with plain-sentence titles | Start the PR title with the WP id (`WP-201: …`); the squash commit inherits it | D-005 |
| 3 | WP-105: no email in the footer | D11 (2026-09-30): the footer carries contact (email, review promise) | Adopt WP-105 and amend D11: footer keeps the review promise and *Start a conversation* → `/contact`; the WhatsApp number leaves the site except where the owner chooses | D-006 |
| 4 | WP-107: drop the RAG chip as off-topic | Owner's guide brief (2026-09-30): broad and curious, "never a locked-down FAQ" | Replace the "good fit" chip as specified; swap the RAG chip for one that is broad *and* about his work, e.g. "How does he use AI in what he builds?" | D-007 |

#### 1.2.4 Reconciliation with ROADMAP-V2 Part 1

Both are "V2". This spec is the **ordered execution plan**; ROADMAP-V2 Part 1 stays the list of agreed features that wait for a **trigger**. Where they overlap, the WP is the work and the roadmap row points at it.

| ROADMAP-V2 item | Relation |
|---|---|
| #6 Admin copilot — "flags skills with no evidence" | Delivered by WP-103 |
| #7 Testimonials | Built as WP-409 (the slot); its trigger (a permitted quote) is the owner input |
| #12 Internationalisation | Xitsonga stays beyond V2 (Section 2.2) |
| #14 Claude for the guide and write-ups | Owner's cost decision; WP-111 makes the capacity case with numbers |
| #16 Unanswered-question loop | Built as WP-304 (added, 1.2.5) — WP-302 and WP-301 depend on knowing what goes unanswered |
| #1–5, #8, #9, #11, #13, #15 | Unchanged — trigger-based, not in this plan |

#### 1.2.5 Additions (owner request, 2026-10-02: "bring some improvements and recommendations")

Each follows Section 0 item 5 (Why, What, How, Acceptance, Verify, Rollback) and the Section 2.3 non-negotiables; they are written out in full in their phases below.

| WP | Title | Why it raises verifiability or lowers time-to-trust |
|---|---|---|
| WP-103 (extended) | Skill evidence from dependency manifests | The daily GitHub sync reads each public repo's `package.json` / `requirements.txt` / `pyproject.toml` and links a skill to the exact manifest line — proof a reviewer can open, without anyone typing a stack list |
| WP-111 | AI guide capacity in production | The free models' team-wide ~5 requests/minute and the 15-a-day cap decide whether a visitor gets an answer; count busy and resting refusals and show them (admin, `/status`), so the cap and model are set from numbers |
| WP-206 | Error and uptime monitoring | Section 11 promises "notify owner" and WP-203's `/status` needs real health; CLAUDE.md already plans Sentry / Better Stack. Smart Not Hard: free tiers, owner creates the accounts |
| WP-304 | Unanswered-question loop (ROADMAP-V2 #16) | What the guide can't answer is exactly where the site lacks evidence; no PII, aggregated, admin-only |

**Pulled into the V1 finalization (owner, 2026-10-02: "what's worth it, necessary and reasonable … not only the small ones"):** WP-101, WP-107, WP-108 and WP-110 are done; WP-102, WP-103, WP-104, WP-105, WP-203, WP-204 and WP-405 in part. What shipped and what remains of each is in `docs/improvements/TRACKER.md` (the V1 finalization section); this spec's text for those WPs still defines the rest.

Guiding doctrine (from the existing constitution; do not restate rule IDs from memory, map them from the repo):
- **Make It Exist First**: ship a working version, polish from real use.
- **Extension Over Modification (EXT-1)**: anything expected to grow lives in data (lookup tables or config), never a hard-coded list.
- **Smart Not Hard**: buy the commodity, build the differentiated.
- **Controlled Imperfection Engineering**: failures predictable, traceable, and documented; incidents produce documents.
- **Permission Boundaries**: no AI acts autonomously on anything that matters. L4 hard-blocked, L3 requires owner approval.

## 2. Scope lock

### 2.1 In scope (approved by owner)

Phases 1 to 5 below, all work packages WP-101 to WP-502, except where marked "owner-led".

### 2.2 Explicitly deferred (do NOT build)

| Item | Reason | Revisit |
|------|--------|---------|
| Custom domain and domain email | Off budget | When budget allows. WP-109 makes this a config-only change later |
| Xitsonga language option | Beyond V2 | After V2 ships |
| Dark mode | Beyond V2 | After V2 ships |

### 2.3 Non-negotiables for every WP

- Contract-first: any new or changed API endpoint is written in the OpenAPI contract FIRST. Zod schemas are generated from it, never hand-written. Regenerate and commit.
- EXT-1: no new hard-coded enumerations for things that can grow (tiers, audiences, project groups, evidence types, content types). Use lookup tables seeded via the existing seed mechanism.
- Public pages read through the existing read-only database role. Do not add write paths to public routes. The only write path an automated agent can trigger remains the inquiry form.
- Every admin mutation writes to the audit log (verify the existing mechanism and reuse it).
- No fabrication. Testimonials, metrics, postmortem narrative, maths evidence, and client details are OWNER-SUPPLIED. If the input is missing, build the slot and render nothing public (or an honest "in progress" state). Never invent numbers, quotes, or dates.
- Tests required: unit and integration for logic, Playwright for the user-visible behavior, following the existing 70/20/10 split.
- Each PR includes a rollback note and updates the decision log (Section 12).
- Migrations are ADDITIVE ONLY. The existing CI guard rejects destructive changes. Do not write down-migrations or destructive migrations. Roll back with expand/contract: ship the additive change, keep the old path working behind a feature flag, and remove the old path only in a later reviewed release.
- Capability coverage: every new table, view or function needs an endpoint in `openapi-contract.yaml` or a written reason to stay internal in the capability map; the existing coverage test fails otherwise.
- Copy, prompts, limits and titles are admin-editable data. Change them through the seed or admin path, not by hard-coding strings in components.
- Every admin mutation goes through the existing admin middleware (verified second factor).
- Work is tracked as issues and ships in reviewed batches, each PR closing its issues, following the repo's existing numbering.
- Conventional commits with the WP id, for example `feat(WP-201): evidence ledger model`.

### 2.4 Change control

New ideas go to the backlog (Section 8). An item enters scope only if it raises verifiability or lowers a visitor's time-to-trust, and only with owner approval. Claude Code must not add scope on its own initiative.

## 3. Phase 0 — Baseline (before any change)

**WP-001 Baseline measurement**
- Why: you cannot claim improvement without a before.
- What: record Lighthouse (mobile and desktop) for `/`, `/systems`, `/systems/xkimi-xa-mali`, `/about`, `/journey`, `/contact`; record axe results; record page weight and image requests; record OG/Twitter metadata per route.
- How: script it (Playwright plus Lighthouse CI), commit results to `docs/improvements/baseline-2026-10-02.json` and a human-readable summary. Record the build hash each route reports in its footer; two builds were observed at once (WP-110).
- Acceptance: baseline committed; every later WP references it.
- Verify: re-run script reproduces the numbers within normal variance.
- Rollback: delete the docs files; no runtime impact.

**WP-002 Tracker and branch hygiene**
- What: create `docs/improvements/TRACKER.md` listing every WP with status; create the decision log `docs/improvements/DECISIONS.md`.
- Acceptance: both files exist and are updated by every later PR.

## 4. Phase 1 — Quick fixes (no external dependency)

**WP-101 Homepage metadata and link previews**
- Status (rev 2): OPEN. The homepage still has no og:image, still uses `twitter:card=summary`, and the description still ends mid-sentence ("a database that…"). About, Journey and Contact are correct. Added scope: the case-study pages (Xkimi, Sunduza, MALULEKE-KS) also use `summary` and a generic og:image alt ("A system on MALULEKE-KS"); give them `summary_large_image` and a per-system alt.
- Why: the homepage is the most-shared URL and currently previews poorly.
- What: add og:image, og:site_name, og:locale (en_ZA), og:type, `twitter:card=summary_large_image` and twitter:image to the homepage, matching what `/about` already does. Confirm meta description is complete (it appears cut off after "a database that"). Per-system pages get descriptive og:image alt text, not the generic "A system on MALULEKE-KS".
- How: use the existing metadata API and opengraph-image generation pattern already used on `/about` and system pages. Do not duplicate it; extract a shared metadata helper if one does not exist.
- Acceptance: all five core routes return complete OG and Twitter tags; description under about 160 characters and not truncated; OG image 1200x630.
- Verify: fetch each route and assert tags in a Playwright test; check with a link-preview debugger manually.
- Rollback: revert the metadata commit.

**WP-102 Image performance and CI budgets**
- Status (rev 2): OPEN. The homepage still requests four character images at `w=3840` (guide-master, guide-wave, guide-point, guide-thinking); About requests guide-wave at `w=3840`.
- Rev 3 (verified 2026-10-02): re-scoped by measurement — see Section 1.2.2 item 1. Nothing downloads at `w=3840`; the waste is the master image fetched twice (raw 116 KB for the rig + resized) and three pose images loaded up front. Acceptance adds: first-view image weight on a phone down by at least 250 KB against WP-001.
- Why: four character images are requested at `w=3840`, a heavy payload for mobile users in South Africa.
- What: cap `sizes` and `deviceSizes` to realistic widths, serve modern formats, set explicit width and height to prevent layout shift, lazy-load below-the-fold images, prioritize only the LCP element. Add Lighthouse CI budgets to the existing GitHub Actions workflow.
- How: audit every `next/image` usage with a character asset; tune `images` config; add `lighthouserc` assertions.
- Acceptance: no image request larger than the displayed size times DPR 2; LCP not worse than baseline and trending to at most 2.5 s on mobile emulation; CLS at most 0.1; CI fails on budget regression.
- Verify: compare against WP-001 baseline; CI run attached to the PR.
- Rollback: revert config; budgets can be set to warn-only if flaky, with a decision-log entry.

**WP-103 Skill evidence tiers (EXT-1)**
- Status (rev 2): OPEN. Counts now link to `/systems?tech=` for roughly half the skills. No proof exists yet for C++, Java, JavaScript, MATLAB, SQL, Angular, RxJS, TanStack Query, Zod, Zustand, shadcn/ui, BullMQ, Express, FastAPI, Node.js, Pydantic, ChromaDB, MongoDB, Oracle, LangChain, Better Stack, Docker, GitHub Actions, Prometheus, Railway, Sentry, or the testing tools. The page defines the number as published systems built with the skill; keep that definition for the Production tier.
- Rev 3 (verified 2026-10-02): 31 of 48 skills have no linked system. Extended: the daily GitHub sync (`lib/jobs/github-sync.ts`) reads each public repo's dependency manifests (`package.json`, `requirements.txt`, `pyproject.toml`) and records skill evidence that links to the manifest line at a commit. A manifest match makes a skill Production only for a published system; otherwise Academic or Familiar by the owner's rule (decision log). Manifests are data the sync stores; never typed in.
- Why: the site's thesis is evidence, yet many skills have no proof.
- What: introduce a `SkillEvidenceTier` lookup (seed: Production, Academic, Familiar). Each skill links to zero or more Evidence records (see WP-201 for the model; if WP-201 is not built yet, link to system records and migrate later). Skills with no evidence default to Familiar and are visually distinct. The owner may remove any skill via admin.
- How: schema change with migration; admin form; update About skills rendering; do not hard-code the three tiers in components.
- Acceptance: every displayed skill shows its tier; Production skills show a clickable proof count; no skill shows a count without linked proof.
- Verify: integration test that a skill with no evidence renders as Familiar; Playwright check on `/about`.
- Rollback: additive migration only (expand/contract); gate the new rendering behind the existing feature-flag mechanism.

**WP-104 Work-map curation (EXT-1)**
- Status (rev 2): OPEN. My Angular Portfolio and My Nextjs Portfolio still appear in the map, as do Tshimo Agri Network and Machine Learning Project.
- Why: old portfolio repos and thin projects dilute the map.
- What: add a `ProjectGroup` lookup (seed: Flagship, Production, Coursework and Experiments, Archived) and a `visibility` setting per project. The map and "More work" respect group and visibility. The two earlier portfolio repos default to Archived (hidden from the map, still reachable by direct link and listed in admin).
- Acceptance: admin can regroup or hide any project without a deploy; the public map shows only visible projects, grouped.
- Verify: integration test for visibility filtering; Playwright check that archived projects are absent from the map.
- Rollback: additive migration only; new rows default to the previous visibility, and the old behavior stays available behind a flag until the next reviewed release.

**WP-105 Contact exposure**
- Status (rev 2): OPEN. Raw WhatsApp and email remain in every footer, in the homepage "Write to me" block, in the "Email instead" link, and on `/contact` ("Prefer email?"). Keep that one deliberate secondary path on `/contact`; remove it everywhere else.
- Why: raw email and phone on every page invite scraping and bypass the intake form.
- What: remove the raw `mailto:` and `wa.me` links from the global footer. Keep the form as the primary path. On `/contact` only, offer email and WhatsApp with basic obfuscation (rendered client-side on user action) as an explicit secondary option. Keep GitHub and LinkedIn in the footer.
- Acceptance: the footer contains no raw email address or phone number in server-rendered HTML; contact page still offers alternatives.
- Verify: Playwright asserts absence in footer HTML on all routes.
- Rollback: revert the footer component.

**WP-106 CV on the homepage**
- Status (rev 2): PARTIAL. "Get my CV" exists on About and Journey; it is absent from the homepage and Contact.
- Rev 3 (verified 2026-10-02): **Done** in PR #144 — header CV button on every page (desktop), *Download my CV* in the phone menu, *Get my CV* in the home hero, all to the uploaded CV.
- What: add a visible "Get my CV" action to the homepage hero or primary navigation. Reuse the existing CV endpoint. (Audience-specific CV variants arrive in WP-401.)
- Acceptance: CV reachable in one click from `/` on desktop and mobile.

**WP-107 AI guide prompts**
- Status (rev 2): OPEN on the homepage and About, where the "good fit" prompt remains. Contact and the case studies already use page-specific prompt sets, so prompts are data: edit them through the admin data path, not in code. Also review homepage prompt 04 ("Explain retrieval-augmented generation like I'm new to AI"), which is off-topic for a portfolio.
- Rev 3 (verified 2026-10-02): the prompts are the `ai-guide` content block (`suggestions`, `pageSuggestions`); change them by an additive data migration or Admin → Page content. The RAG chip conflicts with the owner's guide brief — see 1.2.3 #4 / D-007.
- Why: a bot the owner controls should not issue a verdict about its owner.
- What: replace "Is he a good fit for a full-stack AI role?" with "What evidence supports a full-stack AI role?". The answer must link to Evidence records rather than assert fit. Prompt chips are data-driven (EXT-1), editable in admin.
- Acceptance: no suggested prompt asks the guide to judge the owner; the answer to the new prompt contains links.
- Verify: eval cases added (see WP-302).

**WP-108 Honest activity labels**
- Status (rev 2): PARTIAL. Flagship and client cards are labeled Finished. Coursework cards still read "Quiet this month · last push 5 months ago" (Graph Search Engine, Logistics Route Optimizer) and "Last push 6 months ago" (AI Chatbot Evolution).
- Why: "last push 5 months ago" advertises neglect on finished or coursework work.
- What: derive a presentation label from project status and group: Finished, Completed, Coursework, Active, Paused. Show recency only for Active projects. Status stays data (lookup), not hard-coded.
- Acceptance: no Completed or Coursework card shows a stale-push warning.

**WP-109 Domain-ready configuration**
- Status (rev 2): OPEN. Canonical and OG URLs resolve to the vercel.app host. Verify whether they derive from config or are hard-coded.
- Rev 3 (verified 2026-10-02): `siteUrl()` in `lib/site-url.ts` is already the single source and no `vercel.app` host is hard-coded. Remaining: `docs/improvements/DOMAIN-CUTOVER.md` (include the Resend sending domain: applicant emails are off until a verified domain exists — flag `notifications.applicant_emails`) and the built-output test.
- Why: the custom domain is deferred, but switching must be config-only later.
- What: all canonical URLs, OG URLs, sitemap, robots, structured data and absolute links derive from a single `SITE_URL` setting. Remove any hard-coded `vercel.app` host. Document the cutover steps in `docs/improvements/DOMAIN-CUTOVER.md` (redirect old host to new, update OAuth/CORS/allowed origins, email sending domain, security.txt Canonical, analytics).
- Acceptance: changing `SITE_URL` in a preview environment changes every absolute URL; a test greps built output for the old host.
- Rollback: revert; no behavior change while the value is unchanged.

**WP-110 Deploy consistency (investigate first)**
- Status (rev 2): NEW. During re-verification the footer showed two builds at once. Home, About, Journey and the Xkimi page reported build 6b32ac6 and listed commits only up to #140 ("synced 3 h ago"). Contact, Sunduza and MALULEKE-KS reported build afed2f6 with commit #142 ("synced 11 h ago"). Either routes are cached from different deploys or the fetch tool cached some pages. This is unknown.
- Rev 3 (verified 2026-10-02): explained in Section 1.2.1 (two deploys the same day, `force-dynamic` pages). Do step 1, then add the smoke test using `GET /api/v1/platform/pulse` (it already reports the running commit) across the core routes' footers.
- Why: a visitor can see contradictory content and build metadata, which damages a site whose thesis is that it reports on itself accurately.
- What: step 1 (no code): in Vercel, confirm which deployment serves production and whether any route is statically cached or uses a long revalidate window. Step 2, only if the problem is real: trigger on-demand revalidation after each deploy and each GitHub sync, and make the footer build hash and sync time come from one source. Step 3: add a post-deploy smoke test that fetches the core routes and asserts a single build hash.
- Acceptance: all core routes report the same build hash within 5 minutes of a deploy; the sync time shown is consistent across routes.
- Verify: the smoke test runs in CI after deploy; attach its output to the PR.
- Rollback: revert the revalidation configuration; no data changes.

**WP-111 AI guide capacity in production** (added in rev 3)
- Why: on the free gateway models each model allows ~5 requests a minute for the whole team (measured 2026-10-02), and the owner's daily cap is 15 questions. Whether a visitor gets an answer depends on numbers nobody can see.
- What: count the guide's refusals by reason — per-visitor limit, conversation limit, daily cap (resting), and busy (every model rate-limited) — per day, without identifiers. Show the counts in admin and, once WP-203 lands, on `/status`. Record the measured per-model limits in the decision log. Recommend cap and model settings to the owner from a week of counts; changing them stays the owner's call (cost, ROADMAP-V2 #14).
- How: reuse the rate-limit store or an aggregate counter table (additive, capability map entry or a NOT_EXPOSED reason); no question text stored (that is WP-304's job, with its own rules).
- Acceptance: a day's refusals by reason are visible in admin; no PII stored; counts survive a deploy.
- Verify: integration tests drive each refusal reason and assert the count; the busy path uses the existing mock-model test pattern (`tests/integration/guide-api.test.ts`).
- Rollback: additive table; hide the admin view behind a flag.

## 5. Phase 2 — Trust and evidence infrastructure

**WP-201 Extend the evidence layer (extend, do not rebuild)**
- Status (rev 2): PARTIAL. The layer exists on `/systems/maluleke-ks`: each claim has a Verified or Planned status, a review date, "What it proves" and "What it doesn't prove", and pinned commit-SHA permalinks to source files, tests, the OpenAPI contract and (unpinned) the CI pipeline. The Planned claim links to `docs/ROADMAP-V2.md`. That claim shape is better than the model in rev 1 and is now the canonical shape. Discover the existing model, endpoints and admin UI in the repo and extend them.
- Rev 3 (verified 2026-10-02): see 1.2.1 and 1.2.2 item 2 — evidence is the `evidence` content block, EV-3 link resolution already runs in CI, and links pin at render so currency is about the claim, not the SHA.
- Why: the layer covers one system only. The homepage counters, the five method principles ("Evidence · 1" markers), the skills, and the Xkimi and Sunduza case studies still assert without the same proof.
- What:
  1. Attach claims in the existing shape (including "what it doesn't prove") to the Xkimi and Sunduza case studies, the homepage counters, the method principles and Production-tier skills.
  2. Currency policy: SHA permalinks age. Flag a claim as stale when its review is older than a window or its pinned SHA is more than a set number of commits behind the default branch. The owner chooses both numbers; record them in the decision log. Surface stale claims in admin. Never auto-repin without review.
  3. Link checker: a scheduled job verifies every permalink resolves and, for SHA links, that the file exists at that SHA. Mark failures Broken. CI fails if a published claim points at a Broken or missing target.
  4. Types: keep Pipeline (a live workflow link) as an explicit unpinned type; reject branch-name refs for every other type.
  5. A Planned claim must link to a roadmap entry and must never render with Verified styling.
- How: contract-first; additive migration (expand/contract); update the capability map; admin changes audited by the existing triggers.
- Acceptance: every claim marker on the homepage, About and case studies resolves to a claim with at least one valid pinned permalink; stale and broken states are visible in admin; the CI gate is active.
- Verify: unit tests for permalink validation; an integration test for the checker with mocked HTTP; a Playwright check that a claim's source link opens the expected file.
- Rollback: additive-only; hide new UI behind the existing flag mechanism; the current markers keep working.

**WP-202 Verified numbers (replace the stats strip)**
- Status (rev 2): OPEN. The strip still reads 2 years building, 2 organisations, 2 systems shipped, 1 in progress, while the catalog says "All systems (9)". Also define "last push": Xkimi shows "last push 2 days ago" while its newest listed commit is 2 weeks old. Label the metric precisely (for example last push to any branch) or compute it from the default branch.
- Why: "2 years / 2 organisations / 2 systems / 1 in progress" undersells verified facts.
- What: replace with figures computed from real sources, each with a source and an as-of date: commits (GitHub sync), test files, migrations, scheduled jobs, enforced business rules, audited changes. Metrics are defined as data (EXT-1) with a `source` and `computedAt`. No hand-typed values. Each figure links to its evidence.
- How: compute in the existing GitHub sync job and DB queries; cache with a documented TTL; show "as of" on hover or beneath.
- Acceptance: every displayed number is produced by code and traceable to a source; the strip degrades gracefully if a source is unavailable (shows last known value with its date, never a fabricated one).
- Verify: unit tests per metric; failure-mode test where GitHub is unreachable.

**WP-203 Public trust surface**
- Status (rev 2): NOT OBSERVED in the pages fetched (not exhaustively tested; verify). A "Privacy choices" link exists, and Contact states 24-month retention followed by anonymisation.
- Rev 3 (verified 2026-10-02): baseline headers shipped in PR #146 (see 1.2.1). Remaining: script/style CSP (report-only first, without a new public write path — 1.2.2 item 4), CI header assertions, `/status`, `security.txt`, `/changelog`.
- What:
  1. `/status` page: last backup, last restore drill, job health, recent deploy, all read from real data. Show dates, not claims.
  2. `/.well-known/security.txt` with contact and expiry (Canonical derived from `SITE_URL`).
  3. Strict security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protections) validated by CI; publish the resulting grade on the status page only if it is actually measured.
  4. `/changelog`: public changelog derived from merged PR titles (Conventional Commit types), owner-curated before publish.
- Acceptance: each item is live; CSP does not break existing features (analytics, images, AI guide).
- Verify: header assertion tests; Playwright smoke test under the CSP; manual check of security.txt.
- Rollback: CSP in report-only mode first for one release cycle, then enforce (record in decision log).

**WP-204 Accessibility (WCAG 2.2 AA) and motion**
- Status (rev 2): PARTIAL. A skip link exists and CI renders public pages at 360 and 390 px to catch overflow. Extend `tests/e2e/mobile.spec.ts` and the existing CI workflow with axe, keyboard and reduced-motion checks instead of creating a parallel suite.
- What: audit and fix keyboard navigation, focus order and visible focus (including the AI guide panel and the corner-bracket card interaction), color contrast against the design system, semantic landmarks, alt text, form labels and error association. Honor `prefers-reduced-motion` for the typewriter hero, character animations, and any transitions.
- Acceptance: zero serious or critical axe violations on core routes; full keyboard path through nav, contact form, and AI guide; reduced-motion users see static equivalents with identical content.
- Verify: axe in Playwright for each core route in CI; manual screen-reader pass on home, a case study, and contact.

**WP-205 Error, empty and print states**
- What: designed 404, 500 and empty states consistent with the design system; verify and extend the existing print stylesheet so the CV and case studies print cleanly.
- Acceptance: every list or data view has an intentional empty state; print preview of CV and a case study is clean.

**WP-206 Error and uptime monitoring** (added in rev 3; owner-led accounts)
- Why: Section 11 promises "notify owner" for broken evidence and failed jobs, and WP-203's `/status` needs real health data. CLAUDE.md already lists Sentry / Better Stack as planned observability. Smart Not Hard: buy the commodity.
- What: error monitoring for server and client errors (source maps uploaded at build), and an external uptime check on `/` and `/api/v1/platform/pulse`. The owner creates the accounts and pastes the keys into Vercel himself — never typed by an agent.
- How: the providers' free tiers; scrub PII before sending (no inquiry bodies, no emails); environment-gated so local and preview runs send nothing.
- Acceptance: a deliberate test error appears in the dashboard with a readable stack; an uptime alert reaches the owner; no PII in any captured event (test).
- Verify: trigger a test error in a preview; review one captured event for PII.
- Rollback: remove the env keys — the integration must no-op without them.

## 6. Phase 3 — AI guide hardening

Do not redefine the AI evaluation strategy. Read the existing decision (the pre-lock gap resolution on AI evals) and implement against it. If it conflicts with anything below, the existing decision wins and you note the difference in the PR.

Rev 2 context: the guide runs through the Vercel AI Gateway, read-only, behind feature flags, with page-specific prompt sets. It records no questions yet; roadmap V2 item 16 specifies learning from unanswered questions. Coordinate WP-302 with that item and do not build a competing store.

**WP-301 Cited answers**
- Why: answers should be verifiable, matching the site's thesis.
- What: every guide answer cites the site pages or Evidence records it used, shown as links. If no supporting source exists, the guide says it does not know rather than speculating. The guide remains read-only: its only write path is the inquiry form.
- Acceptance: answers about the owner's work include at least one link; unsupported questions get an honest refusal.
- Verify: eval cases for grounded and ungrounded questions.

**WP-302 Public eval scorecard**
- Rev 3 (verified 2026-10-02): 39 judged cases exist (`tests/ai-evals/guide.eval.test.ts`, 39/39 on 2026-10-02). Store as the Constitution's `EvalCase` + an `EvalRun` (1.2.2 item 3); schedule off-peak and paced so runs never take visitors' model capacity (1.2.2 item 5).
- What: a versioned eval suite (grounded answers, citation presence, refusal behavior, prompt-injection attempts, out-of-scope requests, attempts to trigger writes). Run in CI on prompt or model change and on a schedule. Store results in the database. Publish a scorecard page showing number of cases, pass rate, last run date, and the categories, including failures. Publishing failures is the point; do not hide them.
- Acceptance: the scorecard renders real data only; a failing run is visible and does not silently pass.
- Verify: unit tests for scoring; a deliberate failing case confirms the scorecard reflects it.

**WP-303 Abuse controls visible and tested**
- What: existing rate limit and abuse protections are surfaced in the UI (clear message at limit, character counter already present), and covered by tests. No change to the underlying protections without owner approval (L3).
- Acceptance: limit behavior is tested and the UI message is accessible.

**WP-304 Unanswered-question loop** (added in rev 3; ROADMAP-V2 #16)
- Why: what the guide can't answer from the site's data is exactly where the site lacks evidence — the most direct feed for WP-201, WP-202 and WP-407.
- What: when the guide says it doesn't know (BR-4.3), record the question's topic — not the visitor, not their identifiers — and show the most frequent topics to the owner in admin, newest and most asked first, with "answered by" once the owner adds the missing content.
- How: the guide signals "unanswered" through a read-only, server-side tool or a structured marker the route strips before the visitor sees it; store an anonymised, length-capped topic with a retention window from settings (BR-5.2); never store raw conversations. Coordinate with WP-302's categories.
- Acceptance: an ungrounded question produces one anonymised record; a grounded one produces none; records expire on schedule; nothing about the visitor is stored.
- Verify: integration tests with the mock model for both paths and for retention; an eval case for the "don't know" path.
- Rollback: flag off — the guide answers exactly as before.

## 7. Phase 4 — Content and audience paths

Many items here depend on OWNER-SUPPLIED content. Build the structure first; leave public output empty or honest until content arrives.

**WP-401 Audience entry paths (EXT-1)**
- Status (rev 2): PARTIAL. Audience-like data already exists: the guide's opening choices (I'm hiring, I have a project, I'm an engineer, Just exploring) and the contact paths (recruitment, service, collaboration, growth, general). Discover whether these are lookup tables and extend them. Do not create a parallel Audience table.
- What: an `Audience` lookup (seed: Hiring, Clients, Admissions). Routes `/for/hiring`, `/for/clients`, `/for/admissions`, driven by data: each audience selects its featured systems, evidence, key numbers, and CV variant. New audiences require no code change. The AI guide's "What brings you here?" options map to the same audiences.
- Acceptance: each path loads with at least three featured items chosen in admin; the CV link differs per audience when variants exist; the paths appear in navigation or the homepage in a non-cluttering way.
- Verify: Playwright per path; integration test that adding an Audience row creates a working route without deploy.
- Rollback: feature-flag the routes.

**WP-402 Case study template upgrade**
- Status (rev 2): PARTIAL. The "Written by AI from the repository · updated <date>" label already exists; keep it. Owner-written decision sections and the impact section are missing.
- What: add owner-written fields to case studies: "A decision I would defend", "A decision I would revisit", and a structured impact section. AI-generated sections stay labeled as such. Confidentiality gating for client work stays in force (publish gate checks client approval server-side).
- Acceptance: a case study can render owner-written sections distinct from generated ones; labels remain accurate; unpublished owner sections never leak.

**WP-403 Xkimi aggregate impact metrics** (L3: owner approval required before publishing)
- Why: Xkimi handles real money and personal data; impact must be shown without exposing members.
- What: compute aggregates only (for example ledger entries reconciled, scheduled jobs executed, restore drill results, uptime). Enforce a minimum-group-size rule for any member-related count. No personal data, no individual amounts, no member identifiers. Owner approves each metric before it is public. Consider POPIA when deciding what to show.
- Acceptance: metrics reviewed and approved in admin before display; automated test confirms no PII fields can reach the public payload.

**WP-404 Sunduza case study depth** (owner-supplied content)
- Status (rev 2): PARTIAL. A case study exists with problem, how it works, engineering decisions and status (live, delivered in five sprints, 15 commits in 26 weeks). Missing: outcome and impact, an owner-written decision, evidence-layer claims and a client-approved quote. The case study lists testimonials as a feature of the Sunduza site; that is not a testimonial about your work.
- What: bring Sunduza to the same structure as Xkimi: problem, constraints, decisions, outcome. Client approval gate must pass before publish.
- Acceptance: case study publishes only after approval recorded; no claim without evidence or owner-supplied source.

**WP-405 Complete the roster**
- Status (rev 2): OPEN. "All systems (9)" is seven personal repositories plus Sunduza and Xkimi. FundsLink-Academy, Governova and Spotball are absent, and "in progress" is this platform only.
- Rev 3 (verified 2026-10-02): none of FundsLink-Academy, Governova or Spotball is a public repo; cards need the owner's own descriptions (owner register).
- What: add FundsLink-Academy and Governova as honest cards with status (for example In design, In progress) and a short owner-written description. Add Spotball Intelligence Engine as In design until WP-502 delivers a running demo. Replace "1 in progress" accordingly using computed counts, not typed ones.
- Acceptance: the roster matches reality; statuses come from the status lookup; no card claims capabilities that do not exist.

**WP-406 Postmortem content type**
- Why: closed-loop learning (incident, document, runbook, prevention) is a core principle with little public evidence.
- What: add a `Postmortem` content type: summary, impact, timeline, root cause, what changed, what prevents recurrence, links to evidence. Seed one entry from Xkimi PR #533 (every invitation failing server-side). Claude Code may draft a skeleton from the PR and commit history for the owner to rewrite; the owner writes and approves the narrative. Mark drafts clearly and never publish them.
- Acceptance: type exists with admin editing and publish gate; the #533 entry exists as an unpublished draft with evidence links.

**WP-407 Long-form writing**
- What: a `/writing` section following the existing content model (verify whether DB-backed or file-based, then follow it): index, article pages, RSS feed, reading time, canonical URLs from `SITE_URL`, article structured data. Planned pieces (owner-written): the double-entry ledger design; why a dormant debit-order integration refuses money operations; EXT-1 in practice; the Xkimi postmortem.
- Acceptance: infrastructure ships even with zero published pieces (honest empty state); each article supports evidence links.

**WP-408 Mathematics evidence for admissions** (owner-supplied)
- What: an Academics section on the admissions path: relevant modules, applied mathematics or algorithmic work, and a writing sample slot. Content is entirely owner-supplied.
- Acceptance: slots exist and render only when filled.

**WP-409 Testimonials**
- What: a Testimonial model (quote, author, role, organization, consent status, linked system). Public display requires recorded consent via the existing approval gate. Slot for the Sunduza testimonial.
- Acceptance: no testimonial renders without consent; absent testimonials leave no empty box.

## 8. Phase 5 — Signature demos and backlog

**WP-501 Search algorithm visualizer**
- Why: it turns academic repos into memorable, interactive proof and is the cheapest high-impact AI/algorithms demo.
- What: a client-side visualizer for BFS, DFS, IDDFS and A* on a small grid or graph: step, play, pause, reset, speed control, and display of visited order and path cost. TypeScript implementation tested against reference outputs from the Python repos where practical. Deterministic, no network calls, accessible controls and an alternative text description of each run. Links to the corresponding repositories.
- How: pure TypeScript algorithm modules separate from rendering; reduced-motion respected.
- Acceptance: all four algorithms produce correct, tested results on fixed fixtures; keyboard operable; no layout shift; bundle impact measured and recorded.
- Rollback: route-level feature flag.

**WP-502 Spotball Intelligence Engine demo** (owner-led, separate repository)
- What: a minimal working demonstration in the SIE repo under KSDRILL-SA (stack per its design documents: MediaPipe, L2CS-Net, FastAPI, Angular, PostgreSQL), for example inference on a sample image with visible output. The portfolio embeds or links to it ONLY after it runs. Until then WP-405's "In design" card stands.
- Claude Code scope: the portfolio-side card and link only, unless the owner opens a separate SIE work order.

### Backlog (not in this lock)

| Item | Note |
|------|------|
| Custom domain and domain email | Off budget; see WP-109 and DOMAIN-CUTOVER.md |
| Xitsonga language option | Beyond V2 |
| Dark mode | Beyond V2 |

## 9. Owner input register

Claude Code must not fabricate any of these. Build the slot, leave it honest.

| Input | Needed by | Owner action | Status |
|-------|-----------|--------------|--------|
| Approved Sunduza testimonial (with consent) | WP-409 | Request from client | Awaiting owner |
| Sunduza case study content and client approval | WP-404 | Supply and approve | Awaiting owner |
| Approval of each Xkimi aggregate metric | WP-403 | Approve in admin | Awaiting owner |
| Postmortem narrative (#533) | WP-406 | Write and approve | Awaiting owner |
| Decision defended / revisited per flagship | WP-402 | Write | Awaiting owner |
| FundsLink-Academy and Governova descriptions and status | WP-405 | Supply | Awaiting owner |
| Mathematics evidence and writing sample | WP-408 | Supply | Awaiting owner |
| CV variants per audience | WP-401 | Supply | Awaiting owner |
| SIE working demo | WP-502 | Build | Awaiting owner |
| Long-form articles | WP-407 | Write | Awaiting owner |
| Staleness thresholds for evidence (commits behind, review window) | WP-201 | Decide | Awaiting owner |
| Confirm in Vercel whether two builds are really being served | WP-110 | Check (likely explained — 1.2.1) | Awaiting owner |
| Answers to the conflicts D-004 to D-007 (Zod generation, commit style, footer email, RAG chip) | 1.2.3 | Decide | Awaiting owner |
| Review and approve the Journey chapter text (drafted from the CV, `reviewed: false`) | Journey page | Admin → Page content → Journey | Awaiting owner |
| Define the permission levels behind "L3/L4" | 1.2.2 item 6 | Decide | Awaiting owner |
| Error-monitoring and uptime accounts, keys pasted into Vercel | WP-206 | Sign up, paste keys | Awaiting owner |
| Guide daily cap and model after a week of WP-111 counts | WP-111, ROADMAP-V2 #14 | Decide (cost) | Awaiting owner |
| Rules for a manifest-matched skill's tier | WP-103 | Decide | Awaiting owner |

## 10. Verification, release gates and targets

Measure against the WP-001 baseline. Targets (record actual results in the PR; do not claim a target that was not measured):

| Area | Target |
|------|--------|
| Core Web Vitals (mobile emulation) | LCP at most 2.5 s, CLS at most 0.1, INP at most 200 ms |
| Accessibility | Zero serious or critical axe violations on core routes; keyboard and reduced-motion verified |
| Metadata | Complete OG and Twitter tags on all core routes |
| Evidence | 100% of published evidenced claims resolve to a valid pinned permalink |
| Numbers | 0 hand-typed metrics on public pages |
| Security | CSP enforced after a report-only cycle; headers asserted in CI |
| AI guide | Eval scorecard live with failures visible; answers cite sources |
| Tests | Existing 70/20/10 split maintained; no decrease in coverage |

V2 release checklist (all required):
- Every in-scope WP merged or explicitly marked "awaiting owner input" with its slot built.
- Baseline vs. final comparison committed to `docs/improvements/`.
- Decision log and tracker current; every WP row final, the handoff log closed with a release entry.
- Rollback path (expand/contract plan or flag) documented for each schema change.
- Owner has reviewed and approved the public-facing copy and every L3 item.

## 11. Failure modes and responses

| Failure | Detection | Response |
|---------|-----------|----------|
| Evidence permalink rots | Scheduled checker, CI gate | Mark Broken, block publish of affected claims, notify owner |
| GitHub API unavailable | Sync job error | Show last known value with its as-of date; never fabricate |
| CSP breaks a feature | Report-only violations, Playwright smoke | Fix policy before enforcing |
| Lighthouse budget flaky | Repeated CI variance | Move that assertion to warn-only with a decision-log entry, never delete silently |
| Eval regression after prompt/model change | Eval CI | Block the change; publish the failure on the scorecard |
| PII reaches a public payload | Payload test (WP-403) | Hard fail; incident document per closed-loop practice |
| Owner content missing | Slot empty | Render nothing or an honest status; do not backfill with generated text |

## 12. Rollback and decision log

- Migrations are additive only and never ship with a down-migration. Roll back by expand/contract: keep the old path working behind a feature flag and remove it in a later reviewed release. Every user-visible feature without a clean revert ships behind the existing flag mechanism.
- `docs/improvements/DECISIONS.md` entry format: date, WP, decision, alternatives considered, reason, reversal cost.
- Seed decisions to record at start:
  - Custom domain deferred for budget; WP-109 keeps the cutover config-only.
  - Dark mode and Xitsonga deferred beyond V2.
  - Owner-supplied content is never generated to fill gaps.

## 13. Suggested execution order

Phase 0 (WP-001, 002) then Phase 1 (WP-110 investigation first, then WP-101 to 109, then WP-111) then Phase 2 (WP-201 to 206) then Phase 3 (WP-301 to 304) then Phase 4 (WP-401 to 409) then Phase 5 (WP-501; WP-502 is owner-led).
WP-106 is done (PR #144); WP-002 is done with this revision (the tracker and decision log exist).
Within a phase, follow numeric order unless a dependency says otherwise. WP-103 may initially link to systems and migrate to Evidence records once WP-201 lands.

## Appendix A — Kickoff prompt for Claude Code

```
Read docs/V2-IMPROVEMENT-SPEC.md (revision 3) in full, then docs/improvements/TRACKER.md
and docs/improvements/DECISIONS.md, then CLAUDE.md, PROJECT-STRUCTURE.md,
the Business Rules Document, openapi-contract.yaml, schema.prisma and docs/ROADMAP-V2.md.
Do not assume paths or rule IDs; discover them and cite what you find.
Revision 2 records that several things already exist (evidence layer, page-specific
guide prompt sets, additive-only migrations with a CI guard, capability-coverage test,
phone test, feature flags). Extend them; do not rebuild them. Migrations are additive only.
Start with WP-001, WP-002 and the WP-110 investigation only (no code for WP-110 until
the cause is confirmed). Report: baseline results including the build hash per route,
repo conventions you will follow (content model, flag mechanism, audit triggers, seed
mechanism, scheduler), and any conflict between the spec and existing documents.
Do not begin WP-101 until I approve the baseline. Never fabricate owner-supplied content.
Work one WP per branch and PR, contract-first, EXT-1 throughout. Before you stop, update
TRACKER.md (row, handoff entry, Next up) and DECISIONS.md — Section 0.1.
```

## Appendix B — Definition of a 10

A first-time visitor can, within two minutes: see what was built, open the proof for any claim, read how failures were handled, hear from a real client, run a real algorithm demo, see the AI guide's measured behavior including its failures, and reach the owner through one deliberate channel. Every number on the site is computed, dated, and traceable.
