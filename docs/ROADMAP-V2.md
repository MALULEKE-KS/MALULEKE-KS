# MALULEKE-KS — ROADMAP V2 AND UPDATE LOG

**Purpose:** (1) every feature agreed for *later* — V2 — with why it waits and what triggers it, so nothing decided is lost; (2) a running log of every update to the platform, newest first. Maintained in the same PR as the change it records (owner, 2026-09-30: "document all v2 features and updates").
**Relationship to the other docs:** PLATFORM-CONSTITUTION-v1 defines V1 (live) and V1.1 (now being built — the concierge, public site redesign); PUBLIC-REDESIGN-PLAN governs the current redesign; this file holds what comes after, and the history.

---

## Part 1 — V2 features (agreed, deferred)

| # | Feature | What it is | Why it waits | Trigger to start |
|---|---|---|---|---|
| 1 | **A body that truly turns — 3D model (preferred) or Live2D** | The owner wants the head to turn for real in every direction; a flat drawing can only hint (2026-09-30: a larger warp read as squeezing). **Preferred: a 3D VRM model** of the owner made in VRoid Studio (free) from the approved likeness — hair, glasses, skin tone, grey T-shirt, watch — exported as VRM 1.0 (polygon reduction on, 1024–2048 textures, under ~10 MB) to `design/character/guide.vrm`, rendered with three.js + `@pixiv/three-vrm`: eyes aim at the cursor (VRM look-at), neck and head turn after them on springs (~40° sideways, ~25° up/down), chest follows; breathing, blinks, lip sync from the streamed answer (aa/ih/ou/ee/oh expressions); wave / point / thinking as blended bone poses over a relaxed rest pose; the drawing stays as the instant poster and the reduced-motion / no-WebGL fallback; lazy-loaded only when on screen. It implements the existing `Rig` interface (plus `setPose`), so the chat and pages don't change. A first implementation was written and set aside on 2026-09-30 at the owner's call (V2/V3). **Alternative: Live2D** — the drawing layered and rigged by a Live2D artist (~±30° turns, hair physics). | Needs the model made (VRoid: the owner, a few hours; or commissioned) or a Live2D rigger. The drawing's rig, tuned to its best, ships first. | Owner decides V2/V3 and supplies `guide.vrm` (or commissions a Live2D `.moc3`). |
| 2 | **Spoken voice** | Opt-in voice toggle: the guide's answers spoken, with lip sync from the audio (visemes); optionally speech input. | Running cost per answer; browsers block autoplaying sound; text must be solid first. | Guide live and used; owner chooses a voice. Limits (daily seconds, cost cap) as settings. |
| 3 | **Retrieval at scale** | Grounding switches from "read the whole public corpus" to retrieval over `ContentChunk` (pgvector) — chunked, embedded, re-indexed when content changes. | The corpus is small today; reading all of it is more accurate and cheap with prompt caching. | Corpus exceeds `concierge.contextBudgetTokens`. |
| 4 | **Availability tool** | `check_availability()` for the guide — real free slots from a connected calendar (Constitution §6). | Needs a calendar integration and the owner's consent to expose free/busy. | Owner connects a calendar. |
| 5 | **Returning-visitor memory** | The guide remembers a returning visitor's lens and last topic in their own browser (no account, no server profile) — Constitution §4 "returning visitor". | Privacy design first; consent-gated like analytics. | After the guide's learning loop proves useful. |
| 6 | **Admin copilot** | ~~Drafts case studies from README and commit history~~ (✅ delivered 2026-10-01 as generated write-ups, BR-4.5), flags skills with no evidence, drafts inquiry replies — never publishes (BR-4.5). | The visitor-facing guide comes first. | Guide stable. |
| 7 | **Testimonials** | Client quotes, shown only with permission (BR-6.x); table exists. | Needs real, permitted testimonials. | Owner has the first permitted quote. |
| 8 | **Full analytics dashboard** | Traffic sources, per-system views, view → guide → inquiry funnel, guide question trends (Constitution §9). | Consent-gated collection must run for a while first. | A month of consented analytics. |
| 9 | **Public API beyond `/systems`** | Documented read API for third parties. | No consumer yet. | A real consumer asks. |
| 10 | ~~**Automated system screenshots**~~ | ✅ **Delivered 2026-10-01** (BR-1.18): the daily `systems.screenshots` job captures each live site; the admin can upload, capture now or go back to automatic. | — | — |
| 11 | **Self-serve data deletion** | A visitor removes their own inquiry data (BR-5.5); today honoured by email. | Low volume. | Volume warrants it. |
| 12 | **Internationalisation** | Other languages (structure left open by the Constitution). | English first. | Audience demands it. |
| 13 | **Map repos from outside accounts** | Repos the owner collaborates on in other people's accounts (e.g. `miltonthefirst`, `smangelemapss`, seen by the sync) filed under an organisation. | Needs the owner's say on which belong on the site. | Owner asks. |
| 14 | **Claude for the AI guide and write-ups** | Switch `concierge.model` and `writeups.model` from the free gateway model (`inclusionai/ling-3.1-flash-free`) to Claude (Haiku 4.5, ≈ $0.0135 a question; about half with prompt caching, to build then), on prepaid AI Gateway credit with auto top-up off and the daily caps kept. | Cost — the owner's call (2026-10-01: "Claude will be integrated in V2 due to cost; one step at a time"). Vercel's free credit serves only `free`-tagged models. | The owner buys AI Gateway credit for it. |
| 15 | **Let's Talk — accountless tracking** | An applicant follows their inquiry through a private link: a separate 256-bit token (stored hashed, expires, revocable, replaceable), showing only applicant-facing status, messages, requests and meetings — never internal notes (LETS-TALK-SPEC §7, LT-7). | V1 intake and admin workflow come first; the data split (LT-7) already makes leakage structurally impossible. | Let's Talk V1 live and used. |
| 16 | **Unanswered-question loop** | The guide records questions it couldn't answer from the site's data (no PII), and the admin sees the most frequent — what to write next (Constitution §1, Controlled Imperfection). | Claimed in the Constitution but never built (EVIDENCE-SPEC §7). | Guide traffic worth learning from. |

