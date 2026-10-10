# V2 Tracker — where the relay stands

The live status of every work package in `docs/V2-IMPROVEMENT-SPEC.md`. **Every Claude Code session reads this before any code and updates it before it stops** (spec Section 0.1). `tests/unit/v2-tracker.test.ts` fails if a WP from the spec is missing here, listed twice, has an unknown status, or if **Next up** names a WP that doesn't exist.

## Next up

**Next up: WP-102**

> WP-001 is done (baseline `docs/improvements/baseline-2026-10-10.json` / `.md`, build 17df587). WP-102 is what remains of image performance: Lighthouse CI budgets against that baseline (phone LCP 3.0–6.2 s on five of six routes, `guide-master.webp` 116 KB on five of six, home desktop CLS 0.319). Then WP-111 (guide capacity — the guide health page and telemetry already count busy and resting refusals; check what is left), then WP-103/104/109 remainders.

## Status values

`Not started` · `In progress` · `Partial` (some of it already exists — see the spec's Section 1.2.1) · `Blocked — owner` (waiting on the owner input register, spec Section 9) · `Done` · `Superseded`

## Work packages

| WP | Title | Phase | Status | Branch / PR | Updated | Note |
|---|---|---|---|---|---|---|
| WP-001 | Baseline measurement | 0 | Done | PR #202 | 2026-10-10 | Include the guide eval baseline (39/39) and the measured image weights (spec 1.2.2) |
| WP-002 | Tracker and decision log | 0 | Done | V2 spec lock PR | 2026-10-02 | This file and `DECISIONS.md` |
| WP-101 | Homepage metadata and link previews | 1 | Done | V1 finalization (release/v1-final) | 2026-10-03 | One metadata helper for every page (`lib/seo/metadata.ts`): share image 1200×630, `summary_large_image`, site name, `en_ZA`; descriptions clipped at a sentence (`lib/seo/clip.ts`); per-system share-image alt via `generateImageMetadata`. Re-check with a link-preview debugger after deploy |
| WP-102 | Image performance and CI budgets | 1 | Partial | V1 finalization (release/v1-final) | 2026-10-03 | Character weight fixed: the rig's texture is the `<img>`'s own `currentSrc` (no raw 116 KB master), poses mount on first use or after 6 s. Lighthouse CI budgets remain |
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
