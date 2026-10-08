# V2 Tracker — where the relay stands

The live status of every work package in `docs/V2-IMPROVEMENT-SPEC.md`. **Every Claude Code session reads this before any code and updates it before it stops** (spec Section 0.1). `tests/unit/v2-tracker.test.ts` fails if a WP from the spec is missing here, listed twice, has an unknown status, or if **Next up** names a WP that doesn't exist.

## Next up

**Next up: WP-001**

> V1 is closed and released (2026-10-03, build c0eb952 — see the last handoff entry). V2 starts here: WP-001 against that build, then the WP-110 investigation (step 1 only, no code), then WP-101 — but only after the owner approves the WP-001 baseline (spec Appendix A).

## Status values

`Not started` · `In progress` · `Partial` (some of it already exists — see the spec's Section 1.2.1) · `Blocked — owner` (waiting on the owner input register, spec Section 9) · `Done` · `Superseded`

## Work packages

| WP | Title | Phase | Status | Branch / PR | Updated | Note |
|---|---|---|---|---|---|---|
| WP-001 | Baseline measurement | 0 | Not started | — | 2026-10-02 | Include the guide eval baseline (39/39) and the measured image weights (spec 1.2.2) |
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
