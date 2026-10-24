# V2 Tracker — where the relay stands

The live status of every work package in `docs/V2-IMPROVEMENT-SPEC.md`. **Every Claude Code session reads this before any code and updates it before it stops** (spec Section 0.1). `tests/unit/v2-tracker.test.ts` fails if a WP from the spec is missing here, listed twice, has an unknown status, or if **Next up** names a WP that doesn't exist.

## Next up

**Next up: WP-102**

> **Sprint 1 (the home hero, D-030) is the current sprint and comes first** (owner, 2026-10-20); the note below is Sprint 2's start. (The part still open: LCP and CLS.) The budgets are done and enforced after every production deploy (D-027). What the spec's acceptance still asks for and the baseline says is unmet: phone LCP ≤ 2.5 s (3.0–6.2 s now on five of six routes), CLS ≤ 0.1 (home desktop 0.319, `/systems` desktop 0.156). First find each route's LCP element and the layout shifts (re-measure on a quiet machine — the baseline's lab numbers are noisy), then fix and ratchet `perf-budgets.json`. Then WP-111, then WP-103/104/109 remainders.

## Current sprint

**Sprint 1 — the home hero (owner request, D-030), a week, one release at the end, reviewed live.** Goal: *a first impression a professional would trust: the home hero rebuilt on real evidence, and the kit other pages inherit.* Plan: `HOME-HERO-PLAN.md`; record: `../FRONTEND-CRAFT-RECORD.md`; Figma: https://www.figma.com/design/KkGly8QVHOrfyRSFjcqLxb. **Direction C chosen 2026-10-20** (a professional hero image slot for desktop and mobile; the guide's character leaves the hero; Sunduza approved; the avatar later). Branch when building starts: `release/sprint-1`; the new hero ships behind the flag `home.hero_v2`. Every push is announced to the owner first (approve, or add per slice). Slice states: `Proposed` · `In progress` · `Done (merged, not yet released)` · `Accepted` (owner, at the live review) · `Rejected` · `Dropped`.

