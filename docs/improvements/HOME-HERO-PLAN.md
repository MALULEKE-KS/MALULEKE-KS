# Home hero — plan and design (Sprint 1)

**Status: plan v2, 2026-10-20 (later) — the cover image changed: one AI-generated image behind the whole hero, on the owner's direction (§15, D-034). §6's framed panel and §7's Johannesburg photograph are superseded. The hero's content was also improved (§15). First released in PR #218 behind the flag `home.hero_v2`; **the flag and the previous hero were then removed on the owner's instruction — the rebuilt hero is the only hero (D-038).**

## 1. Brief

**The one story** (Playbook Stage 0.4): *what you are looking at is real, it is running, and a person built it.* The hero's job is to make a stranger — a recruiter with ten seconds, a client, an engineer, an admissions reader — able to answer four questions before they scroll:

| Question | Today's answer on the page | Target |
|---|---|---|
| **Who?** | A small mono eyebrow, "KURHULA SUCCESS MALULEKE" | The name and role are the first thing read, at a size that says so |
| **What do they do?** | Inferred from a poetic headline and a paragraph; the role is in a chip row below | One plain sentence in the first screen |
| **Is it real?** | An illustration and four small numbers (2 / 2 / 2 / 2) below the fold | A real shipped product in view, with its real status |
| **What now?** | See the work · Get my CV (and the header has CV + Let's talk) | One primary action, one quiet secondary, no repeats |

## 2. What is wrong now (seen live, 2026-10-20, build `0091d34`)

1. **The subject is an illustration.** The first visual is a stylised AI-rendered character, 40% of the first view, next to claims of "evidence". Visitors read it as generated/animated before they read a word.
2. **Too many devices in one viewport:** a flickering dot field, an ember glow, a rim-lit character with a head-turn rig, a pulsing live pill, a border beam, spotlight cards and count-up numbers. Professional product sites spend **one** device in the hero; the rest is type and space.
3. **The headline is clever, not clear.** "Most of what I'd tell you is already running." is a good line (the site's thesis) but it hides the role; italic serif accent + gradient is a stylistic flourish that reads as template.
4. **The proof is below the fold and undersells:** 2 years / 2 organisations / 2 systems / 2 queued, as icon tiles — the generic SaaS stat-card look, and the figures WP-202 already flags as underselling.
5. **A duplicate:** CV is in the header *and* the hero's second button (Playbook rule: no duplicates).
6. **Weight:** the character image and the rig (WebGL) are in the first view; phone LCP on `/` is 3.2–4.8 s against a 2.5 s target (baseline 2026-10-10).

What is *good* and stays: the graphite and bone system, the one ember accent, IBM Plex, the truthful live data, the floating header, the K-S cube mark, the reduced-motion discipline, the AI guide as its own labelled section.

## 3. What the best platforms do (principles)

From the pages I know — Linear, Vercel, Stripe, Resend, Raycast and the best engineer portfolios — **not freshly measured this session** (the reference sites were too heavy for this machine to capture; I'll screenshot them in the live review if you want the comparison on screen):

1. **Say what it is in plain words, first.** The H1 is a statement of value or role, not a riddle.
2. **One hero device, and it is the real product** — a framed screenshot or live panel, never an illustration of one.
3. **Proof sits beside the claim** — a logo/stack strip, a real figure with its source, a status.
4. **Restraint:** one accent, hairlines instead of boxes, generous space, a calm type scale; surfaces earn their depth.
5. **Motion that confirms, then stops:** one entrance (≈400 ms), then still. No loops except a live dot.
6. **A real person** — a small, honest photo or avatar with a name plate, not a mascot.
7. **Clear paths by intent** — hiring / a project / just looking — each one click.
8. **Fast and accessible as design constraints:** the LCP element is text, nothing heavy in the first view, full keyboard and reduced-motion parity, phone first.

## 4. Non-negotiables (from CLAUDE.md, the Playbook, the Design System)

Mobile first (360/390 px, `mobile.spec.ts`) · evidence not claims · no duplicates · **nothing hardcoded** — the headline, statement and labels are the `home-intro`/`page-copy` content blocks (admin-editable), the numbers are computed (D-010, EXT-1) · no invented personal facts · only the existing tokens, Plex, Lucide and real brand marks · reduced motion shows the final state · every claim leads to inspectable evidence (EV-1…8) · phone LCP ≤ 2.5 s, CLS 0, zero axe violations.

## 5. The decision (owner, 2026-10-20)

| # | Question | Decision |
|---|---|---|
| 1 | Direction | **C · Editorial** — the name large, one plain sentence, two actions, a hairline ledger — **plus a professional hero image** (Section 7), "related to my work and the system", with its own crop for mobile and desktop. A (two product windows) and B (portrait) were explored and stay in Figma, marked *explored* |
| 2 | The AI guide's character leaves the hero | **Approved.** It stays in its own labelled section and the docked launcher; the hero's second action, *Ask the guide*, opens the existing console. Amends the 2026-09-30 placement (D5) and D-020's hero character |
| 3 | Wording | **My recommendation, as designed:** H1 *Kurhula Maluleke* · *Software & AI engineer.* · "Full-stack systems that enforce their own rules, in production, with the proof one click away." It is the `home-intro` content block, editable in admin, so the owner can change a word without a deploy. The old line ("Most of what I'd tell you is already running.") is not lost: it is the site's thesis and moves into the page's content block history and, if the owner wants, the control-room heading |
| 4 | Sunduza | **Yes** — named and featured (the client approved, BR-1.4). Under C it stays in *Selected work*; the hero no longer needs product windows |
| 5 | A face (avatar) | **Later** — not in this sprint; C needs none |
| 6 | Colour treatment | **2 · Ember horizon** (owner, 2026-10-20: "I choose B … which is C v2" — read as the second option, *C v2 · 2 Ember horizon*; the owner is asked to confirm in the report). The field stays graphite; the warm light lives at the photo's lower edge (Section 8) |
| 7 | The photo | **Not the owner's own.** Claude searched professional libraries for the best fit and chose one (Section 7); nothing is downloaded until the owner says yes to that named file |

## 6. Structure of C
> **Superseded in part (2026-10-20, later):** the image is no longer a framed panel under the actions — it is a **cover behind the whole hero**, with the content on it (§15).

**Desktop (≥ lg), one centred column, then the image, then the ledger:**

```
[header — existing: logo · Systems Journey About · Search · CV · Let's talk]

                       [ ● Live · build 0091d34 ]
                         Kurhula Maluleke              ← H1, ~104 px, one line
                       Software & AI engineer.
         Full-stack systems that enforce their own rules,
          in production, with the proof one click away.
                [ See the work → ]  [ Ask the guide ]

  ┌────────────────── hero image (21:9) ───────────────────┐   ← top ~300 px visible at the fold
  │                                         [photo credit] │
  └────────────────────────────────────────────────────────┘
  ───────────────────────────────────────────────────────────
  11 systems     20 rules the      66 changes audited    2 organisations
  published      database enforces  this week
```

**Phone (360–390), one column in reading order:** live line → name (two lines, ~48 px) → role → statement → *See the work* (full width) → *Ask the guide* (full width) → image (4:5, its own crop) → ledger as a 2 × 2 hairline grid. No horizontal scroll.

Notes: the header already carries CV and *Let's talk*, so the hero has no CV button (no duplicate). The image is **below the type, not behind it**: legibility never depends on the photograph, and the page still works when no image has been chosen. Designed in Figma: https://www.figma.com/design/KkGly8QVHOrfyRSFjcqLxb — frames *C v2 · 1 Graphite*, *2 Ember horizon*, *3 Bone* (desktop 1440) and *1 Graphite* on a phone (390).

## 7. The hero image
> **Superseded (2026-10-20, later):** the owner rejected the Johannesburg skyline — "not related to the system or software engineering" — and asked for a cover image behind the whole hero, generated in ChatGPT, one for mobile and one for desktop. The criteria and the licence-as-data idea below still hold; the chosen photograph and the framed panel do not (§15).

**Role.** One calm, real, professional photograph — mood and place, not evidence (the evidence is the ledger beside it). It is decorative (`aria-hidden`, empty alt), framed in a rounded panel, and credited.

**Art direction — related to the work and the system.** Four themes, each searchable (viewed on Unsplash 2026-10-20):

| Theme | Why it fits | Search (Unsplash; the same words work on Pexels) |
|---|---|---|
| **A South African city at dusk — Johannesburg** | Authentic to where the work is from (Xkimi is built on an African principle); warm dusk light suits the ember accent; far less generic than a server rack. *Seen:* warm dusk skylines, one with a tall tower (7 photos for this exact search; widen to "Johannesburg skyline" / "Sandton skyline") | `johannesburg skyline dusk` |
| **A dark developer workspace** | The work itself: screens with code, shallow depth of field, low-key light. *Seen:* many strong results (5.6k) | `developer workspace dark code` |
| **Data and infrastructure** | "A database that enforces its own rules" — racks, cables, network light. Beware the green-neon cliché (the first page of results is mostly that) | `dark server room`, `data center aisle` |
| **Architecture and drafting** | Ties to Sunduza (architectural systems) and to "systems are designed" | `architectural blueprint dark` |

**Criteria (any photo must pass all):** real photography, not AI-generated (the owner's complaint about the current hero); low-key or gradable to a dark, calm field; a quiet area where the credit pill sits; no logos, brands, readable screens or text; **no identifiable strangers** unless the licence and a model release plainly cover it; landscape source at least 2560 px wide for desktop (21:9 crop), and for mobile either a portrait-friendly composition or its own photo (4:5 crop, at least 1170 px wide) — the owner picks one for each.

**Sources.** Free professional libraries first: **Unsplash** and **Pexels** (both free for commercial use, no attribution required — we credit anyway; the licence is read on the photo's own page at selection time, and Unsplash's licence is *not* public-domain: no reselling unaltered, no compiling a competing library). Paid, only if the owner wants it: Adobe Stock, Shutterstock, iStock/Getty. Nothing is downloaded without the owner's yes to a named file, source and size.

**Chosen photo (Claude, 2026-10-20 — the owner delegated the search).** *City skyline during night time* by **Tania Melnyczuk** (@alphabetania) on Unsplash — dusk over Braamfontein, Johannesburg, seen from the 24th floor of a hotel; published 6 February 2020; "Free to use under the Unsplash License" (read on the photo's page); page: https://unsplash.com/photos/city-skyline-during-night-time-diwubNzqQW0. Original size **4032 × 2268**.
- **Why this one:** a cool purple sky over a dark city of lit windows, with a natural orange line of horizon — it is the Ember horizon treatment almost by itself, and it is Johannesburg, which is where the work is from. It is a real photograph (the page lists a phone camera), with no people and no readable text or logos visible at gallery size (to be confirmed at full size before it is used).
- **Two crops from the one file, so mobile and desktop match:** desktop 21:9 → 4032 × 1728 (the brief asks for at least 2560 wide); mobile 4:5 → 1814 × 2268 (at least 1170 wide) — the tower stands near the middle, so a portrait crop keeps it. Both are re-encoded within the budgets (≤ 90 KB, ≤ 60 KB).
- **Credit as data:** Tania Melnyczuk · Unsplash · Unsplash License · the page above · retrieved 2026-10-20.
- **Before any download** the owner says yes to: source Unsplash, the *Original Size (4032 × 2268)* option, saved outside the repository (originals do not go in git); the page does not show the file size — I estimate 1–3 MB.
- **Runners-up if the owner prefers:** the blue-hour Johannesburg skyline (second result of the *johannesburg skyline night* search) or a dark developer desk (*developer desk night monitor*, 5.3k results).

**Licence and credit are data.** Author, site, licence, photo URL and date retrieved are stored with the image (the `home-hero` content block, editable in admin) and shown as the small credit pill. Honest sourcing is the site's thesis.

**How it is stored and served — extension over modification.**
- Two new slots, **`hero-desktop`** and **`hero-mobile`**, are one entry each in `PHOTO_PURPOSES` (`lib/profile/photos.ts`: "a new slot is one entry here — no migration"); uploaded in Admin → Photos; decoded and re-encoded to WebP with all metadata stripped (BR-1.17); superseded versions kept; served by `GET /api/v1/profile/photo/{purpose}` with content-hash caching.
- The global photo settings (`profile.photo.maxEdgePixels`, WebP quality 86) suit a portrait but are too heavy for a hero: the hero slots get their own **max edge and quality as settings**, so the weight is tunable without a deploy.
- Rendered with `<picture>` (the mobile source below 768 px), explicit width and height (no layout shift), decoded early (it sits at the fold). **Budgets:** ≤ 90 KB desktop, ≤ 60 KB mobile; the phone's image may become the LCP element, so the runner's phone LCP (target ≤ 2.5 s) is the judge.
- **No image uploaded → the panel is not rendered** (no broken box); the page reads as a complete type-led hero.

## 8. Colours ◆

**Decided (owner, 2026-10-20): treatment 2 · Ember horizon** — read from "I choose B … which is C v2" as the second option; to be confirmed. It is tokens only, so changing it later costs nothing. One adjustment for the chosen photo: it already has an orange horizon, so the warm light at the panel's lower edge is kept **low and derived from the photo's own horizon** (tuned by eye in S1.3) — two warm glows would double. The recommendation below (1 · Graphite) is kept for the record.

The hero and the home keep the Design System's palette (graphite, bone, one ember accent; `docs/DESIGN-SYSTEM.md` §1) — it is already measured for contrast, and the owner locked it as the identity (v3). Three treatments of C, in Figma:

| | **1 · Graphite, cool — recommended** | **2 · Ember horizon** | **3 · Bone** |
|---|---|---|---|
| Field | `night-deep` #0B0C0E | `night-deep` with a warm light at the photo's lower edge | `paper` #F4F2EE |
| Type | `paper` 16.4 : 1, `mist` 8.3 : 1 | same | `ink` 16.5 : 1, `slate` 7.2 : 1 |
| Ember | **only** the primary action and the live dot | the action, the dot and the glow | the action (fill with `ink` text, 5.95 : 1) |
| Feel | Calm, premium, the photo carries the colour — closest to how Linear and Vercel read | Warmer, more brand; risks looking like the old glow-and-dots hero if the photo is also warm | Editorial, Stripe-like; a light hero is new for this site |
| Cost | none | none; pairs best with a *cool* photo | **amends the Design System** (§7 says the hero is graphite) and the header's glass; the alternating band rhythm below would need a re-check |

**Recommendation: 1.** If the chosen photo is the Johannesburg dusk, its warmth *is* the ember — so treatment 1 lets the photo supply it, and treatment 2's glow is not added on top. The rest of the home keeps the DS rhythm (graphite and bone bands alternating); C's type scale, hairlines and "ember only where it acts" rule are what the other pages and sections then inherit (the kit, Section 10). Any change to the palette itself is a separate Design System decision.

## 9. Toolchain, components, motion and performance

**The owner's toolchain** (2026-10-20: "Figma, motion, shadcn/ui, Magic UI, 21st.dev and the ones professional platforms use"), recorded in `docs/FRONTEND-CRAFT-RECORD.md`:

| Tool | Used for in the hero (C) |
|---|---|
| **Figma** | The source of truth: tokens as variables; C v2 frames at 1440 and 390; after the review, the chosen treatment is refined and the shared pieces are made Figma components (`PageHero`, `ProofLedger`, `HeroBackdrop`) beside the code |
| **shadcn/ui** (Radix, CVA, Lucide) | `button` (the two actions), `badge`/chip (live line), `tooltip` (evidence on each ledger figure), `separator` (the hairline) |
| **Motion** | The one entrance — staggered opacity and an 8 px rise on the type, then the image fading in — and nothing else |
| **Magic UI** | `blur-fade` is already in the repo (`components/ui/blur-fade.tsx`) and is reused for the entrance. The registry's `safari` and `marquee` are not needed under C |
| **21st.dev** | Hero patterns were searched (Hero with Mockup, Portfolio Hero, Hero Block, Minimal Logo Kicker Strip …); **none is needed for C**, so no retrieval is spent (both of today's free ones remain) |
| **Tailwind v4 + tokens, IBM Plex, `next/image`/`<picture>`** | All styling; the type scale (display ~104 px desktop, 48 px phone, tight tracking) is the hero's one flourish |
| **What professional platforms do** | A plain-language H1 and a proof strip (Stripe), hairlines instead of boxes and a calm, low-key hero (Vercel, Linear), accessible and fast as design constraints |

**Removed from the hero:** the character and its rig, `FlickeringGrid`, `BorderBeam`, `MagicCard` stat cards, `NumberTicker`, the italic gradient accent in the H1, the glow-plus-dots stage.

**Motion budget:** one entrance (≈ 400 ms, 60 ms stagger); the live dot's ping; nothing else moves. Reduced motion: no entrance, the live dot is still.

**Performance:** the LCP candidates are the H1 and, on phones, the image — hence the image budgets above; no WebGL, no AI SDK and no `zod` in the first load (the existing guard test). **Target: phone LCP ≤ 2.5 s on `/`** (baseline 3.2–4.8 s), CLS 0, closing the home page's part of WP-102.

## 10. The kit — what the other pages inherit

`components/shared/PageHero.tsx` already opens every inner page; the home hero **evolves it, it does not fork it**. Extracted and documented as the kit (code and Figma components, `DESIGN-SYSTEM.md` §7, the Playbook's per-page sheets): **`PageHero`** (name or title, role line, statement, actions), **`ProofLedger`** (hairline computed figures with their source), **`HeroBackdrop`** (the cover `<picture>`, its overlay, its credit and its empty state), and **the entrance**. Each page keeps its own idea (Playbook: one family, each page unique); the avatar (**`PageIdentity`**) joins the kit when the owner decides it.

## 11. Slices — Sprint 1 (a week; the push gate on each)

All behind the flag `home.hero_v2` until the review.

| Slice | What (vertical, working) | Done when |
|---|---|---|
| **S1.1** | **Skeleton of C:** the live line, H1, role, statement (from the `home-intro` block), the two actions, the hairline ledger — phone first, no image yet | Renders from real data at 360/390/1280; `mobile.spec` and `a11y.spec` pass; flag off in production |
| **S1.2** | **The hero image slots:** `hero-desktop` and `hero-mobile` in `PHOTO_PURPOSES`, the hero's own max-edge and quality settings, the credit data in the `home-hero` block, the `<picture>` with its empty state | Upload in admin, the right crop per device, no layout shift, no image → no panel; tests for the slots and the empty state |
| **S1.3** | **The owner's image and colour:** the chosen photos selected at the live review, graded and encoded within the budgets, the chosen colour treatment applied as tokens; credit filled in | Both images ≤ budget; credit visible; the owner accepts how it looks on desktop and phone |
| **S1.4** | **The entrance and the live line:** the one entrance, the build/pulse line, reduced-motion parity | Keyboard path and reduced motion verified; nothing loops but the dot |
| **S1.5** | **Cut the old hero:** the character, rig, flickering grid, beam, stat cards and their first-view weight; the guide stays in its section and launcher, *Ask the guide* opens it | First-view script/image weight measured before/after; the zod guard still passes |
| **S1.6** | **No duplicates:** nothing on the page repeats the ledger; the control room keeps its terminal and evidence | One look at the whole home page: nothing appears twice |
| **S1.7** | **Verify and measure:** phone LCP ≤ 2.5 s, CLS 0, axe 0, mobile e2e, the budgets job, `npm run baseline` vs 2026-10-10; flag **on** at the review | Numbers recorded in the PR and the tracker; the owner accepts at the live review |
| **S1.8** | **The kit:** `PageHero`, `ProofLedger`, `HeroBackdrop`, the entrance — in code and as Figma components; the Design System §7, the Playbook and the Frontend Craft Record updated | The next page can be built from the kit; docs current |

Every slice ends with the push gate (`WAY-OF-WORKING.md` §7): I tell the owner what is going and wait for **approve, or additions**. One release at the end of the sprint, reviewed live.

## 12. Verification and rollback

Phone and desktop by eye in the owner's Chrome (phones by `mobile.spec` at 360/390 and the preview); `a11y.spec`, the zod-out-of-first-load guard, the budgets job after release, `npm run baseline` against baseline-2026-10-10. Rollback: a revert of the release PR (the flag and the previous hero were removed at the Sprint 1 release, D-038 — superseding the expand/contract retention first planned); the image slots are additive entries and settings.

## 13. What the owner still picks ◆

1. **The hero image(s) — desktop and mobile.** At the live review we browse the four themes together on Unsplash/Pexels and shortlist; the owner chooses; I state each file's name, source, licence and size **before** downloading anything.
2. **The colour treatment** — 1 Graphite (recommended), 2 Ember horizon, or 3 Bone (amends the Design System).
3. **Go-ahead for S1.1** on `release/sprint-1` — I announce the push first.
4. Anything to add or any reference to match.

## 14. Update — S1.1 built (2026-10-20, later)

- **Built, behind the flag `home.hero_v2` (off):** the live line, the name as the H1, the role, the owner-approved statement, *See the work* and *Ask the guide*, and the hairline ledger computed from the database — `components/home/HomeHeroV2.tsx`, `lib/home/hero.ts`, the content block `home-hero`, one additive migration. The image (S1.2) will sit between the actions and the ledger; the entrance (S1.4) is not in yet.
- **The name comes from the profile's `displayName`** — "Kurhula Success Maluleke" — not the short "Kurhula Maluleke" drawn in Figma (I wrote the short form; it is not stored anywhere, and a name is not mine to shorten). If the owner wants the short form, it becomes one field in the `home-hero` block. At the hero's size the full name sets in two lines on a phone and one on a wide desktop.
- **Ask the guide** shows a small sparkle, not the guide's face, in the hero (`AskGuideButton showFace={false}`); the docked launcher keeps the face.
- **Ledger:** only figures above zero are shown (tested): systems published, rules the database enforces, changes audited this week, organisations founded.
- **Not yet seen rendered.** The machine had about 0.6 GB free, too little for the dev server; the owner's live review runs it once memory allows. The Figma frames remain the visual reference.

## 15. Update — the cover image and better content (owner, 2026-10-20, later)

**The owner's direction:** "the hero that is behind the whole hero homepage … the whole cover … let the content on the hero be on it … and that picture is not related to the system or software engineering … call out ChatGPT in Chrome and do a powerful prompt … generate both mobile and desktop" and "think of a better hero content".

**The cover image.** One image behind the *whole* hero; the name, role, statement, actions and record sit on it. `components/shared/HeroBackdrop.tsx` (replaces the framed `HeroImage`): a `<picture>` with a portrait source below 768 px and a landscape one above, `object-cover` so any shape fills the hero; a graphite overlay (top and bottom, plus a soft pool behind the type) whose strength is the setting `home.hero.scrim` (default 70, tuned by eye); an optional warm light (`home.hero.glow`, default 0 — the image carries its own orange); the credit on the image. The section is at least a screen tall, content centred on it. No image uploaded → a graphite field, never a broken box.

**The images** — generated in the owner's ChatGPT account (Free plan) from two prompts (recorded in `design/hero/README.md`): a photoreal, low-key data-centre aisle — dark graphite racks receding to a vanishing point, thin International Orange fibre-optic light lines converging like a living flow of data, a few steel-blue status LEDs — the system itself, in the brand's one accent colour, with a dark, smooth centre and upper area for the type. Desktop 1536 × 1024 (92.8 KiB), phone 1024 × 1536 (71.2 KiB), WebP, no metadata. Budgets: **100 KiB desktop, 80 KiB phone** (the image is now the page's largest paint). No credit is shown on the site (the owner's decision, D-036); the provenance — including the exact prompts — is kept in `design/hero/README.md`.

**Better content** (all data; the owner edits any of it in Admin → Page content → Home — hero):

| Part | Before | Now | Why |
|---|---|---|---|
| Statement | "Full-stack systems that enforce their own rules, in production, with the proof one click away." | "I design and ship full-stack systems that run in production, enforce their own rules and show their proof." | First person, a verb, three things that are each true and checkable on this site — and **no figure in it** (a number in a sentence goes stale; the record under it is computed) |
| Credential | — | The owner's own second title, from the profile: *Final-year BSc Computer Science & Mathematics student · North-West University* | Context a recruiter or an admissions reader wants in the first view, from data, nothing invented |
| Building now | — | "Building now · <repository> · pushed <when>" from the GitHub sync (shown only when something was pushed in the last 30 days) | Proof the work is alive, computed, and a link to it |
| Record | systems published · rules · audited changes · organisations | **systems shipped to production** · systems published · rules the database enforces · changes audited this week | Leads with the strongest proof; organisations founded is the weakest evidence and the least relevant to a first impression (the data is unchanged and can return) |

Other statements considered, for the owner to choose between or rewrite: *"Full-stack systems with real users and real money behind them — and the evidence to check every claim."* (Xkimi Xa Mali is described on this site as built for real money and real family stakes) · *"Software and AI engineer in South Africa. Every claim on this site opens its proof."*

## 16. The hero's content architecture (owner, 2026-10-20: "structure the content … at the highest professional, unique level"; "everything should come as real data")

**The idea that makes it this site's and no other's:** the platform's thesis is *evidence, not claims* — so the hero's sentence and its record are one structure. The statement makes three claims; the record under it is their live proof, each claim in the owner's words over the figure that backs it, and a claim is shown only while its figure is above zero. The hero cannot say something its data does not support.

| Level | Part | What it says | Source (nothing typed in code) | Phone | Short screens |
|---|---|---|---|---|---|
| 1 · Status | Where this page runs; what is being built right now | "Live · build …" / "Preview build …" / local; "Building now · <repo> · <when>" | The pulse (commit and environment) and the GitHub sync; the wording is the `home-hero` block | Both chips, wrapping | Same |
| 2 · Identity | Name (the one h1), role, credential | Who | `Profile.displayName`, `Profile.headline`, the owner's second title | Centred, two-line name | Same |
| 3 · Promise | One sentence, no figure in it | What he does | The `home-hero` block's `statement` | Centred | Same |
| 4 · Action | Two actions | See the work · Ask the guide (hidden if the guide is off) | The block's labels; the guide's own flag | Stacked, full width | Same |
| 5 · Proof | The record, docked in a frosted bar: *Runs in production → N shipped*, *Enforces its own rules → N rules* (evidence), *Shows its proof → N audited changes* (evidence), N published | Why the promise is true | `PublicLedger`, `PublicPlatformPulse`, the evidence claims; the claim phrases are the block's | 2 × 2 under the image | Same |
| 6 · Stack | The technologies behind the work, most used first | What it is built with | `SkillEvidence` (categories from a setting, ranked by systems) | Hidden | Hidden unless the screen is at least 1000 px tall |

**Composition.** One cover image behind everything (a portrait crop on phones, a landscape one above). On larger screens the type is set at the left, in the image's quiet zone, and the overlay clears toward the right so the lit racks show at full strength; on phones the type is centred over the aisle, which shows behind the whole hero under an even, lighter veil that deepens only at the bottom into the record (the first phone version darkened the top half and the owner saw the image only below — corrected). The hero is a screen tall at least and never taller than it needs to be: levels 1–5 fit a 900 px screen with their record; level 6 appears only when there is room.

**Rules.** (1) No wording in code — a part the owner has written nothing for is not shown, and no label is made up for a figure. (2) A zero is never proof, so a claim vanishes with its figure. (3) The statement carries no figure (it would go stale). (4) "Live" is said only of the production deployment. (5) One h1; reading order is visual order; the record is a list; the image is decorative (empty alt). (6) Every tunable is a setting: overlay, glow, entrance timing, how many technologies and from which categories.

**The record is not a second layout of the control room:** the control room keeps its terminal and its own evidence; it stops repeating the figures the hero now carries.

## 17. The header and navigation (owner, 2026-10-20: "the best outstanding header and nav bar … top notch"; "everything real data, nothing hardcoded")

**Starting point.** The header was already well built (F5c, D10): a full-width bar that gathers into a glass capsule on scroll, a reading-progress line, hide-on-scroll-down, a gliding nav indicator, ⌘K search, and a full-screen phone menu with a focus trap. What it lacked was *the platform's own proof in the nav* and *owner-edited wording*.

**What was added.**

| Part | What it does | Data |
|---|---|---|
| **Systems preview** | Point at, or tab to, *Systems* and the owner's featured systems appear under it, each with its live status (the colour is the status lookup's), its organisation and domain, and a link to all of them with the true count. Opens on hover and keyboard focus, closes with Escape (wherever focus is), never traps the keyboard; the link itself still navigates | The public views (`PublicSystem`), the same curation the home page uses (featured in his order; the flagships if none); how many show is the setting `header.systemsPreview.count` (default 3, 0 = none) |
| **Glass nav pill** | At the top of the page the links sit in a quiet glass pill so they read over the cover image; once the capsule forms, the capsule is the glass | — |
| **Wording as data** | The contact button, the CV buttons, the home link's name, the skip link, the phone menu's button, close label, review promise and each page's one-line description, and the preview's name and "all systems" link are the `site-header` block (Admin → Page content → Site header); a label left empty hides its part; the logo link falls back to the owner's name | `site-header` block (seeded by migration `20261020180000`) |

**Considered and left out, deliberately.** An availability pill: the profile's `availability` is empty, so the header would have nothing true to say (nothing is invented); it will appear the day the owner writes one. Page names (Systems, Journey, About) remain the route list in `lib/content/sheets.ts` — routes are structure, shared by the nav, the footer, the guide's index and each page's title, and are the recommended thing to keep in code.

**Verified.** Unit (`header-systems`), integration (`site-header`: every label seeded, the preview is the published systems, the count is true, 0 hides it), Playwright (`header.spec`: hover opens it with real systems, Escape closes it, keyboard focus opens it and Tab enters it without trapping, the skip link works, axe is clean with the preview open).

## 18. What the hero states must be provable (owner, 2026-10-20, after the release; D-039)

The owner read the live hero on his phone and found it saying things the data does not support. Each is fixed at its source, not by editing a label:

| What it said | Why it was wrong | Now |
|---|---|---|
| 2 systems shipped | Counted the pipeline status the owner chose; this platform's own entry reads "On GitHub" though it runs in production | Published systems with a live production address (`countSystemsInProduction`) — three, each checkable by opening its link |
| Building now · Xkimi Xa Mali | Used GitHub's last-**push** time, which moves for pushes that are not work; the system is finished | The repo with the latest **real commit** in 30 days, worded "Latest commit" (`latestCommitRepo` in `lib/queries/work.ts`); the Selected work card shares the selection |
| Live · build 0091d34 | The real date the previous hero showed was gone | "Live, as of 20 Oct 2026" — the date in the site's time zone (setting `site.timeZone`); a preview says Preview, never Live |
| The image only in the lower part of the phone hero | My phone overlay was dark over the top half | An even, lighter veil so the cover image shows behind the whole hero; it deepens only at the bottom into the record |

Rule: a line on the hero is either a computed fact or the owner's own words — never a guess dressed as a fact.

## 19. Speed, reliability and honest lines (Sprint 1b, owner-approved in order, 2026-10-20; D-040)

**Measured on the runner before this work:** phone LCP 4.6–4.8 s on `/` (every core page 3.6–4.1 s), desktop 0.8–0.9 s; the home page carried 270 KB of images on a phone, of which the hero's is 71 KB.

| # | Change | Why |
|---|---|---|
| 1 | Below-the-fold screenshots `loading="lazy"` (`SystemPreviewFrame`, `ProjectShowcase`; the system page's own first-view preview stays eager); the serif font `preload: false` | React hoists a preload for every eager `<img>`; two Selected-work screenshots were fetched at high priority alongside the hero image on a ~1.6 Mbps link |
| 2 | `home-hero.buildingSlug` + `buildingLabel`: the owner names what he is building; else the latest real commit | Only the owner can say what he is building; a push or a commit is only evidence of activity |
| 3 | Fonts self-hosted: `@fontsource/ibm-plex-sans, -serif and -mono` through `next/font/local` (latin, the weights the design uses) | No Google request at build or run time; CI's build failed twice on the download |
| 4 | The hero spec saves its first view at 360, 390 and 1280 px to `hero-screenshots/`; CI uploads it as an artifact | The owner can look at the phone layout on the pull request without anyone running a server |
| 5 | The Selected work card's heading is the same data as the hero's line; "last commit" replaces "last push" | One meaning for the same words |
| 6 | AI evals trigger narrowed to `lib/guide`, `app/api/v1/guide`, `tests/ai-evals` and the workflow; the retired flag row deleted; the README diagrams' custom font removed | Evals ran on unrelated content and migration changes; a dead switch in Admin; two clipped diagram labels |

**To measure after the release:** phone LCP and the home page's image weight on the runner (the budgets job prints both); then ratchet `perf-budgets.json` and decide whether the phone cover image needs re-encoding.

**Phone image corrected (owner, 2026-10-20, "still on the lower part, doesn't cover the whole hero, blurry").** Overlays were never the problem: the generated phone image was black across its top half (my own prompt asked for it) and encoded too hard. A new full-frame image was generated, encoded sharper (117 KiB; budgets raised with the reason) and swapped in by migration `20261020230000`; the phone veil is lighter and even. Lesson: judge the image file itself at phone size before blaming the CSS.

## 20. The other pages' heroes (owner, 2026-10-20/21; D-041)

**Question:** should Systems, Journey, About and Let's talk open on images like the home page? **Answer: yes, with conditions** — each unique; one landscape image per page for both phone and desktop (short bands crop well; four generations not eight); the scene fills the whole frame (no empty dark area — D-040's lesson); judged at phone size; encoded sharp but light (1280 px, WebP q72, median denoise: ~100 KiB each); data, replaceable in Admin → Photos.

| Page | Slot | Scene (generated in the owner's ChatGPT, image mode) | Why |
|---|---|---|---|
| Systems | `hero-systems` | Macro of a dark circuit board, orange copper traces in a city-like grid, a few blue LEDs | The things built |
| Journey | `hero-journey` | An empty straight dark road to a dawn horizon with orange edge lines | The path travelled |
| About | `hero-about` | An engineer's desk at night, keyboard and lamp glow, no person | Where the work happens |
| Let's talk | `hero-contact` | A door ajar at the end of a dark corridor, warm orange light spilling out | An invitation |

**Build:** `components/shared/PageHeroBackdrop.tsx` (renders nothing until the slot has an image, so a page never waits on one) over the home hero's `HeroBackdrop`; `PageHero` takes a `backdrop` prop and Journey, About and Let's talk place it as the first child of their hero section; `scripts/build-hero-photos.mjs --slot <purpose>=<file> --replace` writes the encoded image and an additive migration. The CV page keeps its field. Prompts and provenance: `design/hero/README.md`.

**About's phone image (owner, 2026-10-21: "the About needs a supporting mobile image").** The wide desk photograph crops badly to a tall phone screen (only the monitor's glow and the lamp survive). A page can therefore also have a portrait image for phones: the slot `hero-about-mobile` (settings: the home hero's phone ones, 1536 px and quality 78) and `PageHeroBackdrop`'s `mobilePurpose` — the same scene, composed for a tall screen. Pages without one use their single image for both, as before.
