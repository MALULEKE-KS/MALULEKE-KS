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

### The guide's mouth stops with the answer; a provider outage reads as "busy" (2026-10-08)
- **Limits say exactly what ran out (owner):** "This device has used all 60 answers it can have for now — that's the limit. Try again on Thu 9 Oct, 14:30" (the time in the visitor's own zone); the daily cap says it's across everyone and when it's back. The per-device limit counts by connection (a keyed hash of the IP, never the address).
- **The AI section folds again (owner):** closed by default so visitors who didn't come for the AI scroll freely — the bar carries the character's live bust, the heading and three questions; opening it or asking unfolds the console in place (its code loads on first open).
- **Mouth (owner):** text streams in far faster than the mouth "says" it, so it kept talking for minutes after an answer. The rig now keeps only the newest ~45 letters (at most ~3 s behind) and every mouth closes the moment the answer ends or is stopped (`hush`).
- **Outages:** when the free models are briefly down (the gateway's 503, seen in production 2026-10-08 for both free models), the guide says it's busy and to try again in a minute, instead of "lost its train of thought".

### The guide stopped answering: a retired fallback model (2026-10-08)
- **Found in the production logs:** `inclusionai/ling-3.0-flash-sante-free` — one of the guide's default fallbacks — was retired by the AI Gateway ("free tier has ended", 404). Whenever the main free model was busy, the answer fell through to it and failed with "The guide couldn't answer just now".
- **Fixed:** the default fallbacks are now `inclusionai/ling-3.1-flash-free, poolside/laguna-s-2.1-free` (both live, free, tool-use and reasoning); and before every answer the route keeps only models that are on the gateway's live list (`lib/guide/gateway-models.ts`, read at most hourly), promoting a live fallback if the main model itself is retired. Tested.

### AI guide, phase 1: one console, the character at work, live cards, the trail and sources (2026-10-08)
- **Owner:** "it's so basic and normal". Plan: `docs/AI-GUIDE-PHASE1-PLAN.md` (D-023).
- **One console, one conversation:** the chat moved out of the panel into `GuideChatProvider`; the home section is the console itself (the bar, the brochure and its four "what it does" cards are gone) and the docked panel on other pages shows the same conversation. Components in `components/guide/console/` (stage, conversation, answer, trail, receipts, cards, composer); the 532-line panel is a thin dialog now.
- **Live cards:** four read-only tools — `show_systems` (real slugs only), `show_journey`, `show_skills`, `show_pulse` — read from the public views; the model only picks which. Flags `agent.show_*`, switched on at the owner's word.
- **Working trail and sources:** the real steps behind each answer, live while they run (from the message's parts, never timers); under each answer the records it used, checked against the site's index — a link to something that doesn't exist is never shown.
- **The character at work:** its live bust — the same rig as the hero — on a stage beside the conversation on desktop, in the console's header on phones and on the panel, looking at the composer while you write, thinking while it works, speaking while it answers; a corner bust ("Still answering…") when the console is out of view. Shine Border (Magic UI) lights the stage while it works.
- **Phone:** the console fits the screen with the composer at thumb reach; asking opens it full screen; cards swipe in one row.

### The map traced by click, a phone map of its own, every repo in every home (2026-10-08, second batch)
- **A trace lasts while you study it (owner):** scrolling through the lines never ends it. It ends on a real tap or click elsewhere (the browser's click, which never fires for a scroll or drag), Clear, Escape, or once the whole map has scrolled off screen.
- **Lines only on selection (owner):** the map rests with no lines at all; a click or tap draws exactly that node's connections through to Built with, and a click away hides them. Hover only names a node in the bar. (Supersedes "phones draw every connection at rest" below.)
- **Beams that go exactly where they connect (owner):** every beam ends on a dot exactly at its node; nodes are opaque so no line shows through a neighbour; the beams are re-measured whenever a node moves, fonts arrive or chips are shown (measured: 95 of 95 endpoints on their nodes). Phones draw every connection through to Built with at rest, fainter — no tap needed first.
- **Map (owner):** a click or tap selects and traces (homes now show their connections instead of opening GitHub); a second click opens the link; a click elsewhere, Clear or Escape returns to normal. A selection bar names what's traced and its counts, with Open and Clear. Phones: homes and work two by two, the most used technologies with "Show all", only the homes' beams at rest, only the selection's beams when tracing.
- **Every repo in every GitHub home (owner):** `github.sync.newRepoVisibility` is now public-and-private, and a hidden, never-curated system is shown as soon as that rule allows — private ones as private (never linked, never read for the AI guide), as FundsLink Academy and Governova. What the owner hid stays hidden; client and collaborated work still waits for approval. The sync reports each home where no token sees a private repo (`noPrivateAccess`, in Admin → Jobs) — the last run saw none anywhere, so private work needs a read-only token with access to each home (a fine-grained one for KSDRILL-SA).
- **Guide on phones:** its head and eye motion is scaled to the size it's drawn at (a phone draws it about half as wide, so a turn was ~1.5 px); a tap is a firmer, held glance, and a tap on the guide gets a blink and a nod.

### Home guide: one still pose, a head that turns to clicks and taps (2026-10-08)
- **Owner:** the hero character no longer waves or switches poses; it keeps the master pose and turns its head toward wherever the visitor points, clicks or taps, on desktop and on phones (taps, and a finger dragging even while it scrolls the page).
- **How it moves (`components/guide/rig.ts`):** the eyes jump first; the head follows a beat later on a spring and the eyes ease back as it arrives; the shoulders follow a little; a large deliberate turn often comes with a blink; a tapped point is held about 5 s, then the gaze eases back to the visitor; there's a faint postural sway. All rigid — no warping of the drawing.
- **Removed:** the idle pose cycle, the session greeting wave, the welcome-back wave, the point on the nameplate, the thinking frame, and `flashPose` / `GuidePose` from the guide's state. Fewer images on the home page: the pose frames no longer load there.
- **More work (owner):** Tshimo Agri Network, then FundsLink Academy, then Governova. A home order on a system that isn't featured now places it in More work (Admin → Systems → Home order, always editable); a migration sets the three.
- **FundsLink Academy and Governova are back, as private and in progress.** They went private on GitHub; the sync read GitHub's "not found" as "deleted" and hid them. GitHub answers "not found" for a private repo the token can't see too, so the sync now calls a repo deleted only in an account where the token sees private repos; elsewhere the system stays, shown as private (BR-1.7), its public knowledge wiped and flagged (D-021, tested).
- **System map:** the technologies are one wide, wrapping cluster beside the work, every one joined by a beam and the most used set larger, so the whole map fits on one screen. A phone now gets the same drawing (the separate phone tree is gone): three bands with the beams running down between them; a tap lights a node's connections.
- **AI guide limits raised (owner):** visitors hit the limit after a few questions. Migration raises the live caps to 500 answers a day for everyone, 60 per visitor a day, 40 per conversation (the guide runs on a free model, so this costs nothing; the free models' ~5 requests a minute is the real ceiling). At a limit the guide now says it has used its answers and is resting, and **when** they come back ("in about 3 hours"), with no pointless "Try again".

### V1 polish — real logos, dropdown filters, the whole stack, stat cards (2026-10-03)
- **Every technology with its real mark:** one map of brand marks (`components/shared/TechChip.tsx`, used by chips, the map, filters and the About orbit — the About orbit kept a second list, now gone). Simple Icons where it has the mark; official marks it lacks vendored in `public/brands` (Playwright, MATLAB, Motion and Magic UI from svgl.app; Matplotlib, NetworkX, Chroma, Inngest, 21st.dev and Tk from each project's own repo or site), drawn single-colour so they match; concepts with no brand (SQL, VLANs) get an honest icon of the idea.
- **The whole stack, as data:** a migration adds what this platform is built with — proven by its own `package.json` (Motion, Radix UI, Vercel AI SDK, Sharp, React PDF, axe, ESLint, Lucide, Neon) or by the owner's word (Figma, Magic UI, 21st.dev, Vercel AI Gateway, GitHub Actions, Node.js, SQL) — a "Design & UI" category, and hosting from each system's own addresses (GitHub for every repo there, Vercel for every vercel.app site).
- **About's orbit:** every skill a published system uses, on as many rings as it takes (27 today, was 16), scaled with container units so phone and desktop show the same orbit; skills not yet in a system stay in the list below, never in the orbit.
- **Hero numbers as cards:** Journey and About counters are Magic Card stat cards — a mark per number, a ticking value, an ember line drawing in, a live dot for what's happening now.
- **Systems filters:** Home, Status, Built with and Domain are dropdowns, links underneath, logos and search for technologies; the ranking (most used first) is said in the panel and on the home map.
- **Hydration:** Light Rays placed its rays with Math.sin, whose last digits differ between server and browser — an integer hash now.

### V1 showcase — Journey and About at showcase level; real data everywhere (2026-10-03)
- **Journey:** light-rays hero with live counters; a sticky chapter bar (scroll-spy); a scroll-driven ember beam down the timeline with Magic Card chapters, Shine Border on the current one, and an honest "what's next" (a countdown only when the date is known to the month).
- **About:** shine-framed portrait with live counters (years building, published systems, skills proven in code, companies); a story bento whose fact cards always fill their rows; dark method cards with a Border Beam; skills orbiting the K-S mark (Orbiting Circles), proven chips linked to the systems that use them.
- **Let's Talk:** a light travels the four steps from you to him; his card has a Shine Border; the progress card lights up when the message is ready; Send is the page's one Shimmer Button (Magic UI, tokens); sent, the check draws itself, embers rise, and the hero's steps return with the done ones ticked.
- **Systems spotlight:** every published system on a coverflow ring in the /systems hero (21st.dev Coverflow Carousel, adapted): a live system shows its real screenshot, every other one a card drawn from its own data; the centre card and the caption open the case study; drag, arrows, dots and the keyboard all work; the first frame is CSS so the server draws the ring fanned out.
- **Tests:** the guide's grounding test reads the site fresh and judges only systems whose state didn't change mid-question — other test files publish and hide systems in parallel, which failed CI twice.
- **Header:** nav labels never wrap in the gathered capsule (they broke mid-word, "System s").
- **AI guide:** a dotted thinking orb (21st.dev MorphOrb's orb, adapted) lit by what the guide is really doing — thinking, searching the site, opening a page, drafting — never labels cycling on a timer.
- **Share images fixed:** every case study's og:image 404'd — the URL was hand-built, and a file in the `(public)` route group is served as `opengraph-image-<hash>`. Next writes the URL now; `tests/e2e/share-images.spec.ts` fails CI on any share image that isn't served.
- **Nothing dropped, map and catalog:** the system map's 10-technology cap, 3 languages per repo and 4 repos per home were constants — now `home.map.techInGraph`, `github.languagesPerRepo`, `home.map.reposPerHome` (Admin → Settings). The graph draws the most used; every other technology is listed beneath and still traces its work. On /systems the "Built with" filter lists every technology (it stopped at 12), each system takes `github.languagesPerRepo` languages (it took 3), and a card shows "+N" for the stack it doesn't fit.
- **GitHub sync, monorepos:** when the root declares no workspaces, `apps/*`, `packages/*` and `services/*` are read, each for package.json, requirements.txt and pyproject.toml (FundsLink Academy has no root package.json).
- **Write-ups that run:** the job falls back across `concierge.fallbackModels` when `writeups.model` is refused (the free credit doesn't serve Claude), and reads a public repo anonymously when its account refuses the token (KSDRILL-SA). The README fallback renders as styled prose.

### V1 final — the finalization batch; the V2 plan locked (2026-10-02/03)
- **V2 plan locked:** `docs/V2-IMPROVEMENT-SPEC.md` (the owner's improvement spec, verified against the repo and production, with revision 3) is the V2 plan, built as a relay: `docs/improvements/TRACKER.md` (status, Next up, handoff log) and `DECISIONS.md`, read first by every session (CLAUDE.md "Start here"); `tests/unit/v2-tracker.test.ts` keeps the tracker complete.
- **About and Journey redesigned:**
  - **What changed:** editorial layouts with hairlines instead of boxes and one accent, and nothing repeated.
  - **About:** the portrait badges and the organisations section are gone (the organisations are in the footer).
  - **Journey:** the chapters are a sticky-years timeline, and three milestones that restated their chapter were unpublished.
- **Footer:** the typed-in "Built on …" stack is gone, and there's no raw email or WhatsApp on every page (also removed from the home band and the phone menu).
  - The status line now says the version: **"V1 · V2 on the way"**, from the `release` content block.
- **Nothing hard-coded:**
  - **Page copy is data.** Every section's eyebrow, title and description lives in the `page-copy` content block, seeded word for word and edited in Admin → Page content. Interface labels stay in code (D-010).
  - **Descriptions come from data.** Page descriptions are taken from the page's own data; the map no longer counts the homes in words.
- **GitHub's real state, kept current:**
  - **New on the site:** FundsLink-Academy and Governova are public, so they're shown *In progress* with GitHub's own descriptions.
  - **Retired:** repos the owner deleted leave every public list (`System.githubGoneAt`).
  - **Ongoing:** the sync now re-decides a repo that goes public, and keeps uncurated descriptions in step with GitHub until a write-up exists (D-013).
- **From the V2 spec, pulled into V1:**
  - **WP-101 link previews:** one metadata helper for every page, and share-image alt text per system.
  - **WP-102 phone weight:** the master character image is no longer downloaded twice, and poses load on first use.
  - **WP-103 skill evidence from the repos themselves:**
    - **How it works:** the sync reads package.json (including monorepo workspaces), requirements.txt and pyproject.toml; skills carry admin-editable aliases; manifest links never touch the owner's own (D-015).
    - **What it proves:** this platform 11 skills, Sunduza 15, Xkimi 12.
  - **WP-105 contact exposure:** done as above.
  - **WP-107 guide suggestions:** no question asks the guide to judge its own owner.
  - **WP-108 honest activity labels:** recency is shown only for building work or recent commits; `stage` was added to the public system shape.
  - **WP-110:** a post-deploy smoke check that every page serves the deployed build.
  - **WP-203:** `/.well-known/security.txt`, built from data.
  - **WP-204:** axe WCAG 2.2 AA checks on every public page and a case study, in CI; four case-study issues fixed.

### F5c — The AI guide, audited and strengthened; V1 hardening (2026-10-02, local)
- **Why.** Owner: make the guide "the smartest and most intelligent AI ever", able to know "each and every corner of the system", with strong reasoning, speed, humour and conscience, robust to abuse and testing. Full detail in PUBLIC-REDESIGN-PLAN §3a, under "Strengthened — the V1 guide audit".
- **Reliability.**
  - **Fallback models.** The free gateway models allow about 5 requests a minute for the whole team, and a baseline eval run failed every case on that limit alone. The default for `concierge.fallbackModels` is the three free general models.
  - **Reasoning allowance.** A new setting, `concierge.maxReasoningTokens`, fixes answers that were cut off, or never started, when thinking used up the answer budget.
  - **Honest errors.** The chat says "busy" when it's busy, offers **Try again**, and offers **continue** after a cut-short answer.
  - **Faster.** The guide's knowledge is cached for a short window (`concierge.corpusCacheSeconds`), and gateway caching is on.
- **Intelligence.**
  - **Page context.** The guide knows the page the visitor is on, and the chat's suggestions follow the page (`ai-guide.pageSuggestions`, migration `guide_page_suggestions`).
  - **Wider knowledge.** It now knows the Journey chapters, every evidence claim (including what each doesn't prove), the platform's live figures and the kinds of message the contact form takes.
  - **Rewritten instructions:**
    - a reasoning method;
    - date arithmetic;
    - "site vs general" honesty;
    - the visitor's language;
    - an honest description of itself;
    - care in distress;
    - formats the chat can render.
  - **Drafts open the right form.** A drafted message opens the matching contact category.
- **Security.**
  - **Tool results are rebuilt server-side.** A forged history can no longer plant a fake "search result".
  - **The knowledge is data, never instructions.** README or commit text can't steer the guide.
  - **Baseline headers on every response:**
    - no framing;
    - nosniff;
    - a strict referrer policy;
    - a Permissions-Policy;
    - COOP;
    - a CSP limited to `frame-ancestors`, `base-uri`, `form-action` and `object-src`.
- **Chat.**
  - **The renderer:** a safe Markdown subset — code blocks with copy, inline code, steps, `[label](target)` links and anchors.
  - **The panel:** the conversation survives a reload in this tab, it shows "Thought for Ns", and answers can be copied.
  - **Links:** published systems' live sites are linkable.
- **Evals.**
  - **Coverage:** 39 cases.
  - **Running them:** they run on a gateway OIDC token, use a plain-verdict judge, are paced for free models, retry judge outages, and lift and restore the daily cap.
- **Smaller fixes.**
  - `/how-i-build` redirects straight to `/about#method`.
  - The About guide card's questions wrap instead of being truncated.

### F5c — Structure: no CV page, Method in About, Journey and About rebuilt, Let's Talk restructured (2026-10-02, local)

**Why:** the owner's critique — only Home and Systems were good.

**Site structure**
- **Navigation:** Systems · Journey · About, with a **CV** button beside Let's talk.
- **The CV:** the uploaded CV is the CV, and `/cv` redirects to the file. CV generation is switched off; its code is kept.
- **Method:** now part of About, at `/about#method`.

**Journey** — the owner's life and career, in chapters:
- Basopa Secondary School, 2018–2022
- University of Limpopo, 2023
- North-West University, 2024–now
- building companies, 2025–now
- what's next

The chapter text is a draft from his CV, marked `reviewed: false` for his approval (Admin → Page content → Journey). Year milestones are stored to the year.

**About** — the page, top to bottom:
- a portrait hero with glass badges;
- his bio beside the AI guide, whose poses change;
- Method, with evidence;
- skills, grouped, each with the systems that use it;
- his organisations.

The skills are 48 entries taken from his CV and his systems' stacks (migration `skills_from_cv`), each linked to the systems that list it.

**Let's Talk** — restructured, not just restyled.
- **Architecture:**
  - the category fields are data: one spec, one renderer, and a payload built from the same list;
  - the form's state lives in a hook, with one component per part;
  - a test proves the field spec matches the server's schemas.
- **On the page:**
  - a hero with the person and connected steps;
  - tiles that state each form's cost;
  - a progress rail.

**Component:** MagicCard takes a resting border (`rest`), so it works on bone surfaces too.

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