| Slice | What | State | PR | Updated |
|---|---|---|---|---|
| S1.1 | Skeleton of Direction C: live line, H1, role, statement from the block, actions, hairline ledger; phone first | **Done** (pushed and green in CI; owner approved the release 2026-10-20) | #218 | 2026-10-20 |
| S1.2 | Hero image slots (`hero-desktop`, `hero-mobile`), the slots' own size/quality settings, credit and focal points as block data, **`HeroBackdrop` — a cover behind the whole hero** (redone 2026-10-20 on the owner's direction) with its overlay setting and empty state | **Done** | #218 | 2026-10-20 |
| S1.3 | The cover images — **AI-generated in the owner's ChatGPT** (data-centre aisle with orange light lines; landscape 1536 × 1024 at 92.8 KiB, portrait 1024 × 1536 at 71.2 KiB), seeded by a data migration, with no credit line on the site (the owner's decision); budgets 100 / 80 KiB. The Johannesburg photograph was rejected and removed | **Done** — the look is for the live review on the flag | #218 | 2026-10-20 |
| S1.4 | The one entrance (CSS, timing from two settings, none under reduced motion) and the live line | **Done** (pushed and green in CI) | #218 | 2026-10-20 |
| S1.5 | Cut the old hero: the character, rig, flickering grid, beam and stat cards are removed from the code (`HomeHero`, `HeroGuide`), and the new hero is the only hero — no flag (D-038, the owner's instruction after the first release) | **Done**; first-view weight to be measured on the runner | #218 | 2026-10-20 |
| S1.6 | No duplicates: the hero's rules and audited figures carry their evidence; the control room drops its tiles and two terminal lines when the new hero shows | **Done** (pushed and green in CI) | #218 | 2026-10-20 |
| S1.7 | Verify and measure: phone LCP ≤ 2.5 s, CLS 0, axe 0, mobile e2e, budgets, baseline; flag on at the review | **In progress** — CI on `07b9d26` is green (lint, migration-check, test incl. Playwright: unit and integration, 43 e2e tests incl. `home-hero-v2` and `header`); LCP/CLS and first-view weight are measured on the runner once the flag is on in production | #218 | 2026-10-20 |
| S1.8 | The kit: `HeroBackdrop`, `ProofLedger` (code) and Figma components (Button/Primary, Button/Glass, Chip/Live, Ledger/Cell, HeroImage Desktop and Phone); Design System §7, Playbook, redesign plan §7a, enforcement register, craft record updated | **Done** — `PageHero` keeps its field until each inner page is rebuilt on the pattern | #218 | 2026-10-20 |
| S1.9 | The header and navigation (owner request): the Systems preview of the owner's real featured systems with live status, a glass nav pill over the cover image, and every word in the header and phone menu as owner-edited data (`site-header` block) | **Done** (pushed and green in CI) | #218 | 2026-10-20 |

**Sprint 2 (planned, not started):** WP-102 (the rest), WP-111 (start its counts early — a week of data), WP-109. Sprints 3–9: `WAY-OF-WORKING.md` Section 10. Retro lines go in the handoff log.

## Status values

`Not started` · `In progress` · `Partial` (some of it already exists — see the spec's Section 1.2.1) · `Blocked — owner` (waiting on the owner input register, spec Section 9) · `Done` · `Superseded`

## Work packages

| WP | Title | Phase | Status | Branch / PR | Updated | Note |
|---|---|---|---|---|---|---|
| WP-001 | Baseline measurement | 0 | Done | PR #202 | 2026-10-10 | Include the guide eval baseline (39/39) and the measured image weights (spec 1.2.2) |
| WP-002 | Tracker and decision log | 0 | Done | V2 spec lock PR | 2026-10-02 | This file and `DECISIONS.md` |
| WP-101 | Homepage metadata and link previews | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | One metadata helper for every page (`lib/seo/metadata.ts`): share image 1200×630, `summary_large_image`, site name, `en_ZA`; descriptions clipped at a sentence (`lib/seo/clip.ts`); per-system share-image alt via `generateImageMetadata`. Re-check with a link-preview debugger after deploy |
| WP-102 | Image performance and CI budgets | 1 | Partial | PR (feat/wp-102-budgets) | 2026-10-10 | Character weight fixed earlier (V1 finalization). Budgets: `perf-budgets.json` + `scripts/check-budgets.mjs`, run after every production deploy (job `budgets`): weights fail, Lighthouse LCP/CLS/performance targets warn (D-027). Phone LCP target (2.5 s) is NOT met yet on five routes — that is a performance task, not a budget one
| WP-103 | Skill evidence tiers (+ manifests) | 1 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | Manifest evidence built: the sync reads package.json (+ workspaces), requirements.txt, pyproject.toml into `System.githubDependencies`; `Skill.aliases` (admin-editable) link skills as `SkillOnSystem.source = manifest`. Real preview: this platform 11 skills, Sunduza 15, Xkimi 12. Remaining: the `SkillEvidenceTier` lookup and links to the manifest line |
| WP-104 | Work-map curation | 1 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | Deleted repos now leave every public list (`System.githubGoneAt`; the owner's two portfolios retired). Remaining: the `ProjectGroup` lookup and grouping |
| WP-105 | Contact exposure | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | No raw email or WhatsApp in the footer, the home contact band or the phone menu; /contact keeps both as the deliberate alternative (D-006). Click-to-reveal obfuscation on /contact not built — D-011 |
| WP-106 | CV on the homepage | 1 | Done | PR #144 | 2026-10-02 | Header button, phone menu, home hero |
| WP-107 | AI guide prompts | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | Data migration: "Is he a good fit…" → "What evidence supports a full-stack AI role?"; the RAG chip → "How does he use AI in what he builds?" (D-007) |
| WP-108 | Honest activity labels | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | `lib/rules/activity.ts` (tested): recency only for building work or commits in the last 4 weeks; finished/coursework cards say nothing stale. `stage` added to the public system shape (contract) |
| WP-109 | Domain-ready configuration | 1 | Partial | — | 2026-10-02 | `siteUrl()` already the one source |
| WP-110 | Deploy consistency | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | Not a defect: two same-day deploys. `scripts/smoke-build.mjs` + `.github/workflows/post-deploy.yml` assert every core page reports the deployed build after each production deploy (passed against `afed2f6`) |
| WP-111 | AI guide capacity in production | 1 | Not started | — | 2026-10-02 | Added in rev 3 |
| WP-201 | Extend the evidence layer | 2 | Partial | — | 2026-10-02 | EV-3 link check already in CI |
| WP-202 | Verified numbers | 2 | Not started | — | 2026-10-02 | |
| WP-203 | Public trust surface | 2 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | Baseline headers (PR #146) + `/.well-known/security.txt` from data (profile email, `siteUrl()`, Expires a year ahead). Remaining: script/style CSP report-only, CI header assertions, /status, /changelog |
| WP-204 | Accessibility and motion | 2 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | `tests/e2e/a11y.spec.ts`: axe WCAG 2.2 AA, no serious/critical violations on every public page at phone and desktop width plus a case study — in CI via `npm run test`; four case-study issues fixed. Remaining: keyboard and reduced-motion passes, screen-reader check |
| WP-205 | Error, empty and print states | 2 | Partial | — | 2026-10-02 | |
| WP-206 | Error and uptime monitoring | 2 | Blocked — owner | — | 2026-10-02 | Added in rev 3; owner creates the accounts |
| WP-301 | Cited answers | 3 | Partial | — | 2026-10-02 | |
| WP-302 | Public eval scorecard | 3 | Partial | — | 2026-10-02 | 39 judged cases exist |
| WP-303 | Abuse controls visible and tested | 3 | Partial | — | 2026-10-02 | |
| WP-304 | Unanswered-question loop | 3 | Not started | — | 2026-10-02 | Added in rev 3 (ROADMAP-V2 #16) |
| WP-401 | Audience entry paths | 4 | Partial | — | 2026-10-02 | Extend `VisitorLens` / `InquiryType` |
| WP-402 | Case study template upgrade | 4 | Partial | — | 2026-10-02 | |
| WP-403 | Xkimi aggregate impact metrics | 4 | Blocked — owner | — | 2026-10-02 | L3: approval per metric |
| WP-404 | Sunduza case study depth | 4 | Blocked — owner | — | 2026-10-02 | |
| WP-405 | Complete the roster | 4 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | FundsLink-Academy and Governova are public on KSDRILL-SA: published In progress with GitHub's own descriptions; the sync now re-decides a repo that goes private → public. Remaining: Spotball (owner) |
| WP-406 | Postmortem content type | 4 | Not started | — | 2026-10-02 | Verify Xkimi #533 in that repo |
| WP-407 | Long-form writing | 4 | Not started | — | 2026-10-02 | |
| WP-408 | Mathematics evidence for admissions | 4 | Blocked — owner | — | 2026-10-02 | |
| WP-409 | Testimonials | 4 | Not started | — | 2026-10-02 | The slot can be built; content is the owner's |
| WP-501 | Search algorithm visualizer | 5 | Not started | — | 2026-10-02 | |
| WP-502 | Spotball Intelligence Engine demo | 5 | Blocked — owner | — | 2026-10-02 | Owner-led, separate repo |

## V1 finalization (owner, 2026-10-02/03) — pulled forward from this spec

The owner asked for the spec's items that are "worth it, necessary and reasonable" to ship in the final V1, "not only the small ones". Those rows above say *V1 finalization*. Also in that batch, outside the spec: About and Journey redesigned (calmer, editorial, no duplicates), the footer's typed-in stack and the portrait badges removed, every page's section copy moved into the `page-copy` content block, the release line ("V1 · V2 on the way") from the `release` block.

## Handoff log (append-only, newest last)

Each entry: date · WP · what was done · what was verified (with numbers) · what's left · the exact next step · blockers.

### 2026-10-02 · WP-002 · spec locked as the V2 plan
- **Done:**
  - The owner's improvement spec moved to `docs/V2-IMPROVEMENT-SPEC.md` and locked as V2.
  - Revision 3 added:
    - every claim checked against the repo and production;
    - measured corrections (WP-102, WP-201, WP-302, WP-203);
    - four conflicts logged (D-004 to D-007);
    - reconciliation with ROADMAP-V2;
    - four additions: WP-103 manifests, WP-111, WP-206, WP-304.
  - This tracker and `DECISIONS.md` created, CLAUDE.md pointed here, and the tracker test added.
- **Verified:**
  - Production, build `afed2f6`: homepage meta (no `og:image`, `summary` card, description cut).
  - Real image downloads: 9 images, 562 KB on a phone at DPR 3; nothing downloaded at `w=3840`.
  - Footer: 3 `mailto:` links and 1 `wa.me` link.
  - Skills: 31 of 48 without a linked system.
  - Public repos: 10 (none for FundsLink-Academy, Governova or Spotball).
  - Headers: the PR #146 set is live.
- **Left:** everything not marked Done above.
- **Next step:** WP-001 — script the baseline (Lighthouse mobile and desktop, axe, image weight, metadata per route, the build hash per route) into `docs/improvements/baseline-2026-10-02.json` plus a summary, then stop for the owner's approval.
- **Blockers:**
  - The owner's answers to D-004 to D-007.
  - The owner input register (spec Section 9).

### 2026-10-03 · V1 finalization batch (WP-101, 102, 103, 104, 105, 107, 108, 110, 203, 204, 405)
- **Done:** see the rows above and the V1 finalization section; plus the About/Journey redesign, page copy as data, the release line, the GitHub sync fixes (private → public, deleted repos, uncurated descriptions follow GitHub until a write-up exists).
- **Verified:**
  - **Static checks and tests:** typecheck and lint clean; unit tests 173/173; integration tests 409/409; the github-sync suite 14/14 (3 new); `a11y.spec` 11/11 after the fixes; mobile e2e — run before release.
  - **Real data, read-only:** the manifest preview from the public repos (MALULEKE-KS 11 skills, Sunduza 15, Xkimi 12 via 9 workspaces).
  - **Production:** the smoke check against `afed2f6` passed on every route.
- **Left:** each row's Remaining note.
- **Next step:** WP-001 (baseline) — unchanged; measure after this batch is deployed so the baseline reflects V1 final.
- **Blockers:** D-004, D-005; the owner input register (spec Section 9).

### 2026-10-03 · V1 final released (PR #148, build 8d703cd) + follow-up
- **Verified on production:** every core page reports `8d703cd` (smoke check); FundsLink-Academy live as In progress; the deleted portfolios are gone from the repo list; the release line and `security.txt` are served. CI on PR #148: unit 173, integration 409, e2e 24/24 (13 phone + 11 axe).
- **Found on production:** Governova was missing — KSDRILL-SA refuses the sync's classic token, so production never listed its new repos. **Follow-up:** the sync now lists a refusing account's public repos anonymously (D-016, tested), and a migration creates Governova as In progress.
- **Next step:** unchanged — WP-001.

### 2026-10-03 · V1 showcase batch (branch release/v1-showcase)
- **Done:** Journey and About rebuilt at showcase level; the AI guide's thinking orb (real state, never timed labels); case-study share images served (they 404'd — route-group hash); the system map's caps moved to `home.map.*` settings with nothing dropped; the sync reads conventional monorepo workspaces (JS and Python); write-ups fall back across the free models and read public repos anonymously. Logged in ROADMAP-V2 Part 2.
- **Owner, after deploy:** Admin → Jobs → run `github.sync`, then `systems.writeups` — FundsLink Academy and Governova then get their stack and a generated case study (on the free models until a paid model is chosen, V2 #14).
- **Next step:** Let's Talk at showcase level, the systems coverflow; then WP-001.

### 2026-10-03 · V1 closed — final releases #152 (5bed0dd) and #154 (c0eb952)
- **Done (V1, not V2 work):**
  - #152: Journey, About and Let's Talk at showcase level; the systems spotlight (coverflow); the AI guide's thinking orb; case-study share images fixed (they 404'd — route-group hash); the system map's and catalog's caps moved to settings, nothing dropped; monorepo manifests read; write-ups fall back across the free models and read public repos anonymously.
  - #154: one map of real brand marks (`components/shared/TechChip.tsx`, official SVGs in `public/brands`); the whole stack as data (migrations `20261003120000`, `20261003121000`: platform packages, design tools, hosting); About's orbit carries every skill in use; hero numbers as Magic Card stat cards; /systems filters as dropdowns; the ranking ("most used first") said where it applies.
  - Logged in ROADMAP-V2 Part 2, components in PUBLIC-REDESIGN-PLAN §7a.
- **Verified:** CI green on both (unit 175, integration 411, e2e incl. phone, axe and share images). The integration sweep on production after c0eb952 covered every public route and all 12 case studies at 360 and 1280 px, with no overflow, page errors, hydration warnings, failed requests or broken images. All 106 internal links resolved.
- **Owner, still to do:**
  - Run Admin → Jobs → `github.sync` once more, so the new package aliases prove Motion, Radix UI, the AI SDK, Lucide and the rest from this repo.
  - Then run `systems.writeups` for FundsLink Academy and Governova.
- **Open questions for the owner** (log answers in DECISIONS.md):
  - Any hosting platforms beyond Vercel, Neon, GitHub and Railway?
  - Should AI coding tools (Claude Code, Gemini Canvas, ChatGPT) be listed as skills, given the no-AI-references rule for commits, PRs and issues?
  - The README (the owner's GitHub profile README) was refreshed with the owner on 2026-10-03 (#158, 115a074): the platform first, live API badges, Mermaid diagrams. **Never edit README.md without the owner's go-ahead.**
- **Notes for whoever picks up:**
  - The local machine has little RAM. Run one dev server at a time, and make it the only heavy process. The dev server is slow (5–70 s per page), so wait for hydration before driving the UI.
  - CI is the gate for e2e.
  - 21st.dev's `search_logo` MCP returned nothing on 2026-10-03; `https://api.svgl.app?search=` works directly.
- **Next step:** V2 starts fresh with **WP-001** (the baseline), exactly as the spec orders.

### 2026-10-08 · Home guide: one still pose, head turns to clicks and taps (owner request, not a WP)
- **Done:** the hero character keeps the master pose (no greeting wave, idle pose cycle, welcome-back wave, point or thinking frame); its head and eyes turn toward the pointer and toward any click or tap, on phones too (a dragging finger is followed even while it scrolls). The rig orients like a person — eyes first, the head a beat later, shoulders after, a blink with big turns. `flashPose` / `GuidePose` removed from the guide's state. D-020; ROADMAP-V2 Part 2; PUBLIC-REDESIGN-PLAN §3a.
- **Also (owner, same batch):** More work = Tshimo Agri Network, FundsLink Academy, Governova (home order on unfeatured systems); FundsLink and Governova restored as private, in progress, after the sync hid them as "gone" (D-021, sync fixed and tested); the system map's technologies as one wide connected cluster that fits on one screen, and the same drawing on phones; the guide's caps raised (500/day, 60/visitor, 40/conversation — free model) with a "resting, back in about N hours" message.
- **Next step:** unchanged — WP-001.

### 2026-10-08 · Map traced by click, phone map, every repo in every home, guide on phones (owner request, not a WP)
- **Done:** map click-to-trace / second click opens / click away resets, with a selection bar; a phone layout of its own; private repos shown as private by default and the show rule re-applied each run (D-022); the sync reports homes without private access; the guide's motion scaled for phones, tap glance and nod.
- **Shipped:** #161 (774e5b6) and #163 (2ee714d), both live. Verified in Chrome at desktop width (trace, reset, More work order, still guide turning to clicks); phone widths gated by the mobile e2e in CI only — the owner's Chrome is maximized, so the phone map and the guide's tap response weren't seen by eye. **First thing next session:** check the home page on a real phone (map bands, Show all, tracing, the guide turning to taps).
- **Why private repos don't show yet (as of 2026-10-08):** the production token is a *classic* token without the `repo` scope — classic tokens have no read-only private scope — so the sync sees 11 public repos and no private ones in any home. FundsLink Academy and Governova are on the site only because migration `20261008090000` restored their rows; once a token can see them, the sync keeps them current itself.
- **Owner, to do (agreed for next time):** in GitHub → Settings → Developer settings → Fine-grained tokens, create one token per home (MALULEKE-KS, KSDRILL-SA, GrowthCore-Solutions): Repository access → All repositories; Contents → Read-only (Metadata follows). Allow/approve fine-grained tokens in each org's Settings → Personal access tokens. Put them all in Vercel `GITHUB_SYNC_TOKEN` (Production), comma-separated; redeploy; run Admin → Jobs → `github.sync`; check `noPrivateAccess` is empty in that run.
- **Next step:** after the token check, V2 starts with **WP-001** as the spec orders.

### 2026-10-08 · AI guide phase 1 (owner request, not a WP — D-023)
- **Done:** `docs/AI-GUIDE-PHASE1-PLAN.md` built: shared conversation (`GuideChatProvider`), the console (`components/guide/console/`), card tools `show_*` (flags on), trail + sources, the character's bust at work, the home section replaced, the panel rebuilt on the console.
- **Next for the guide (phase 2 candidates, owner to choose):** a better model than the free one (cost first), role-tailored openers, "Ask the guide" in ⌘K search, rule cards once the enforcement register is data.
- **Next step:** unchanged — WP-001 after the owner's token and phone checks.

### 2026-10-08 · End of day — owner batch closed (owner request, not WPs; D-020–D-023)
- **Live on production (`9050df2`):** still hero character turning to clicks/taps (#161); More work order + private systems back + guide limits (#161, #163); map traced by click, phone layout, exact beams, lines only on selection, trace survives scrolling (#163, #166, #168, #170); AI guide phase 1 — collapsible section, one console/conversation, live cards (`agent.show_*` on), trail, sources, the character at work (#172, #176); retired-model fallback fix (#174); exact per-device limit messages (#176); Functions Storage trimmed (#178).
- **Vercel Hobby limit:** Functions Storage hit 13.08 GB / 10 GB (not Neon — Neon stays). Fixed: superseded deployments deleted (owner-approved; keep the live one + one rollback), each function 43 MB → 20 MB (`outputFileTracingExcludes`, DEPLOYMENT.md). Batch releases — today shipped ~15 deploys.
- **Verified:** CI green on every PR; production checks in the owner's Chrome (desktop); guide answers with real cards from production after the fallback fix; the trimmed preview served every DB page, the APIs and the guide.
- **Not verified by me:** phone layouts by eye (the owner's Chrome stays maximized — mobile e2e in CI only); the owner reports the guide works well on the phone.
- **Owner, to do:** (1) fine-grained read-only GitHub tokens per home so private repos sync (DEPLOYMENT.md); (2) a real-phone pass of the home page; (3) choose the guide's phase 2 (paid model for reliability first — free models had a retired id and 503 outages today).
- **Next step:** the AI guide's phase 2 (owner said "we will finish the AI phases next time"), then V2 **WP-001**.

### 2026-10-09 · AI guide phase 2 — plan, and release 1 built (owner request, not a WP — D-024)
- **Owner decisions (plan §11):** free models for now but nothing may need a rebuild when Claude is paid for; question log yes (scrubbed, 30 days); public eval scoreboard yes; voice later.
- **Release 1 built on `feat/guide-phase2-r1` (#180):** P2-0 `GuideTurn` metrics + Admin → Guide health + benchmark script; P2-1 the evals as data (111 cases, plain-rule checks, gate tier), their own workflow, the nightly canary job `guide.canary` (own cron entry 01:30 UTC); P2-2 computed durations in the knowledge, the **instant lane** (flag `concierge.instant_lane`, wording in Admin → Page content → "AI guide — instant answers"), the first-word deadline (setting, off), the warm-up call. The humor governor's pure core (`lib/guide/tone.ts`) is written and tested but **not yet wired** into the route (release 2). A2 (retrieval) deliberately deferred — measured corpus ~10.5k tokens (plan §3, ROADMAP-V2).
- **Verified:** typecheck, lint, all unit tests, all integration tests (two timeouts under load pass alone). **Not verified by me:** nothing ran against a live model (this machine has no gateway credential; the production endpoint was not used for benchmarking); e2e/mobile and the Guide health page by eye (RAM); CI is the check.
- **Owner, to do:** (1) add the repository secret `AI_GATEWAY_API_KEY` (a Vercel AI Gateway API key) so `.github/workflows/ai-evals.yml` really tests the guide — without it the workflow says "NOT RUN"; (2) after deploy, glance at Admin → Guide health and the instant answers' wording (Page content); (3) the next paid-model step needs no rebuild: change `concierge.model` (and the fallbacks, `concierge.firstTokenDeadlineMs`, `concierge.canary.paceSeconds`) in Settings.
- **Next step:** release 2 (verifier + question log + "how this answer was made", the humor governor wired in, question playbooks, compare and Fit Check), then release 3 (tour, ⌘K ask, feedback, public scoreboard); V2 **WP-001** stays next in the spec order after the guide.

### 2026-10-09 · AI guide phase 2, release 2 built (D-024; branch `feat/guide-phase2-r2`, issue #182)
- **Release 1 is live** (PR #181, squash-merged after green CI; migrations apply on the build).
- **Release 2 built:** answer verifier + question log (scrubbed, retention setting, disclosure beside the chat box); humor governor wired in; question playbooks; `compare_systems` and the Fit Check (`fit_check`) — both **off** until switched on in Admin → Flags (`agent.compare_systems`, `agent.fit_check`). Owner's rule (same day): nothing hardcoded — every number is a `concierge.*` setting, every sentence the model doesn't write is owner-edited content (`guide-instant`, `guide-fit`, `ai-guide.privacyNote`).
- **Owner, to do:** review the new wording in Admin → Page content ("AI guide — instant answers", "AI guide — Fit Check notes", "What the chat says it keeps"); look at Guide health after traffic; switch the two tools on after seeing them; add `AI_GATEWAY_API_KEY` as a repository secret.
- **Next step:** release 3 (guided tour with spotlight anchors, page-aware openers and ⌘K ask, feedback and "this was wrong", the public reliability scoreboard from the nightly canary, challenge-a-claim); voice stays last/optional; V2 **WP-001** after.

### 2026-10-09 · AI guide phase 2, release 3 built on the same branch (D-024, D-025; issues #182, #183)
- **Built:** guided tours (`agent.tour`, off; owner's content in `guide-tours`), ⌘K "Ask the guide", feedback and challenge buttons (owner's wording; hidden until written), the public self-check (`PublicGuideCheck`, `GET /guide/check`, said beside the chat box), feedback on Guide health. Voice not built (owner: later).
- **Owner, to do (adds to release 2's list):** write the button and note wording in Page content ("What the chat says it keeps" fields: feedback, challenge, self-check); review the starter tour ("The evidence, in four stops") and switch `agent.tour`, `agent.fit_check`, `agent.compare_systems` on in Admin → Flags when you've seen them; the `post-deploy` smoke workflow has failed on every production deploy since before this work (it fetches a login-protected deployment URL) — worth a look, production itself is healthy.
- **Next step:** merge this branch after CI; V2 **WP-001** is next in the spec order; voice (P2-8) stays optional.

### 2026-10-09 · AI guide phase 2 — live checks and follow-ups (D-024, D-025; PRs #184–#198)
- **Built since release 3:** the guide's API key is set (Actions secret + Vercel), so the evals and self-check run for real; verifier no longer flags a technology a role *asks for* (#190); Guide health no longer reads a free primary model as its own fallback (#188); the AI-evals workflow runs one at a time (#192); the `post-deploy` smoke now reads the production domain (`PRODUCTION_URL` repository variable) and waits for the new build (#194); the self-check's own questions stay out of the visitors' question log (#196); questions the last self-check couldn't ask go first next time (#198).
- **Live:** `agent.fit_check`, `agent.compare_systems` and `agent.tour` are switched on in production. The first self-check ran (7 asked, all passed; 3 not asked — time budget/busy — now rotated to the front). The starter tour was walked in the owner's Chrome: card, stop 1 `/systems`, Next → `/about#skills` scrolled to the section.
- **Finding:** production input averages ~24–27k tokens a turn (the dev database said ~10.5k) — the ~25k retrieval trigger is reached; plan §3 A2 and ROADMAP-V2 corrected. Retrieval waits for a recorded eval baseline (WP-001), then is built behind a default-off setting. The free model's second step (after a tool) takes ~15–20 s; the tour answer retells the stops despite the prompt — a wording tweak to evaluate with the baseline.
- **Open:** first full gate-tier eval result (run `37983159043`); one canary-written `GuideGap` row from before #196 expires in 30 days; CI flake in `guide-cards`/`guide-compute-tools` setup (passed on rerun, cause not found); older `GuideTurn` rows keep the old fallback flag.
- **Next step:** V2 **WP-001** (include the guide's eval baseline and image weights); voice (P2-8) stays optional.

### 2026-10-09 · WP-001 started — baseline script written, full run still to do (issue #201, branch `feat/wp-001-baseline`)
- **Done:** `scripts/baseline.mjs` (`npm run baseline <url>`) — per route and for phone and desktop: Lighthouse (lighthouse@13.5.0, dev dependency), axe WCAG 2.2 AA, requests/bytes by type with every image, share metadata, footer build vs the platform pulse; writes `docs/improvements/baseline-<date>.json` and `.md`. Tried on `/contact` against production (build `17df587`): phone perf 65 / desktop 80, a11y 100, 0 axe violations, 41 requests, 876 KB, images 190 KB, `guide-master.webp` 116 KB still the largest, footer build matches. D-026.
- **Not done:** the full six-route run. It was stopped twice by the machine running out of memory (≈0.2 GB free while other jobs were running). Run it when memory is free: `MSYS_NO_PATHCONV=1 node scripts/baseline.mjs https://maluleke-ks.vercel.app --out docs/improvements/baseline-2026-10-09` (≈2 min per route; close other heavy programs first), then add the guide's eval baseline from the latest full `AI evals` run, commit both files and set WP-001 to Done. Re-run one route to record the variance (spec Verify).
- **Next up:** stays WP-001 until the run is committed.

### 2026-10-10 · WP-001 done — baseline recorded (PR #202, issue #201; D-026)
- **Done:** the full six-route baseline against production build `17df587`: `docs/improvements/baseline-2026-10-10.json` and `.md` (Lighthouse phone and desktop, axe, weights, metadata, footer builds) plus the guide's eval baseline: gate tier **93/95** on the nightly run (38013807118, 2 h 6 min on the free models) — `formal-hr` was a real register slip, `interview-panic` a gateway outage. Variance recorded from two `/contact` runs (weights within 1.2 KB; scores ±15 on this loaded machine).
- **Also fixed:** the formal-register slip — a formal matter (a letter, a reference check) now asks for a formal, third-person, no-contractions reply, not only "no jokes" (`lib/guide/tone.ts`, tested). Re-check on the next nightly run.
- **Findings for later WPs:** every route but `/contact` has phone LCP over 2.5 s; `guide-master.webp` is the largest image on five of six routes; home desktop CLS 0.319 (> 0.1). Re-measure the outliers on a quiet machine before setting budgets. Axe is clean (0 violations everywhere); every route reports the platform's build.
- **Next step:** WP-102 — Lighthouse CI budgets set from this baseline (a re-run on a quiet machine first). Owner to-do: look at `/` and `/systems` mobile LCP in the baseline and say if the targets in the spec are the ones to hold.

### 2026-10-10 · WP-102 budgets built (issue #203, branch `feat/wp-102-budgets`; D-027)
- **Done:** `perf-budgets.json` (weights = the WP-001 baseline plus headroom; lab targets LCP 2.5 s / CLS 0.1 / performance), `scripts/check-budgets.mjs` (measures weight on phone and desktop, Lighthouse on the phone, judges with `scripts/lib/budgets.mjs`), job `budgets` in `post-deploy.yml` after the smoke check, `tests/unit/perf-budgets.test.ts` (covers every route, the baseline can't exceed its budget, weights fail, lab warns). The measuring code is shared with the baseline (`scripts/lib/page-measure.mjs`). Checked live on `/contact` (875.5 KB — a third measurement within 2 KB of the others).
- **Left (why the row is Partial):** the spec's LCP ≤ 2.5 s and CLS ≤ 0.1 targets are not met, so lab breaches only warn for now. Next: identify LCP elements and shifts per route, fix, then tighten the file.
- **Diagnosis so far (home, phone, one Lighthouse run — to confirm on a quiet runner):** the LCP element is the hero lede paragraph (plain text, no animation); TTFB 0.4 s, element render delay ≈ 2.8 s; two render-blocking CSS files (≈ 26 KB, ≈ 300 ms); total blocking time ≈ 3.3 s at 4× CPU, so main-thread JavaScript (guide rig, motion, hydration) is the likely lever, not images. One run also reported a 0.22 layout shift on the footer (content above it arriving late) while the baseline run measured 0 — the shift is intermittent. Candidates: defer non-first-view client code, inline or trim the render-blocking CSS, reserve space for late content.

### 2026-10-10 · WP-102 — the guide's chat engine loads after the first view (issue #205, branch `feat/wp-102-lazy-chat`)
- **Done:** `GuideChatProvider` is now a light shell; the AI SDK conversation moved to `GuideChatEngine` (dynamic, `ssr: false`), mounted on the first sign of use — tap, key, scroll, focus, the panel opening, a question from the page, or a conversation saved in the tab. Views read a small store (`useSyncExternalStore`), so a streaming answer re-renders the views, not the page. A question asked in the gap is held, shown as "working", and sent when the engine arrives. Measured on production before this change: ~452 KB of script on every page, of which the AI SDK ≈ 56 KB and zod ≈ 94 KB gzip (react-dom 70, motion 80).
- **To verify after the next production deploy** (the budgets job and `scripts/baseline.mjs` will show it): script bytes and total blocking time on the phone should fall by roughly the engine's share; phone LCP should follow. If zod chunks remain on first load, find who else imports it on the client. Then tighten `perf-budgets.json`.
- **Still open for WP-102:** CLS (home desktop 0.319 — intermittent footer shift), the LCP target itself, and the 10 font files (165 KB) on every page.
- **Measured after #206 on production (CI runner, phone):** script on first load 452 → 402 KB gzip; total page weight −50 KB per route; Lighthouse performance 76–90 on the runner (the 46–68 baseline was taken on a loaded laptop — use the runner's numbers as the reference); CLS 0 on every route; phone LCP still 3.0–5.5 s. Found by experiment under real throttling (1.6 Mbps, 4× CPU): the page is bandwidth-bound — the first paint lands at ≈ 3.7 s with fonts and ≈ 2.1 s without, scripts add ≈ 1.3 s to the lede's LCP; image preloads made no difference.
- **Next (branch `feat/wp-102-no-zod-first-load`):** zod (≈ 94 KB gzip) was still on every page because the tour card imported `stepTo` from `lib/guide/tour.ts`, which carries the tour block's validators; `stepTo` now lives in `lib/guide/tour-step.ts`, and `tests/unit/client-bundle-zod.test.ts` bundles every public client component and fails if one outside the contact form reaches zod. Remaining levers, in order: motion (≈ 80 KB — `LazyMotion` with the lighter feature set), the 10 font files (165 KB; fewer weights, or load the rare ones later), the vercel analytics chunk (16 KB, already behind consent?).
- **CI flake explained and fixed:** `guide-cards` / `guide-compute-tools` took `organization.findFirstOrThrow()` — any organization; when it was a client one, BR-1.2's trigger forced the new published system to `REQUIRES_APPROVAL` and BR-1.1's check refused it. They now pick a non-client organization. The two other CI failures on #208 were 5 s timeouts of bcrypt and image tests on the slow runner; integration tests now have a 30 s timeout (a real hang still fails).

### 2026-10-10 · WP-102 — after #206 and #208, measured on the production runner (build 2212f28)
- **Weights:** every route 650–900 KB (was 800–1045): home 997 → 845 KB, `/journey` 800 → 650 KB. Phone LCP 3.0–4.4 s (was 3.0–6.2 s); performance 69–88 on the phone and 83–100 on desktop; desktop LCP 0.75–0.87 s everywhere.
- **CLS found, reproducible:** home desktop 0.319 and `/systems` 0.16–0.23 — all the footer: while a page streams in, `<main>` is shorter than the screen, the footer sits in view, then is pushed down. Fix (branch `fix/wp-102-footer-shift`, issue #209): `<main>` is at least a screen tall (`min-h-svh`), so the footer is below the fold until the content has arrived.
- **Still open for WP-102:** phone LCP over 2.5 s (JS ≈ 340 KB gzip + fonts 165 KB on a 1.6 Mbps link — see the levers above), and tightening `perf-budgets.json` to these numbers once the CLS fix is confirmed.
- **After #210 (build 2070036):** home CLS is 0 on phone and desktop. `/systems` still shifted (0.234 phone, 0.158 desktop, reproduced under throttling): the hero's counts and the spotlight ring streamed in separately with no reserved height and pushed the catalog down. Fix (branch `fix/wp-102-systems-shift`): one boundary for both, with a fallback that holds their measured height (phone 415 px, wider 470 px; filtered 76 / 32 px).

### 2026-10-10 · Handoff — the unfinished items are deferred to V2 (owner: "defer the not finished to v2")
- **State:** main is `8907403`; everything built this session is merged and live. WP-001 Done; WP-102 Partial (budgets, lazy chat engine, no zod on first load, footer and `/systems` shift fixes built; the LCP target is open).
- **Deferred, in order** (also in `docs/ROADMAP-V2.md`, update log): (1) confirm #212's `/systems` CLS in the next post-deploy budgets run and tighten `perf-budgets.json`; (2) phone LCP ≤ 2.5 s — motion `LazyMotion`, fonts, analytics chunk; (3) guide retrieve-then-answer behind a default-off setting, judged by the eval gate; (4) content-tier evals in full and a look at `formal-hr` on the next nightly run; (5) voice, optional.
- **Next up:** WP-102 (the open part), then WP-111, then the WP-103/104/109 remainders.

### 2026-10-10 · Session closed — final numbers (main after #214; branch `docs/close-session`)
- **Confirmed on production (build 8907403, runner, phone / desktop):** CLS **0 on every route and device** — the footer and `/systems` shifts are fixed. Weights 650–900 KB (home 997 → 846, `/journey` 800 → 651). Performance 78–87 phone (`/xkimi` 85), 99–100 desktop. Phone LCP 3.2–4.8 s — the one open WP-102 target (≤ 2.5 s).
- **Budgets tightened** to these numbers (+10–15%): `perf-budgets.json` is now a ratchet; the test only forbids them being looser than the baseline + 20%.
- **Deferred to V2** (unchanged order, minus the confirmed CLS item): phone LCP; guide retrieve-then-answer behind a default-off setting judged by the eval gate; content-tier evals in full and `formal-hr` on the nightly; voice (optional).
- **Next up:** WP-102 (LCP only), then WP-111.


### 2026-10-20 · Sprint 0 — V2 goes agile (owner instruction; D-028, D-029; branch `docs/v2-agile-way-of-working`)
- **Owner, 2026-10-20:** "we are going to start and launch V2 in an agile approach and work a bit by bit and part by part delivering a working software, so agile must be our core working technique … see the process of implementation of V2 and come back with it to me so I can add some."
- **Done (docs only, no code):**
  - `docs/improvements/WAY-OF-WORKING.md` v0: slices and sprints, the rhythm (planning, daily = this relay, review, retro, refinement), Definitions of Ready/Done/Released, how releases fit the Vercel deploy budget, the owner lane, the proposed sprints 1–8 (same scope and order as spec Section 13), Sprint 1 sliced, six open questions for the owner.
  - CLAUDE.md "Start here" and its document table; spec revision 4 (Section 1.3, 0.1 step 1–2, Section 13 note) — process only, no scope change; this tracker's **Current sprint**; D-028 (decided) and D-029 (awaiting owner); ROADMAP-V2 update log.
- **Verified:** the vitest run of `tests/unit/v2-tracker.test.ts` was killed by memory pressure (worker exit 143, ≈0.5 GB free), so it did **not** run under vitest; the test's four checks, run directly in Node against the edited files: 34 WPs in the spec, 34 tracker rows, every status valid, Next up = WP-102 (real) — no problems. CI is the gate. No code changed; nothing was run against production.
- **Left:** the owner reads `WAY-OF-WORKING.md`, answers its Section 11, and approves Sprint 1 (or reorders). Then planning closes and `release/sprint-1` opens.
- **Next step:** on the owner's go — S1.1 (WP-111 counts), because its week of data starts the clock. **Next up stays WP-102** (the tracker's standing order) until the owner confirms Sprint 1.
- **Blockers:** the owner's answers (WAY-OF-WORKING Section 11); D-004/D-005 still awaiting; the owner to-dos from 2026-10-08 (real-phone pass, fine-grained GitHub tokens).
- **Note:** `01-physical-topology.png` shows as deleted in the working tree from before this session; untouched here.

### 2026-10-20 · Sprint 0 continued — the owner's answers, the hero plan, Figma designs, the craft record (D-029, D-030, D-031; branch `docs/v2-agile-way-of-working`)
- **Owner's answers:** a week per sprint; one release per sprint ("master chef" — D-029 decided); live reviews; keep the spec's order; **every push is announced and the owner approves or adds recommendations/suggestions/improvements per slice** (WAY-OF-WORKING §7). Then: begin with the **home hero** — "real professional clean worldwide … it seems like an AI generated or animation system" — using Figma, Motion, shadcn/ui, Magic UI, 21st.dev and what professional platforms use, and document it as the frontend design-and-implementation record.
- **Done (docs and design only — no code changed):** `HOME-HERO-PLAN.md` (diagnosis of the live hero, principles, 3 directions with a recommendation, structure, data, toolchain, slices, decisions for the owner); **Figma file `KkGly8QVHOrfyRSFjcqLxb`** — 21 token variables and four frames (A desktop + phone, B, C) in IBM Plex with real figures, placeholders where the real screenshots/portrait go; `FRONTEND-CRAFT-RECORD.md` (toolchain, method, repo evidence, dated log), required by the Definition of Done; D-029 decided, D-030, D-031; CLAUDE.md, the spec, WAY-OF-WORKING and the roadmap log updated; Sprint 1 re-goaled to the hero, the old Sprint 1 is Sprint 2.
- **Verified:** the live hero seen in the owner's Chrome (desktop, build `0091d34`) — the phone layout was not seen by eye; Magic UI's registry (`safari`, `marquee`, `blur-fade`) and 21st.dev's search answered (2 free retrievals left, none used); the Figma frames screenshotted and corrected twice; the tracker test's four checks run in Node after these edits (the vitest worker is killed by this machine's memory).
- **Not done / honest limits:** the reference platforms (Linear, Vercel, Resend) could not be captured this session (the machine ran out of memory on those pages) — the plan's principles are from knowledge and say so; Figma cannot fetch images, so the real captures and the portrait are placeholders; the owner's Figma seat is *View* on a Starter plan.
- **Next step:** the **live review** — the owner picks A/B/C, the wording and the guide's place (HOME-HERO-PLAN §13); then S1.1's build on `release/sprint-1`, behind `home.hero_v2`. I announce the first push and wait for approve-or-additions.
- **Blockers:** the owner's choices above. All of this sits uncommitted on the local branch; no issue, commit or PR has been made — say when.

### 2026-10-20 · Sprint 1 — the owner chose Direction C (D-030; branch `docs/v2-agile-way-of-working`)
- **Owner's decisions:** Direction **C · Editorial** with a **professional hero image** (real photography from a professional site, a crop each for mobile and desktop, related to the work and the system); the AI guide's character leaves the hero (approved); wording per my recommendation; Sunduza yes; the avatar later; hero and home colours must be clean, beautiful and world-class.
- **Done (docs and design only — no code):** `HOME-HERO-PLAN.md` v1 rewritten around C (structure, the image brief — themes, criteria, sources, licence-as-data, slots `hero-desktop`/`hero-mobile` as `PHOTO_PURPOSES` entries, budgets ≤ 90 KB desktop and ≤ 60 KB mobile — the colour treatments with contrast figures, the toolchain, 8 slices); Figma: frames *C v2 · 1 Graphite (recommended) · 2 Ember horizon · 3 Bone* at 1440 and *1 Graphite* at 390, the image slot and credit pill included, A and B marked *explored*; the craft record log.
- **Verified:** Figma frames screenshotted and corrected (one label overflow on the phone); Unsplash searched in a new tab of the owner's Chrome (view only, nothing downloaded): *dark server room* 304 photos (generic green racks), *johannesburg skyline dusk* 7 photos (warm skylines), *developer workspace dark code* 5.6k; the photo mechanism read in `lib/profile/photos.ts` (a new slot is one entry, uploads re-encoded to WebP with metadata stripped). The licence wording is from my knowledge and is to be read on each photo's own page.
- **Next step:** the live review — the owner picks the image(s) and the colour treatment (plan §13); then S1.1 on `release/sprint-1`. I announce the push first.
- **Blockers:** the owner's image and colour picks (S1.3 only; S1.1 and S1.2 can start without them). Still uncommitted on the local branch — approval to commit and open the docs PR is still open.

### 2026-10-20 · Sprint 1, S1.1 built — the skeleton of Direction C (D-030, D-032; local branch `docs/v2-agile-way-of-working`, nothing committed or pushed)
- **Owner's decisions:** colour = "B … which is C v2" (read as treatment **2 · Ember horizon**); go-ahead for S1.1; the hero photo is **not his own** — find the best fit online (done: Tania Melnyczuk's Johannesburg dusk on Unsplash, plan §7, nothing downloaded); "5" he will tell after this slice (read as the push/commit approval — I am holding all git operations until he says).
- **Built (S1.1):** flag `home.hero_v2` (off), `HomeHeroV2`, `lib/home/hero.ts`, the `home-hero` content block (statement, with its admin field), `AskGuideButton showFace`, `.type-hero-name`, `HomeContent` switch, one additive migration (`20261020120000_home_hero_v2`: the flag row off + the approved statement).
- **Verified (numbers):** `tests/unit/home-hero.test.ts` 6/6; `client-bundle-zod`, `v2-tracker` (now under vitest — the earlier handoff said vitest could not run; it can when memory allows), `perf-budgets` 3 files / 11 tests pass; typecheck clean (`tsc --noEmit`, 77 s); eslint clean on every changed file; the migration applied to the local test database and `site-content-and-logout` + `db-roles` 17/17 and `capability-coverage` 4/4 pass; the migration is INSERT … ON CONFLICT only (additive). The CI migration guard compares committed files, so it reports 0 until the commit.
- **Not verified:** the hero **rendered** — free memory was ≈ 0.6 GB (the dev server needs more); phone and desktop by eye and the e2e (phone, axe) are for the live review and CI. The flag is off in production, so CI's existing hero tests are unaffected.
- **Honest caveats:** Figma shows "Kurhula Maluleke" but the build uses the profile's real `displayName` (plan §14); the colour reading is an interpretation to confirm.
- **Next step (push gate):** announce S1.1 for the owner's approve-or-additions, then S1.2 (the image slots). S1.3 needs the owner's yes to download the chosen photo.
- **Blockers:** the owner's go for the push; the download yes; confirmation of colour 2.

### 2026-10-20 · Sprint 1, S1.2–S1.8 built on the local branch — the hero, its photograph and its kit (D-030, D-032, D-033)
- **Owner, 2026-10-20:** "I APPROVE ON MASTER CHEF GO ON AND COOK EVERYTHING AT THE HIGHEST LEVEL, REMEMBER NOTHING HARDCODED" — read as approval of S1.1, of the one named photo download and of the colour reading, and as the go for the rest of the sprint. **Not read as** approval to merge to `main` or to switch the flag on: that stays the live review.
- **Nothing hardcoded:** every label, the statement, the credit and the focal points are the `home-hero` block (seeded; shipped wording only as a fallback); the photos are two photo slots; the image's size and quality, the entrance's timing and the glow are seven `home.hero.*` settings; the figures are computed. The Figma short name was not used — the name is the profile's.
- **Built:** S1.2 slots + settings + `HeroImage`; S1.3 the photograph (downloaded with approval: *City skyline during night time*, Tania Melnyczuk, Unsplash, Original Size 4032 × 2268, 1.23 MB; cropped 21:9 and 4:5, graded lightly, encoded 88.6 KB and 57.3 KB; `scripts/build-hero-photos.mjs`, `design/hero/`, migration `20261020140000_home_hero_photos`); S1.4 CSS entrance; S1.5 the old hero out of the first view behind the flag; S1.6 the evidence moves with the figures and the control room stops repeating them; S1.8 the kit in code, docs and Figma (a *Kit — hero components* page).
- **Also added:** the preview switch `/?hero=v2` (refused on production) so the hero can be seen and tested before the flag is on (D-033).
- **Verified (numbers):** unit **504/504** (46 files, incl. the new `home-hero`, `photo-slots`, the zod-out-of-first-load guard and the tracker); typecheck clean; eslint clean; migrations `20261020120000/130000/140000` applied to the local test database; integration `home-hero`, `profile-photos`, `capability-coverage`, `site-content-and-logout`, `db-roles` green and the **full integration suite: 47 files, 492 tests, all pass**. Photos: 2560 × 1097 at 88.6 KB (budget 90) and 1169 × 1462 at 57.3 KB (budget 60), no metadata, asserted in `tests/integration/home-hero.test.ts`.
- **Not verified:** the hero **rendered** (free memory ≈ 0.6 GB; the dev server is not safe), phone and desktop by eye, LCP/CLS and first-view weight, and the Playwright spec — all for the live review and CI after the push. The photograph's look at the page's real size is unseen by me; I did see both crops at full resolution.
- **Decisions:** D-033 (preview switch; CSS entrance and why not Motion; the ledger carries the evidence and the control room drops its duplicates; the phone image budget is 60 KB, not 55).
- **Next step (live review, with the owner):** push `release/sprint-1`, open the PR (CI runs unit, integration, Playwright), look at `/?hero=v2` on desktop and a phone, tune by eye (glow strength, focal points, copy — all admin data), then switch `home.hero_v2` on in Admin → Flags and measure LCP/CLS and weights on the runner; ratchet `perf-budgets.json`. The release to `main` and the flag flip wait for the owner.
- **Blockers:** none for the push; the owner's live review decides the flip.

### 2026-10-20 · Sprint 1 — pushed, CI green, previewed (PR #218 open, not merged; issue #217; branch `release/sprint-1`)
- **Pushed once** (`c7e2e1d`, then the test fix `5cba498`); PR #218, milestone *V2 — Sprint 1: the home hero*, labels public + enhancement. **Not merged and the flag is off** — the release and the flip are the live review's.
- **CI:** first run failed only in my new Playwright spec — one assertion too blunt (the evidence chip's screen-reader label made a phrase appear twice in the page text) and one flaky axe scan (it could sample the entrance mid-fade at 40 % opacity). Both were test issues, not product issues; fixed (the check now asserts the control room no longer repeats the figures, and axe waits for the finite entrance animations). Second run all green: lint, build, migration-check, test (unit 473, integration 492, 39 Playwright tests). The AI-evals workflow is separate and not a gate for this PR.
- **Seen rendered, once:** the Vercel preview of `c7e2e1d` at `/?hero=v2`, in the owner's Chrome, desktop only: the name on one line, the role, both actions, the build line and the ledger with *Evidence · 1* on the rules and audited figures; the control room's tiles are gone and the rest of the page flows. **The statement and the photograph were absent on the preview** because the preview uses the production database, which has not had this sprint's migrations — they apply on the production build after the merge. The phone layout was not seen by eye.
- **At the live review:** (1) the owner says go; (2) merge #218 → the production build applies the three migrations (flag still off); (3) switch `home.hero_v2` on in Admin → Flags, or look first at `/?hero=v2` — refused on production, so use the flag; (4) tune by eye in the admin: the statement and labels (Page content → Home — hero), the glow and entrance (Settings → home.hero.*), focal points; (5) measure phone LCP/CLS and weights with the budgets job and `npm run baseline`, ratchet `perf-budgets.json`; (6) the owner accepts or rejects each slice.
- **Open for the owner:** the colour reading (2 · Ember horizon) and the full-name-or-short-name question (the hero uses the profile's real name); the avatar and everything else deferred.

### 2026-10-20 · Sprint 1 — the cover image redone, and better content (owner direction; D-034; local commits, not yet pushed)
- **Owner (live review, local):** the first image was a framed panel and a skyline — "not related to the system or software engineering"; he wanted the image **behind the whole hero** with the content on it, generated in **ChatGPT** (a powerful prompt; mobile and desktop), and "a better hero content".
- **Done:** ChatGPT (his Chrome, his Free account) generated two photoreal data-centre aisle images from the two prompts recorded in `design/hero/README.md`; downloaded under his instruction; encoded (92.8 and 71.2 KiB). `HeroBackdrop` replaces `HeroImage`; the hero is a full-screen cover with a setting-driven overlay (`home.hero.scrim`); the credit says *AI-generated with ChatGPT*. Content: a new first-person statement with no figure in it, a credential from his own titles, a "Building now" line from the GitHub sync, and a ledger that leads with systems shipped to production.
- **Removed:** the Johannesburg photograph and its migration (never on production; local databases reset).
- **Verified:** unit + related integration **501/501**; typecheck and eslint clean; the new migrations applied to the local test and dev databases. **Not verified:** the cover rendered — the dev server was stopped by the system for low memory and was not restarted; the previous push's CI does not cover this change (CI runs on the next push).
- **Next:** push, let CI run, then the live review — the Vercel preview reads the production database, so the new images and statement appear only after the merge applies the migrations.

### 2026-10-20 · Sprint 1 — the review round: composition, structure, honesty, header (D-035, D-036, D-037; local commits, not yet pushed)
- **Owner at the review:** "powerful … good work" on the new look; image and text must breathe; structure the content at the highest, unique level; fix all fixes found; remove the credit line ("who told you to do so"); everything real data; and the best header and nav.
- **Done:** composition rebuilt (overlay shaped to the layout, type in the image's quiet zone, a hero that fits a 900 px screen with its record, technologies only on tall screens); the content is one structure — promise → proof (HOME-HERO-PLAN §16); the credit removed (data, tests and docs); **no wording in code** and a live line that says "Live" only on production; the header's Systems preview + glass pill + all header/menu wording as data (§17); a private review page built from the real encoded images, data and fonts, used to judge the composition by eye (it caught a hero taller than the screen and faint small text).
- **Fixed along the way:** record bar cut off at 900 px; small text over the image too faint; a preview calling itself "Live"; Escape not closing a hover-opened menu; a skip-link label that would have been unseeded; stale component names in the docs; the PR's description (updated at the push).
- **Verified:** unit + integration **987/987** (90 files); typecheck and eslint clean; migrations (through `20261020180000`) applied to the local test and dev databases. **Not verified:** the new header and hero **rendered in the real site** — the dev server cannot run on this machine's free memory and was stopped by the system; the Playwright specs (`home-hero-v2`, `header`) run in CI on the next push.
- **Next:** push, CI, then the live review on the preview/production once the migrations apply on the merge.

### 2026-10-20 · Sprint 1 released — owner approved "master chef" (D-035 to D-037; PR #218 → main)
- **Owner:** "i approve this master chef push it and make sure everything is complete" after seeing the hero and header running locally (`/?hero=v2`).
- **Done:** S1.1–S1.6, S1.8, S1.9 (see the Current sprint table); the CI run on `07b9d26` passes lint, migration-check and test (unit, integration, Playwright). The first Playwright run had four failures that were test-only (the skip-link locator also matched the footer's back-to-top link; the ledger check expected the old figure-first entry) — fixed, product unchanged.
- **Released:** PR #218 squash-merged to main; production applies the additive migrations through `20261020180000` on its build; the flag `home.hero_v2` ships **off**, so visitors see no change until the owner switches it on.
- **Owner to-dos:** switch on `home.hero_v2` in Admin → Flags when he is ready (the admin needs his 2FA; I do not touch production data); tune wording in Admin → Page content → *Home — hero* and *Site header*; feature a third system for the header preview; confirm the colour reading (Ember horizon), the full name and the statement wording.
- **Open (S1.7):** phone LCP ≤ 2.5 s, CLS 0 and first-view weight measured on the runner once the flag is on; then ratchet `perf-budgets.json`. The Figma frames are older than the cover-image design.
- **Next up:** Sprint 2 per WAY-OF-WORKING §10 — WP-102 (the rest, after the LCP measure), then WP-111, then WP-109. **Next up stays WP-102.**

### 2026-10-20 · Sprint 1 — the new hero is the only hero (D-038; follow-up to PR #218)
- **Owner (after the merge):** the new hero could not be seen on his phone because it sat behind the flag — "you must deploy new things … everything old should be replaced per sprint … the new one must work, not the old one."
- **Done:** `HomeContent` always renders the rebuilt hero; removed the flag check, the previous hero (`components/home/HomeHero.tsx`, `HeroGuide.tsx`), the `/?hero=v2` preview switch (`heroV2Active`), the `FLAGS.homeHeroV2` key and the control room's `showFigures` switch (its duplicate tiles and two terminal lines are simply gone; the figures live, with their evidence, in the hero). An additive migration (`20261020190000_home_hero_is_the_hero`) marks the flag row on and *Retired*; the row stays because migrations only add (deleting it would need the migration guard's reviewed `allow` approval, left to the owner). Tests updated: the `heroV2Active` unit tests removed, the integration test asserts the retired flag, the e2e hero spec visits `/`.
- **Verified:** typecheck and eslint clean; unit 486/486 and integration 497/497 locally against the test database with the new migration applied; Playwright runs in CI. The local dev server was stopped (memory).
- **Rule going forward:** a sprint replaces what it rebuilds when it releases; a flag is only for work the owner has not yet approved.
- **Next:** merge, then look at the live site on a phone (no switch to flip); S1.7 — measure phone LCP/CLS and ratchet `perf-budgets.json`. **Next up stays WP-102.**

### 2026-10-20 · Sprint 1 released to production — what the runner measured (follow-up fix)
- **Live:** PR #220 (`7e77962`) is on production — the rebuilt hero is the only hero, no flag; the new header wording and Systems preview are live.
- **Found by the post-deploy budgets job (the job doing its work):** `/` desktop's largest image is 93 KB (the cover image) against a 90 KB budget that predates it. The cover image's own budget is 100 KiB (plan §15, D-034; asserted by `tests/integration/home-hero.test.ts`), so the budget file now says so: `largestImageKb` for `/` is 100, with the reason written in the file. Every other weight on `/` is under its budget (desktop 858.7 KB of 931, 51 requests of 58, images 290 KB of 320; phone 835 KB).
- **Measured on the runner (Lighthouse, 2026-10-20):** `/` desktop LCP 899 ms, CLS 0, performance 99; **phone LCP 4630 ms, CLS 0, performance 81** — over the 2.5 s target, which only warns. Every core page is at 2.9–4.4 s on the phone profile (journey 3.6 s with no hero image), so the phone LCP is the open part of WP-102 (JavaScript and fonts on a slow link), not the cover image alone; `/` is the slowest of them, so the home page's first view is the next thing to trim. S1.7 stays **In progress** until the phone LCP is understood and brought down.
- **Also seen:** the CI `build` job failed on `main` for `7e77962` while downloading Google Fonts in the runner ("Can't resolve @vercel/turbopack-next/internal/font/google/font"); the same build had passed on the PR and Vercel's own build succeeded; the job was re-run.
- **Next up:** stays WP-102 — the phone LCP, starting with the home page's first view.

### 2026-10-20 · Sprint 1 — the hero says only what the data proves (D-039; follow-up PR)
- **Owner, on his phone after the release:** the cover image showed only in the lower part of the hero (it must cover the whole hero and be visible); "2 systems shipped" when three run in production ("it is not getting the real data"); "Building now · Xkimi Xa Mali" for a finished system he has not touched for weeks; the live line should say "as of" with the real date, as before.
- **Causes found in the data:** the shipped figure counted the pipeline status (this platform's own entry reads "On GitHub"); "building now" used GitHub's last-push time (it moves for non-work pushes; the repo README says paused 2026-09-05); the live line template had no date; the phone overlay was heavy over the top half.
- **Done:** the shipped figure = published systems with a live production address (`countSystemsInProduction`); the current-work line = the repo with the latest real commit in 30 days, worded "Latest commit" (`latestCommitRepo`; the Selected work card shares it); the live line "Live, as of {date}" with the date in the site time zone (new setting `site.timeZone`); an even, lighter phone overlay. Migration `20261020200000_home_hero_honest_lines` changes the wording only where the owner has not edited it. Tests: unit (live line, the date in the site zone, the fallback), integration (the figure and the selection match the data, the seeded wording).
- **Seen, not changed:** the Selected work card's heading still reads "Now building" (V1 wording in the component) for the same selection — to move into the content block next; the Systems page and the admin overview keep the status-based "shipped" figure.
- **Next up:** stays WP-102 (the phone LCP).

### 2026-10-20 · Sprint 1b — speed, reliability and honest lines, in the owner's approved order (D-040; PR for #225)
- **Owner:** "I approve all of them, do them in order" (phone speed; the owner-set building line; self-hosted fonts; CI screenshots; one meaning of the words; the tidy-ups), then asked whether the other pages' heroes deserve unique generated images too.
- **Done:** lazy below-the-fold images and a non-preloaded serif; `buildingSlug`/`buildingLabel` (owner names what he is building; the latest real commit is the fallback); fonts self-hosted through `next/font/local`; the hero's first view saved at three widths and uploaded by CI; the Selected work card on the same data; evals trigger narrowed; the retired flag row deleted; README diagram labels fixed. Migrations `20261020210000` (wording field) and `20261020220000` (retire the flag row, with the guard's reviewed approval).
- **Owner to-dos:** name the system you are building in Admin → Page content → Home — hero ("The system you are building now", e.g. `fundslink-academy`); set MALULEKE-KS's status in Admin → Systems if you want it to read Finished/Live (the hero no longer depends on it); confirm the Ember horizon colour.
- **Open:** re-measure phone LCP on the runner after the release; the other pages' hero images (proposed in HOME-HERO-PLAN §20); the Figma frames are older than the cover-image design.
- **Next up:** stays WP-102 (phone LCP) until the runner's numbers are in.

### 2026-10-21 · Sprint 1c — the other pages open on their own images (D-041; PR for the owner's review)
- **Owner (2026-10-20):** Systems, Journey, About and Let's talk deserve hero images like the home page, each unique, generated in his ChatGPT accounts ("if you hit the limit, tell me"); "build smart not hard". He approved the recommendations, including one image per page.
- **Done:** four photo slots (`hero-systems`, `hero-journey`, `hero-about`, `hero-contact`), settings (`site.pageHero.maxEdgePixels` 1280, `.quality` 72, `.scrim` 100), one shared `PageHeroBackdrop` (renders nothing until its slot has an image) wired into the four pages, `build-hero-photos.mjs --slot`; the four images generated (three accounts: the first two hit the free limit after one and three images) and encoded (103, 35, 37 and 22 KiB); migrations `20261021100000` and `20261021110000`; budgets for the four pages raised by their own image with the reason, and named in the ratchet test; integration test (landscape, light, WebP, no metadata, all four seeded); e2e `page-heroes.spec.ts` keeps each page's first view at 390 and 1280 px in the CI artifact `hero-screenshots`. Also: the hero chip no longer breaks its words for a long system name.
- **Owner to-dos:** look at the four pages on a phone after the release; Admin → Photos replaces any image; Settings → `site.pageHero.scrim` lightens or darkens the veil.
- **Next up:** stays WP-102 (the phone LCP) — re-measured on the runner after this release.

### 2026-10-21 · The budgets check measures three times and keeps the lightest (follow-up to Sprint 1b/1c)
- **Found:** the post-deploy budgets job failed on `/` (phone) on three merges in a row, but on *identical code* (6a0d1a5 and 7e77962 differ only in `perf-budgets.json`) the same page read 835 KB, then 952 KB; my own run of the same script against production read 874 KB / 315 KB of images — inside the 931 / 320 budget — while the runner read 990 / 431 on the same day. About 117 KB of the difference is one run catching an extra image. A single reading made the check fail at random.
- **Done:** `scripts/check-budgets.mjs` measures each page and device three times (`--repeats`, each in a fresh browser context) and keeps the lightest run. A real regression is in every run; a one-off extra download is not. Budgets are unchanged.
- **Next up:** stays WP-102 (the phone LCP, still 4.4–4.8 s on the runner).

### 2026-10-21 · About gets its own phone image; Systems gets a new image (D-041, owner's requests)
- **Owner:** the Systems page image "needs to be changed — let's generate another one"; "the About needs a supporting mobile image".
- **Done in code:** the slot `hero-about-mobile` and `PageHeroBackdrop mobilePurpose` (a page can give a portrait image for phones; without one the single image serves both); the integration test treats a page's phone image as portrait. The new Systems image (interlocking graphite modules with orange light seams — a replacement for the circuit board) and About's portrait image are generated in the owner's ChatGPT account and are added by migration once downloaded and checked at phone size.

### 2026-10-21 · Sprint 1d — phone speed, first pass (D-042; WP-102 partial)
- **Owner:** "do 1" — trim the phone's JavaScript first.
- **Read first:** the phone's largest paint is 3.9–4.5 s on every core page on the runner (target 2.5 s). The home page loads 321 KB of JavaScript (framework ≈ 115 KB, `motion` ≈ 80 KB), 159 KB of fonts, a 117 KB cover image; Lighthouse shows main-thread work (script evaluation, hydration) as the wall. Local Lighthouse on this machine swung from 3.6 s to 9.9 s between runs (memory pressure), so the runner's numbers are the evidence, not mine.
- **Done (low-risk):** two fewer font files in the first load; `content-visibility: auto` on each home section below the first view.
- **Not done, deliberately:** replacing `motion` (19 files, part of the design) and lazy-hydrating below-the-fold sections — proposed in HOME-HERO-PLAN §21 with gain and risk; they are what it takes to approach 2.5 s, and need the owner's go.
- **Next up:** stays WP-102 — re-measure on the runner after this release, then the owner chooses from §21.

### 2026-10-21 · Phone speed, first pass — what the runner measured (D-042) and a budget that was really data
- **Measured after release (largest paint on the phone profile, before → after):** home 4.55 → 4.36 s, Systems 4.06 → 3.84 s, About 4.36 → 4.15 s, Journey 3.92 → 3.78 s, Let's talk 4.21 → 2.88 s; every page ≈ 38 KB lighter; CLS 0 (0.003 on two pages). A modest gain, as expected: the target (2.5 s) needs the structural steps in HOME-HERO-PLAN §21.
- **The post-deploy check then failed on the home page's desktop image weight (371 KB against 320):** not the rendering change — the platform's own commits had synced, so MALULEKE-KS became the "Latest commit" system and the "Now building" card shows its own screenshot (81 KB). That is data (it depends on which system is current), bounded by one screenshot, so the budget now says so (+80 KB on `/` image weight, named in the ratchet test) instead of being loosened silently.
- **Next up:** stays WP-102 — the owner chooses from §21 (replace `motion`, lazy hydration, brand marks as images).

### 2026-10-22 · Sprint 2 begins with an audit — the AI guide band rebuilt (D-043; owner's choice A)
- **Owner (switched to Opus):** audit everything we did, then structure fixes and recommendations; start with the AI guide band on the home page ("fading inside content and very poor"), then the heroes, then whole pages.
- **Audit (live captures, phone and desktop, closed and open):** no separation from the hero (same background, glows); a closed accordion with cut-off question pills; three self-introductions and a large illustrated portrait when open; blur-in questions (the fading); dead space and fine print; a duplicated AI label.
- **Done:** the band rebuilt as A — its own graphite band; introduction + three trust points (owner-editable `ai-guide.points`, each one enforced) beside the guide, ready (bust and status, three questions in full, the real composer); asking turns it into the conversation in place (code still loads only then); phone order introduction → guide → points; `GuideStage` (the portrait) removed; the conversation's questions no longer blur in. Migration `20261022100000_ai_guide_section_points` seeds the points and the "Try asking" label and drops the doubled "AI" from the label, only where the owner has not written his own.
- **Bug found and fixed:** the #234 `content-visibility` wrapper trapped the guide's fixed-position UI — on a phone the "full screen" conversation opened inside the band and see-through. The band is no longer wrapped (a comment in `globals.css` forbids wrapping fixed UI), the full-screen conversation is opaque.
- **Verified:** live captures before/after at 390 and 1440 px (closed, asked); e2e `ai-guide-section.spec.ts` passes locally (questions whole, phone order, full-screen conversation); the e2e setup now switches the guide on as production has it, so the phone and accessibility checks cover the band.
- **Next (owner's order):** the heroes (Journey's light rays and About's glow over their photos; Systems' scrolling cards bigger; every hero on a phone), then whole pages (the footer's "V1 · V2 on the way"; phone speed).

### 2026-10-22 · The AI guide band — premium pass (D-044; same PR as D-043)
- **Owner:** "make it more premium than an AI-generated UI/UX … then we close this part and move to other pages"; approved all, "go ahead with the brand mark".
- **Done:** live "what it reads" line and the self-check up in the card; trust points as an editorial list; one card with a hairline question list; the K-S cube mark as the guide's avatar wherever the console shows it; taller composer, "/" shortcut on desktop, one line of small print. New owner-editable fields `ai-guide.knowsLine`, `ai-guide.shortcutLabel` (migration `20261022110000_ai_guide_card_facts`). Unit test `guide-knows` (4); the band's e2e spec now also checks the mark and saves the band's first view and the phone's asked state to the CI artifact `hero-screenshots`.
- **Verified:** typecheck and eslint clean; unit test 4/4; captured on the local dev server at 390 and 1440 px, ready and asked.
- **For the owner:** a two-line introduction is drafted for his approval (his voice; the current one runs five lines) — not shipped until he says so.
- **Carried to the page passes:** the illustrated character still shows in the floating launcher (every other page), the "Ask the guide" buttons, About's invite and Let's talk.

### 2026-10-22 · The guide's character retired everywhere; the two-line introduction (D-045; same PR)
- **Owner:** "use it and switch the character to the mark now".
- **Done:** the mark in the floating launcher (no spinning glow), the "Ask the guide" buttons and About's invitation (hairline questions, no cross-fading poses); `GuideCharacter` deleted; the approved two-line introduction shipped (migration `20261022120000_ai_guide_intro`).
- **Verified:** typecheck and eslint clean; captured the home band and About's invitation at phone and desktop width. The local dev server's photo route went to 500 for every slot mid-run (its worker crashed under memory — the same as 2026-10-20; nothing here touches it), so the launcher is checked from CI's page screenshots instead.
- **For the owner:** About and Let's talk show an illustrated portrait of him because no real About photo is uploaded (Admin → Photos → About) — that portrait is his, not the guide's, so it was left alone.

### 2026-10-22 · The inner heroes in one shape (D-046; branch `sprint-2/heroes`)
- **Owner:** "i approve all of them go ahead" — the hero audit's proposal, including About's long introduction moving below the hero; earlier, "the scrolling system cards … a little bit bigger so it can also be seen". Then: "DONT PUSH ANYTHING TO BE DEPLOYED UNTIL I SEE IT IN LOCAL SERVER AND APPROVE IT" — so this branch waits, unpushed, for his look at the local server.
- **Done:** `HeroLabel` and `HeroFigures` (`components/shared/HeroKit.tsx`) — a plain label and one hairline row of live figures, the home hero's style; `PageHero` uses the label. Systems: figures in the row, the spotlight's front card about three quarters of a phone's width (to 540 px) with neighbours peeking behind and edges fading, a two-line caption, the placeholder computed from the same card size. Journey: light rays and stat cards gone. About: the first sentence of his introduction in the hero, the rest opening the story word for word (`lib/profile/bio.ts`, unit test 4/4), the portrait beside the words from a laptop up (no glow, no shine border) and first in the story on a phone, his titles as a plain line. Let's talk: calm person card, steps as a numbered hairline row. Retired: `StatCards`, `LightRays`, two animations.
- **Measured (local, phone 390 px):** hero heights Journey 824 → 620, About 1756 → ~850 (before the figure row was tightened), Let's talk 676 → 667; Systems 906 → 1049 by design (the bigger ring); desktop About 1079 → 937. 
- **Verified so far:** typecheck clean, eslint clean on the changed files, unit test, captures at 390 and 1440 px; e2e `hero-shape.spec.ts` (new) and `page-heroes.spec.ts` run locally.
- **Next:** the owner's review on the local server; then push, PR, CI, merge (his merge permission applies after his approval). Then the footer's "V2 in progress" and the whole-page pass.

### 2026-10-23 · The home page's premium pass — planned, approved, built locally (D-047; branch `sprint-2/home-premium`)
- **Owner:** page by page, "the best frontend ever", home first, from beginning to end — then "we must plan and design each page first before writing any code so i can approve"; approved the plan in full with its five decisions; "use the components … motion, 21st dev, magic ui, shadcn ui"; "cleanness must be preserved everywhere".
- **Plan:** audited production at 390 and 1440 px (section heights, captures); the plan and mocks were published for him as the artifact "MALULEKE-KS Home Plan" (now/issues → proposed mock/changes per section, page order, page-wide rules, decisions D1–D5, slices).
- **Built (not pushed):** all seven sections per D-047 — section order hero → work → guide → method → map+status → let's talk; shared `SectionHeader`/`SectionLink`; Evidence as a link with a shadcn Hover Card; the hero's live line and four equal figures; work as cases with the Lens and a browser frame, the commit strip, the ruled More work list; the AI band's label and alignment; principles as a ruled, opening list on bone; the map with the merged status line, top technologies, full names; Let's talk on bone; footer rows and "V2 in progress"; screenshots hide floating UI. Two guarded data migrations. `ControlRoom` and `Terminal` removed.
- **Verified so far:** typecheck and eslint clean; migrations applied to the local dev and test databases; migration guard additive. Captures and e2e wait for memory (0.3 GB free when the build finished).
- **Owner's local review (Chrome, 2026-10-23):** "i approve everything but about the hero the hero image must be preserved and work along with the proposed" — the cover image stays behind the whole hero with the new live line, left alignment and four equal figures (checked: the desktop and phone images load and fill the band). Fixed after captures: the phone's live line stacks instead of leaving a stray separator; the map's columns start at the top (centred, they left tall gaps). Phone page measured ≈ 10,170 px (from ≈ 11,900).
- **Next:** push, CI, merge; then the owner presses "Capture now" on MALULEKE-KS's screenshot in Admin (the old capture with the banner is still current); then the Systems page is planned the same way.

### 2026-10-23 · The phone pass, in the same PR (D-048; PR #242)
- **Owner:** "fix everything in phone responsiveness … world class"; approved the audit's eight fixes and asked for them in the open PR (one deploy, the budget); then "check if the desktop also needs some improvements like that … then push so it can deploy, then we move to the next page".
- **Done:** shared `tap-target` and `press` utilities, a 12 px type floor on phones, 16 px inputs, safe areas (viewport-fit=cover) for everything fixed at the bottom and the page frame, scroll padding under the header, the graphite browser bar; home: a tighter phone hero, full-width case action, "+n" with its mark, the footer's status line stacked.
- **Verified:** re-measured at 390 and 430 px on the local server — 0 tap targets under 44 px, 0 labels under 12 px, no sideways scroll; typecheck clean. Then the local database stalled under memory (10 s for `select 1`, every page 500 with P1001) — the server was stopped; the rest is verified on CI and the PR's preview.
- **Next:** the desktop check on the preview (1024–1920 px), fixes if any, CI green, merge, deploy; then the Systems page is planned the same way.


### 2026-10-23 · The Systems page's premium pass — planned, approved, built locally (D-049; branch `sprint-2/systems-premium`)
- **Owner:** "after it deploys lets move to other pages and do step by step exactly how we did it for the homepage"; approved the Systems plan in full ("cook it at the highest level").
- **Built (not pushed):** the card's one anatomy with real screenshots, the home groups (wide card for one, halves for two, "On GitHub ↗"), the sticky toolbar with chips, the phone's filter sheet, the empty state, the skeleton; e2e `systems-catalog.spec.ts` (rows end together, one capsule, the in-site arrow, the toolbar stays in reach, the sheet's 44 px options, the empty state).
- **Kept from WP-108:** a quiet card says nothing about its quiet (the plan's mock had "No commits in 26 weeks").
- **Next:** typecheck/lint clean; the owner's local review (memory permitting), then push, CI, merge; then Journey, planned the same way.

### 2026-10-23 · Systems shipped (PR #244, live cf4ebf3); the Journey pass (D-050; branch `sprint-2/journey-premium`)
- **Systems:** merged after CI (one real failure caught by the new e2e — Magic Card's content didn't fill the card, so footers in a row didn't line up; fixed for every Magic Card); production verified.
- **Owner (away):** pre-approved the remaining passes — plan, build, polish, push, merge, deploy, next — with every PR merged before the next phase; "premium styling preserved … and improved".
- **Journey:** plan published ("MALULEKE-KS Journey Plan"); built per D-050 with a polish pass (numerals that fill, the Now wash, row hover); e2e `journey.spec.ts`; phone 5,923 → 4,660 px, 0 small taps, 0 tiny text.
- **Next:** PR, CI, merge, verify; then About.

### 2026-10-23 · Journey shipped (PR #246, live ad3c2bb); the About pass (D-051; branch `sprint-2/about-premium`)
- **Journey:** merged after CI; production verified.
- **About:** plan published ("MALULEKE-KS About Plan"); built per D-051, polish pass (masonry skills); e2e `about.spec.ts`; locally 0 small taps, 0 text under 12 px, no sideways scroll at 360/390/430; phone ≈ 9,000 px (the proof rows are taller than the chips they replace; the weaker categories fold).
- **Next:** PR, CI, merge, verify; then Let's talk.

### 2026-10-23 · About shipped (PR #248, live f058ae7); the Let's talk pass (D-052; branch `sprint-2/contact-premium`)
- **About:** merged after CI; production verified.
- **Let's talk:** plan published ("MALULEKE-KS Let's Talk Plan"); built per D-052; e2e `contact-frame.spec.ts`; locally 0 small taps, 0 text under 12 px.
- **Next:** PR, CI, merge, verify; then the case studies.

### 2026-10-23 · Let's talk shipped (PR #250, live 153e9c9); the case study template (D-053; branch `sprint-2/casestudy-premium`) — the last page of the premium pass
- **Let's talk:** merged after CI; production verified.
- **Case studies:** plan published ("MALULEKE-KS Case Study Plan"); built per D-053; e2e `case-study.spec.ts`. The local dev server was stopped by the machine's memory guard mid-session, so this one is verified on CI (its e2e, mobile and accessibility runs and screenshots).
- **Next:** PR, CI, merge, verify — then the premium pass is complete across every public page (home, Systems, Journey, About, Let's talk, case studies).

### 2026-10-23 · Integration sweep (D-054, D-055, D-056; branch `sprint-2/integration`)
- **Done (committed locally):** U13 — image versions replaced, never deleted unless the owner asks (migration `20261023120000_version_delete_on_request`, BR-1.17/1.18 amended, DELETE routes with `{ confirm: true }`, screenshot history + restore + delete in Admin, `ConfirmDelete`, `tests/integration/image-history.test.ts` 4/4), each case study's hero is its screenshot; U1–U9, U11 (shared buttons, `AiBadge`, `type-micro`, two radii, two spacing rhythms, → / ↗, Reveal visible at rest, one focus ring, 404/error on the hero shape, the guide's question rows and one line of fine print); U10 page cross-fade (React ViewTransition, header held still).
- **U12 (D-056, owner approved D2-A):** the phone's bottom dock (`BottomDock`: Systems · Journey · the guide · About · Menu), the menu sheet opened from its last cell, the guide's corner launcher desktop-only, `.above-dock` for what floats at the foot; labels in the "site-header" block (migration `20261023130000_header_dock_labels`).
- **Then:** D-054/D-055/D-056 logged; verify (typecheck, lint, unit locally; integration and e2e on CI), push, PR, merge, verify production; then the Admin audit and plan (owner, 2026-10-23: "proceed to the admin pages without stopping … make the admin so powerful and easy for me to understand").

### 2026-10-23 · Integration sweep shipped; the admin pass (D-057; branch `sprint-2/admin`)
- **Shipped:** PR #254 (D-054–D-056) merged as `23897d1` after CI (two follow-ups found by CI now that nothing hides at rest: the status badge's label contrast on its own wash, the showcase meta line; the a11y checks set the phone dock aside while checking the page and check the dock on its own — `tests/e2e/axe.ts`); production verified (the dock and its migrated label on the live HTML, build `23897d1`).
- **Admin plan:** published ("MALULEKE-KS Admin Plan", A1–A10), owner pre-approved.
- **Built:** A1 shell + counts + page bar + ⌘K search, A2 phone dock, A3 Today overview, A4 Systems (search, screenshots, phone cards, Looks right), A5 editor index + leave guard, A6 Page content by place (+ the missing section-copy editor) and the Settings filter, A7 activity in sentences, A8 rule chips on the four headers that had rule numbers inline, A10 `tests/e2e/admin.spec.ts`.
- **Next:** PR, CI (admin screenshots), merge, verify; then A8/A9 across the remaining pages (Inquiries, Journey, CV, Profile, Numbers, Freshness, Jobs, Guide health, Account) against the CI screenshots.
- **Owner to-dos:** press **Capture now** on MALULEKE-KS's screenshot (Admin → Systems); 9 published systems still carry "needs curation" — **Looks right** on each clears it in one tap.

### 2026-10-24 · Admin pass shipped; the header; case study hero images off (D-058, D-059; branch `sprint-2/header`)
- **Shipped:** PR #256 (D-057) merged as `7c75f62` after CI; production verified (build `7c75f62` on the live HTML, admin sign-in up). What CI found on the way, all fixed: the shared `ConfirmDelete` had been rewritten in D-054 (each list entry's name in its button — Profile 603 px wide on a phone), text on ember/finished washes under AA (new `accent-strong`, `signal-finished-strong`), opacity dimming, an unlabelled file input, scrolling tables without keyboard access, sub-24 px links, grids without a shrinkable base column; the accessibility checks now set the site's chrome aside, settle every section and make scrolling instant while axe measures (smooth scrolling had it sampling the band passing under the text).
- **Header (D-058):** plan "MALULEKE-KS Header Plan"; the live chip with the platform's vital signs, search as a field, CV out of the scrolled capsule; labels in "site-header" (migration `20261024090000_header_live_chip`).
- **D-059:** case study hero images behind `systems.hero_image`, off.
- **Also:** `github-knowledge.test.ts`'s corpus check no longer races other test files adding systems.
- **Next:** PR, CI, merge, verify; then A8/A9 across the remaining admin pages from the CI screenshots.

### 2026-10-24 · Header and orb shipped; the admin pass, last slice (D-057; branch `sprint-2/admin-rest`)
- **Shipped:** #258 (header live chip D-058, case study hero images off D-059) as `89789bb`; #260 (the guide's own face, the orb, D-060) as `77c48d4`; production verified both (the chip's markup, the hero without a backdrop, `svg.guide-bot` on the live pages).
- **This slice (from the CI screenshots):** Jobs — the schedule in words, the last failure's reason on its card, Run now on one line; Numbers — proposals waiting first; Today — healthy jobs as one count, only the ones needing a look by name. Inquiries, Journey, CV, Profile, Freshness, Guide health and Account read well (the delete-button regression was already fixed in #256).
- **Open:** PR #6 (Docker, 2026-09-17) conflicts and predates the local Postgres setup — the owner decides whether to close it.

### 2026-10-24 · Sprint 3 starts: credibility, then performance (D-061; branch `sprint-3/credibility`)
- **Plan (owner's paste):** Phase 1 credibility → Phase 2 homepage positioning → Phase 3 performance (mobile LCP < 2.5 s, Lighthouse 85+) → Phase 4 accessibility (100 on every page) → Phase 5 Lighthouse CI and budgets failing the build. No new features, no rebuild.
- **This slice:** the status vocabulary, three flagships, three groups on /systems, Software Engineer, Governova's domain, About's figure label, commit lines without codes.
- **Owner to do:** write the three flagship case studies (Xkimi Xa Mali, Sunduza, MALULEKE-KS) in his own words — problem, my role, two or three decisions and their cost, one thing that broke and the fix, where it stands with evidence, what I'd do differently; review the other eight summaries.
- **Next:** performance — the owner, 2026-10-24: "the site is slow to load more especially in mobile … even desktop performance its the same thing". Measure first (Lighthouse on CI for every public page), then fix in order of what the measurements say.

### 2026-10-24 · Sprint 3 so far: credibility, speed, accessibility (D-061–D-063) — handoff
- **Shipped and verified on production:** #262 credibility (`f651cfb`: one status vocabulary, three flagships, three groups on /systems, Software Engineer, commit lines without codes); #263 performance reports (Lighthouse report + diagnosis kept per post-deploy run, `workflow_dispatch` to measure on demand); #264 the public site from the CDN's cache (`ced5013`: ISR, refresh on every admin write and job, CI build with its own database, the consent banner in the first HTML, the hero statement without an entrance, screenshots at their drawn size, search dialog and guide console on first open); #265 /systems from the cache with its filters in the browser (`lib/catalog/apply.ts`), links prefetch on intent (`IntentLink`), the dock's lift keyed on the dock (no CLS), accessibility fixes (`de7a7b3`).
- **Measured:** time to first byte from South Africa 0.6–1.5 s → ~0.15–0.5 s on every page (`X-Vercel-Cache: HIT`, /systems included). Phone LCP (lab, before #265): /systems 5.1 → 3.9 s, the case study 4.2 → 3.5, About 4.3 → 3.8; desktop 100 everywhere.
- **Next (in order):** read the post-deploy report for `de7a7b3` (`lighthouse-reports` artifact; the diagnosis now names each page's LCP element and its parts) and take phone LCP under 2.5 s — likely the JavaScript (`motion` ~80 KB gz on every page through the shell: NavLinks, BottomDock, MobileMenu) and the hero image's discovery; then set the weight budgets in `perf-budgets.json` to the new measurements (they broke on #264's prefetching, fixed in #265) and make Lighthouse fail the build (Phase 5); home phone contrast flag is the consent card over the contact band during the check (not a colour fault).
- **Owner to do:** write the three flagship case studies (Xkimi Xa Mali, Sunduza, MALULEKE-KS) in his own words — problem, my role, two or three decisions and their cost, one thing that broke and the fix, where it stands with evidence, what I'd do differently; review the other eight AI summaries. Press "Capture now" on MALULEKE-KS's screenshot.
- **Note:** the machine's memory guard stops long background watchers; CI is the source of truth for builds and tests.

### 2026-10-24 · Admin check fixed (#272, D-066); the receipt and the X-ray (D-067; branch `sprint-3/xray`)
- **Shipped:** #272 — every admin date in the site's zone on the server and in the browser (React #418 gone from the editors; server times no longer two hours behind).
- **Built (owner: "go on and build it and push it"):** at the foot of the home hero, the page's receipt and the "See how this page works" X-ray (D-067). Facts from `lib/xray/home.generated.json` (`npm run docs:capabilities`), words from block "page-xray" (migration `20261024200000_page_xray`). Capability map's home entries corrected and tagged with `xray`; LT-13 added to the register (🟡).
- **Next:** verify the receipt and the X-ray on production (phone and desktop: the edge name, the labels, the panel, Escape, the dock); then the X-ray on the other public pages, one slice each (add the page to `lib/xray/sections.ts`, tag its map entries, mark its sections); a test for LT-13. Then the final end-to-end sweep (admin → site, site → admin).

### 2026-10-24 · Commit counts fixed (#274, D-068); the home hero's Orbit (D-069; branch `sprint-3/orbit`)
- **Shipped:** #274 — the GitHub sync asks again while GitHub is still counting, so a busy repo's weekly commits are saved, not frozen (MALULEKE-KS showed none for three weeks). The next nightly sync (or Admin → Jobs → GitHub sync → Run now) corrects the weeks.
- **Built (owner: "i approve all"):** the Orbit over the hero's photo (a little dimmer), the hero's words kept and wired to it; the receipt off the hero, the X-ray switch in How it all connects. Engine `components/home/orbit/engine.ts` (WebGL2, GPU-side), stage `OrbitStage.tsx`, still `OrbitPoster.tsx`, data `lib/queries/orbit.ts`, words block "home-orbit", setting `home.orbit.weekMs`, flag `home.orbit` (migration `20261024220000_home_orbit`). Tests: `tests/e2e/home-orbit.spec.ts` (phone and desktop: open, step, close, shared link, no overlap with the words, no sideways scroll), the hero spec updated.
- **Next:** look at CI's `hero-screenshots` (orbit-*.png) and production on a phone and a desktop; then the X-ray on the other public pages; the final end-to-end sweep.
- **Second pass (D-070, branch `sprint-3/orbit-2`):** the owner's review of the live Orbit — bigger, cleaner, small names, a small facts panel with the orbit in view, a working close button, luminous linking arcs, a field of its own over the photo, the desktop hero fitting one screen; Let's talk's card lower on a phone.