---

## Part 2 — Update log (newest first)

### F5c — /journey: one rail through time (2026-10-02, local)
- The journey was empty in production (no timeline entries yet). It now reads every public, dated fact the site already holds — milestones, roles, study (expected graduation drawn dashed, ahead), achievements, systems started and shipped — on one rail with a year scrubber and a live *Today* node. Nothing invented; filters only for what's present.

### F5c — Let's Talk V1 (2026-10-02, local)
- **"What brings you here?"** — /contact is Let's Talk: five categories as tiles (hiring, a software project, collaboration, marketing or growth, something else), each with its kinds and an "Other" escape, then a form that asks only what that category needs; a reference (`KS-26-7QM4-K2`) at the end. The home band's categories open the form already on that category.
- **Strengthened on the way** (the owner's spec, LETS-TALK-SPEC): compensation is a choice (range, prefer to discuss, unpaid) checked by the database; interviews keep their own time zone; PDFs only, checked by their bytes; the idempotency key is bound to its message; a per-address limit; a signed form token (fill-time check); duplicates flagged, never removed.
- **The admin**: a searchable inbox and a workbench per inquiry — the nine-state workflow (database-enforced, history written by the database, stale screens refused), private reason vs what the applicant is told, information requests, meetings, documents, notes, and the email outbox with retry.
- **Found and fixed**: the audit log would have stored applicants' new personal fields in clear (now redacted); retention didn't clear them or the documents (now does); the visitor's "website" field shared its name with the honeypot (renamed — a visitor with a site would have been silently dropped); the reference backfill would have failed on any anonymised inquiry (now safe); the public role couldn't read the new kinds.
- **Email**: Resend over HTTP via an outbox. Owner alerts work once the Resend integration is installed; applicant confirmations stay off (flag) until a sending domain is verified — the site has no custom domain yet.

### F5c — Owner adjustments locked (2026-10-02, local)
- **Principle 01, Make It Exist First** (owner: *"make it exist first … then you will make it beautiful later"*): leads the five principles (content migration, Constitution §1), with its guardrail — unfinished, never unsafe.
- **Two specs, audited against the code and tightened:** `docs/EVIDENCE-SPEC.md` (every claim leads to inspectable evidence, links pinned to the running commit and checked in CI, status capped by review date; a content block, no new table) and `docs/LETS-TALK-SPEC.md` (opportunity intake on `Inquiry`: categories + subtypes, server-validated per-category fields, explicit compensation, meetings as events, PDF-only documents, reference ≠ credential, email outbox via Resend; four loopholes in today's intake fixed; noise cut). Owner decisions recorded in each.
- **The home AI guide closes by default:** an inviting bar (portrait, status, three questions that ask straight away); it opens the full guide beneath, whose code loads on first open.
- **Playbook rules added:** make it exist first; claims carry evidence; one family, each page unique.

### F5c — Phones, for real; featured work chosen by the owner (2026-10-01)
- **Case studies overflowed on phones** (604–834 px on a 360 px screen) once a system had commits: the activity grid's columns grew to the longest commit message. The phone tests missed it — the test databases had no commits. Fixed for good: every grid item may shrink and any text wraps rather than overflow (two global rules in `globals.css`); the weekly chart scrolls inside its own box. The e2e suite now seeds a hostile "stress" system before it runs (long commits and words, a year of activity, a wide table and code, on the CV too) — it immediately found the same overflow on `/cv` — and can run against production after a release (`PLAYWRIGHT_BASE_URL`).
- **Featured systems are the owner's choice:** every system switched on as "Featured on home" leads Selected work — two or more side by side, with Now building as a strip beneath; one keeps the old layout. Xkimi Xa Mali and Sunduza Architectural are featured.

### F5c — The AI guide is live on a free model (2026-10-01)
- `concierge.model` → `inclusionai/ling-3.1-flash-free` (Vercel AI Gateway, free tier; the only free general model with reasoning and tool use); `concierge.enabled` on. Tested live: refuses to reveal its instructions, refuses private details, answers grounded with links, third person; the per-visitor cap (6 a day) held. Claude is V2 #14.
- **Fix:** a reasoning model streams its reasoning and the chat sends it back with the history; the request whitelist refused that, so every follow-up question failed. Reasoning is now accepted and dropped before the model sees anything (`lib/guide/request.ts`) — the model never reads reasoning a browser could have rewritten.

### F5c — Systems pages finished: screenshots, phone-safe by design (2026-10-01, local)
- **Screenshots (BR-1.18):** each live system's site is captured automatically by the daily `systems.screenshots` job (a screenshot service renders it — Vercel functions have no browser), stored in the database as WebP, and shown on the case study and the home page. In the admin, every system has a Screenshot panel: **Upload** your own (it always wins), **Capture now**, **Back to automatic**. Settings `screenshots.*`. Tests never call the real service (`SCREENSHOT_SERVICE_URL=off`).
- **Repos removed from GitHub leave the site:** the sync hides a live system whose public repo is gone and flags it — never deleted. The owner deleted the old Angular and Next.js portfolio repos; their systems are hidden (and the Next.js one's dead live link cleared — its address had been taken by someone else's site).
- **Phone-safe by design:** the case-study renderer keeps any content inside the screen (code and tables scroll in their box, long links and inline code wrap, images fit); `tests/e2e/mobile.spec.ts` now checks **every published system page**, read from the site's own list each run — a new case study is tested the day it appears.

### F5c — The K-S Cube logo, locked; the home ledger restyled (2026-10-01)
- **The logo is the K-S Cube** (owner: "make it realistic and 3D realistic and that floating liquid realistic"; approved and locked): the solid K-S floating in a rounded glass tile 70% full of a light liquid gel. It rests facing you and turns once every 10 s through the gel, which tilts and ripples as it settles; hover or tap and it turns to greet you. **Shown alone** — the owner removed "MALULEKE-KS" beside it on desktop ("leave the logo alone as in mobile"). CSS 3D, any size; still under reduced motion. Rules in DESIGN-SYSTEM §6c.
- **Icons and renders:** the browser tab gets a version drawn for 16–32 px; the home-screen icon, the share image and the 404 page use the 3D cube rendered from the interactive file (`design/brand/`). The orange gel of the earlier cube drafts is gone — the only orange is the block.
- **Home ledger** (owner: "the best styling component ever"): each live count is its own card — an icon, the number counting up, the border lit in ember under the pointer (MagicCard), a live pulse on "in progress" — in a glass panel with a slow light running its edge (BorderBeam).

### F5c — The K-S mark (2026-10-01, local)
- **New brand mark, owner-approved:** "Stencil" in the Graphite finish, chosen from five first-round directions; a 3D version designed with it. Flat mark in the header (assembles once), phone menu, footer, admin and sign-in; the wordmark's hyphen in ember; new browser-tab and home-screen icons; the 3D piece on every share image and on the 404 page. Source, renders and the interactive 3D file in `design/brand/`; rules in DESIGN-SYSTEM §6c.
- **Hydration fixes:** `TypingAnimation` and `BlurFade` decided reduced motion during their first render, which the server can't know — React then rebuilt part of the page in the browser (and warned about the structured-data script). Both now render like the server first.
- **AI guide spend limits** (owner: "there gotta be limited things per day"): 15 questions a day site-wide, 6 per visitor, 6 per conversation, 500-token answers; write-ups at most 2 a day and every 30 days. The guide stays off: Vercel's free AI credit serves only "free" models, and Claude needs paid credit — the owner's call.

### F5c — Mobile by default (2026-10-01, local)
- **The live home page was 811 px wide on a 390 px phone:** the Selected work grid's items had no `min-w-0`, so a long line stretched them, and the fixed header then centred on the wider page. Fixed (`grid-cols-1` + `min-w-0`), the contact glow clipped, the footer wordmark sized to fit, the map's "hover" copy removed, long descriptions clamped on phones, the contact card's social icons dropped (the footer shows them one screen below).
- **Phone menu rebuilt** (`MobileMenu`): a full-screen sheet — the mark and close, every page as a large numbered line with what it holds and the current one marked, then Let's talk, the review promise and the owner's links; page frozen behind, focus held inside, Escape/close/any link closes it; the Menu button moved to the right edge.
- **Case study on phones:** the "On this page" index sits above the article (it was in the side panel, which a phone shows after it); the AI label wraps cleanly.
- **Enforced:** `tests/e2e/mobile.spec.ts` — every public page at 360 and 390 px must fit the screen, and the phone menu must open, hold focus and close — the first end-to-end test, run in CI. "Mobile by default" added to CLAUDE.md and the playbook (§1 rule, Stage 2 phone-first sketch, Stage 6 phone check, §7 checklist, §8 pitfall).

### F5c — Systems pages, generated write-ups (2026-10-01, local)
- **Catalog** (`/systems`): grouped by GitHub home with the owner's role; zero counts no longer shown; a description that only repeats the repo name gives way to the README's opening or nothing; a live marker on systems that moved this month.
- **Case study** (`/systems/[slug]`) rebuilt as an engineering dossier: proof strip (started, shipped, last push, commits this year), the write-up with an "On this page" index, at-a-glance panel with a language bar and topics, 26 weeks of activity and the latest commits, skills it proves, related work by domain, home and shared stack, "Ask the AI guide about it".
- **Generated write-ups — BR-4.5 replaced** (owner: "every system description and case study should be generated automatically … using their repo"): the daily `systems.writeups` job writes each live public system's description, case study and stack from its repository; labelled as AI on the page and in the API; the owner's own words are never replaced (database trigger); "Regenerate from repo" in Admin → Systems; off until `writeups.enabled`. Settings `writeups.model`, `writeups.maxPerRun`, `writeups.refreshDays`. The first eleven write-ups were written the same way, from each repo, and marked generated.
- **GitHub sync:** one account refusing the token no longer fails the run (`accountErrors`, with GitHub's own reason); a repo homepage pointing back at GitHub is no longer taken for a live site.
- **AI guide:** counts a Vercel deployment as connected (its OIDC token arrives per request); the hero character uses its poses on its own, each held 5 s unless the visitor clicks or types.

### Page Build Playbook (2026-10-01)
- `docs/PAGE-BUILD-PLAYBOOK.md`: the home page walkthrough turned into the reusable process for every page — the owner's rules, nine stages from brief to review, the toolkit it produced, the motion budget, the audit checklist, the pitfalls already paid for, and a sheet of unique resources per page. Added to CLAUDE.md's governing documents.

### F5c — home page audit (2026-10-01, local)
- **Duplicates removed:** the map's title no longer repeats the footer's "Where the code lives" (now "How it all connects."); the mission no longer repeats in the footer under the method band.
- **Semantics:** the method band is a titled section ("How I build.") with the mission as a blockquote, not a quote as the heading; the "AI" badges are decorative, so headings read "Kurhula's AI guide".
- **One editorial rhythm:** every section title carries one accent phrase in Plex Serif italic.
- **Lighter motion:** the hero's flickering grid draws at ~20 fps, the map's beams pause off screen, the character renders at 1.5x density, and "Now building" keeps its live feed without a second border light. 26 animations and 11 glass layers were running at once.
- **Mobile:** smaller character on phones (hero 1,521 → 1,451 px); no horizontal overflow at 390 px.
- **SEO:** the home description and link previews use the owner's own introduction (≤160 characters).

### F5c — system map, control room: the home page complete (2026-10-01, local)
- **System map** (SystemMap): the three GitHub homes → published systems and public repos not yet written up → the technologies they use (curated stack and skills plus GitHub languages), joined by beams drawn in one SVG (Magic UI Animated Beam, adapted); hover traces a chain. New view `PublicSystemHome`; `/homes` lists each home's systems.
- **Control room** (ControlRoom) replaces the numbers strip: a terminal (Magic UI Terminal, adapted: full text always in the page) playing live checks from `PublicPlatformPulse` — rules the database enforces, changes audited, the public read-only role, last GitHub sync and job, the running build — plus tiles and the owner's approved figures; "Ask the AI guide how". No separate Now band (Now building lives in Selected work; `/now` becomes a page).
- Home order: hero → AI guide → selected work → system map → control room → method → let's talk.

### F5c — header, AI console, selected work (2026-09-30, local)
- **Header rebuilt:** full-width bar at the top → one glass capsule on scroll (reading progress), hides on scroll down / returns on scroll up; gliding nav highlight and active underline. Page heroes gained top room.
- **Hero:** second button is "Get my CV" (falls back to "How I build"); Let's talk lives in the header only.
- **AI console and chat panel** rebuilt with Magic UI (Magic Card, Border Beam, Typing Animation, Shiny Text, Blur Fade); "Guard-railed" tile replaced by "Knows his GitHub" (shown only when GitHub data exists); the model id is never shown publicly.
- **Selected work rebuilt** (WorkShowcase): featured system with Lens preview, impacts, brand-marked stack, 26-week sparkline and links; "Now building" live commit feed; compact picks on Magic Cards. New view `PublicSystemActivity` + `GET /activity` (counts only, published systems). Removed the unused WorkBento, SystemsBlueprint, LedgerHero and its hook.
- **The drawing's rig** tuned to its best: eyes as approved; the head moves as one rigid piece a little (no warp, long neck blend). A truly turning head (3D VRM) is ROADMAP #1.

### F5c — home hero, the AI guide built, GitHub knowledge, type system (2026-09-30, local)
- **Home hero rebuilt:** an understated introduction that points at the evidence (the `home-intro` content block — owner's brief: unique, no rushing to claim), name and titles as quiet detail, a live proof strip, the character on its own with a wave once per session.
- **The AI guide's own section** (`ai-guide` block): what it is, guarantees shown only while the thing they describe is switched on, and a console — live status, the model, lenses, example questions, prompt box. The floating launcher shows on every page except home.
- **The guide's brain:** `POST /api/v1/guide` (AI SDK 7 through the Vercel AI Gateway), request whitelist, per-visitor and daily limits, tools behind flags, instructions for the owner's persona brief (friend, third person, vouches hard, calm under attack, broad and curious, never invents). BR-4.3 replaced, BR-4.6 added. Default model Haiku 4.5 with a 30-questions-a-day cap to stay in the Gateway's free credit — a Claude subscription can't power a public site.
- **GitHub knowledge:** the daily sync keeps each public repo's start date, README excerpt and last 30 commits (never a private repo's; wiped if one turns private); views `PublicGithubRepo`, `PublicRepoCommit`; endpoints `GET /github/repos`, `GET /github/commits`; the guide reads it all fresh on every question. Its answers may link to GitHub and the owner's own profiles only.
- **Visitor lenses as data** (`VisitorLens.sortOrder`, `PublicVisitorLens`, `GET /lenses`); `concierge.*` settings; content blocks editable in Admin → Page content.
- **Typography — "Plex, elevated"** (owner's choice): a fluid type scale, accent words in headlines written `*like this*` and set in Plex Serif italic, mono for labels and data.
- Tests: guide request whitelist, answer rendering (no HTML, allow-listed links), provider check, the route with a mock model, GitHub knowledge end to end, README transform; 30 judge-graded evals ready (need a Gateway key).

### Unused packages removed (2026-09-30)
- `next-auth`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `qrcode` (+ `@types/qrcode`) — installed but never imported; the docs now describe the stack as built.

### Docs brought up to date (2026-09-30)
- `CLAUDE.md` rewritten to the platform as it is: the real stack (hand-rolled auth, not NextAuth; unused packages listed for removal), real commands, current phase (F5b built, F5c in progress, the AI guide in scope), lookups and data-not-code list, the guide's rules, deploys as the owner's call, the browser and memory rules, the real file layout.
- `PLATFORM-CONSTITUTION-v1.md`: stack table amended to what was built; organisations and their kinds; phase status; route map (`/method`, `/now`, `/organizations/[slug]`, the AI guide, V2 admin routes); system names corrected; the concierge refinement.
- `DESIGN-SYSTEM.md`: components in use and chosen; §6a header and footer; §6b the AI guide; home marked as being rebuilt.
- `PAGE-SPECIFICATIONS.md`: the F5c governing note, the new shell (header, footer, guide launcher), `/method`, About with photo and titles, Contact via Let's talk and the guide's draft, `/now` and `/organizations/[slug]` planned.
- `PROJECT-STRUCTURE.md` rewritten from the real tree (v2.0).
- `DEPLOYMENT.md`: deploys are the owner's call; a pending-release table of the unpushed migrations and the owner's post-deploy steps; the AI guide's future env vars.
- `ENFORCEMENT-REGISTER.md`: rows for titles, homes, the database-rules count, public-capability coverage; BR-4 row now 🚧; legend gains 🚧 and points ⏳ at this roadmap.
- `BUSINESS-RULES-v1.md`: BR-4.1 notes the guide only drafts; BR-1.17 (photos) added earlier in F5c.
- `PLATFORM-OVERVIEW-AND-RATIONALE.md`: system names corrected.

### F5c — public site redesign, data layer and shared chrome (2026-09-30, local branch `release/f5b-admin`, not yet pushed)
- **Plan:** `docs/PUBLIC-REDESIGN-PLAN.md` — locked decisions D1–D15, the guide spec (§3a), component choices (§7a).
- **Real systems:** seeded systems reconciled with GitHub (migration `20260930140000_reconcile_seeded_systems`): *Xkimi Xa Mali* (was "Xkimm"), *FundsLink Academy* moved to KSDRILL-SA and marked private, Sunduza linked to its repository; personal home renamed *MALULEKE-KS*. Old addresses redirect (BR-1.14).
- **Sunduza named:** the client approved being named (owner, 2026-09-30) — *Sunduza Architectural*, disclosure recorded (migration `20260930150000_sunduza_named`, BR-1.4).
- **Titles & qualifications as data (D13):** `ProfileTitle` + `TitleKind` lookup, `PublicProfileTitle`; seeded "Software & AI Engineer" and "Final-year BSc Computer Science & Mathematics student, North-West University"; admin panel *Titles & qualifications*; `titles[]` on `GET /profile`.
- **Three GitHub homes (D12):** `OrganizationKind` lookup (personal / venture / client), `PublicHome` with live published-system counts; `GET /homes`; organisation kind in the admin.
- **Platform pulse:** `PublicPlatformPulse` — business rules the database enforces (counted from its own constraints, triggers and functions), audit events, last job and GitHub sync; `GET /platform/pulse`.
- **Photos as data (BR-1.17, new rule):** `ProfilePhoto` versions — decoded images only, re-encoded to WebP with all metadata (GPS, camera) stripped, superseded never altered or deleted; `GET /profile/photo/{purpose}` cached by content hash; admin *Photos* panel; the owner-approved graphite portrait is the About photo.
- **GitHub sync:** suggests readable names for new repos ("Graph Search Engine"); never overwrites a curated name. All 21 repos across the three homes synced locally.
- **Header (D10):** floating graphite glass pill nav — Systems · Journey · CV · Method · About — search, and *Let's talk* as the only contact entry.
- **Method:** `/how-i-build` renamed `/method` (permanent redirect).
- **Footer (D11):** mission, the three homes with live counts, contact + review promise, a live status line from the pulse, and the wordmark cut out of dithered ember dots (21st.dev Dithered Footer, adapted). No repeated page links.
- **The guide finalised (§3a):** in-code rig now → Live2D later; labelled AI guide speaking in the third person; hero + docked launcher everywhere; text now → voice later; the guide *drafts* an inquiry for the visitor to send, it never submits.

### F5b — admin panel (2026-09-30, same local branch, not yet pushed)
- A screen for everything the admin API can do: overview (attention first), systems editor (scheduling, slug rename, revisions, impacts, skills, ownership, GitHub facts), organisations, journey (approve drafts), CV (options, uploads, completeness check, full role/education forms — fixing data-loss on edit), profile + links + achievements, page content, inquiries (overdue filter), numbers, freshness, jobs, settings (platform tunables, every lookup, flags, lenses), activity log, account (password, recovery codes), sign-in and sign-out (ends every session).

### Earlier releases
- F5a public site on v3 (#103) · F4 scheduler, GitHub sync, retention, continuity CV (#98) · F2.3 features 7–10, CV options, auth hardening (#93) · F3.1 password change and single-use TOTP (#85) · F2.2 complete API surface (#83) · F1 database foundation (#55–#79). Details in `project` history and each PR.
