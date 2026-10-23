# Frontend craft record — design and implementation

**Started 2026-10-20 (owner: "that must also be our frontend skills design and implementation record and document it").** This is the living record of *how the frontend is designed and built here*: the toolchain, the method, what each tool is actually used for, where the evidence is in the repo, and a dated log of every design and implementation decision. It is also the evidence behind the frontend skills the About page lists (Figma, Magic UI, 21st.dev, shadcn/ui, Motion, Tailwind — see D-019): a skill is claimed only where this record can point to a file, a commit or a Figma file.

**Rule for keeping it true:** every slice that brings in a tool, a component or a pattern, or makes a design decision, adds a log entry in the same PR (it is part of the Definition of Done, `improvements/WAY-OF-WORKING.md` §6). Only what was done is written as done; what is planned is marked *planned*. Nothing here is retro-fitted: where a tool was not used before a date, the log says so.

## 1. The method

1. **Brief and evidence first** — the Page Build Playbook's Stage 0: the page's one story, the real data (`docs/PAGE-BUILD-PLAYBOOK.md`).
2. **Design in Figma, phone and desktop, before code** (CLAUDE.md: "Figma for layout decisions before code"). Tokens are Figma variables mirroring `docs/DESIGN-SYSTEM.md`; frames use auto-layout so they map to flex/grid; real data on the frames, labelled placeholders only where a real image goes.
3. **Components from sources, in this order:** this codebase → shadcn/ui → Magic UI → 21st.dev (CLAUDE.md). Browse and shortlist by eye; retrieve code only for the pick (21st.dev's free tier: 2 retrievals a day).
4. **Convert, then ship:** anything brought in is rewritten to the design tokens and IBM Plex — no bundled fonts, colours or CDN assets — made reduced-motion safe, visible without JavaScript where it carries content, and recorded in `docs/PUBLIC-REDESIGN-PLAN.md` §7a.
5. **Motion with a budget:** the `motion` library for anything that must respond or coordinate; CSS for the rest; one entrance, then still; every loop (live dot, beam) off under `prefers-reduced-motion`.
6. **Verify, with numbers:** `tests/e2e/mobile.spec.ts` (360 / 390 px), `tests/e2e/a11y.spec.ts` (axe, WCAG 2.2 AA), the zod-out-of-first-load guard, `npm run baseline` and the post-deploy budgets job (`perf-budgets.json`).
7. **Record it here** (Section 4) and, for components, in PLAN §7a.

## 2. The toolchain — what each tool is for, and the evidence

Evidence was checked against the repository on 2026-10-20.

| Tool | Role here | Evidence in the repo (or "not yet") |
|---|---|---|
| **Figma** | Layout and visual decisions before code; the design tokens as variables; phone and desktop frames per page; later, Code Connect | **First file made 2026-10-20** for the home hero (Section 4). Before that, Figma appears in the docs as the planned layout tool and as a listed skill; no earlier Figma file exists, so no earlier page is claimed as Figma-designed |
| **Motion** (`motion` ^13.4) | Layout/shared-element animation, enter/exit, springs, scroll-driven effects | 19 files import it, e.g. `components/shared/NavLinks.tsx` (gliding active pill via `layoutId`), `components/shared/MobileMenu.tsx`, `components/journey/ChapterTimeline.tsx`, `components/about/GuideInvite.tsx`, `components/guide/console/*`, `components/ui/animated-list.tsx` |
| **shadcn/ui** (new-york, CSS variables, RSC) | The primitive layer: button, badge, card, command, dialog, input, separator, tooltip — restyled to the tokens; installed through the CLI, never hand-edited | `components.json`; `components/ui/` (README explains the CLI rule); Radix via `@radix-ui/react-slot`, `class-variance-authority` |
| **Magic UI** (registry; MCP server) | Effects that carry information: number ticker, border beam, magic card, animated list, flickering grid, dot pattern, blur fade, orbiting circles, light rays, shine border, shimmer button, terminal, typing and text animations, lens | `components/ui/` (each adapted: tokens, reduced motion, hydration-safe; the three written from the registry's source are named in the README); used on Home, Journey, About, Let's Talk (PLAN §7a). **Registry reachable 2026-10-20** through the MCP server: `safari` (browser mockup), `marquee`, `blur-fade`, `text-animate` are available for the hero |
| **21st.dev** (free tier: 2 retrievals/day; search free) | Whole-section patterns, adapted | Dithered Footer, Message Thread (the AI chat), MorphOrb (`thinking-orb`), Coverflow Carousel, Project Showcase — PLAN §7a, each with what was changed |
| **Tailwind CSS v4** + the v3 design tokens | Every colour, radius, shadow and type size is a token; no magic hex in components | `app/globals.css`, `docs/DESIGN-SYSTEM.md` §10 |
| **IBM Plex** (Sans, Serif, Mono) | The one type family | `app/layout.tsx` (`next/font/google`: IBM Plex Sans, Serif, Mono), DESIGN-SYSTEM §2 |
| **Lucide** and **Simple Icons / real brand marks** | UI icons; the real marks of every technology | `components/shared/TechChip.tsx`, `public/brands` |
| **Playwright, axe, Lighthouse** | The proof that it is phone-safe, accessible and fast | `tests/e2e/*`, `scripts/baseline.mjs`, `scripts/check-budgets.mjs`, `perf-budgets.json` |

**Reference platforms** (studied for structure and restraint, never copied): Linear, Vercel (Geist), Stripe, Resend, Raycast, and the best engineer portfolios — the principles drawn from them are in `improvements/HOME-HERO-PLAN.md` §3.

## 3. Standards this record holds us to

- The tokens in `docs/DESIGN-SYSTEM.md` are the only colour/radius/space source; Figma variables mirror them one to one (`color/ember` = `--color-ember`).
- Phone first: every frame is made at 390 px before 1440 px.
- One accent, one hero device, one entrance motion (HOME-HERO-PLAN §9).
- Evidence, not claims; no duplicates; copy and tunables as data (Playbook §1).
- Real product imagery over illustration.

## 4. Design and implementation log (append-only, newest last)

Earlier frontend work — the F5c redesign, the home, Systems, Journey, About, Let's Talk, the header, footer and mark, the AI guide's console — is recorded where it was done: `docs/PUBLIC-REDESIGN-PLAN.md` §3 and §7a, the update log in `docs/ROADMAP-V2.md` Part 2, and `docs/DESIGN-SYSTEM.md` §6. It is not repeated here.

### 2026-10-20 · Home hero — design stage (Sprint 1, S1.1 in progress; owner request, D-030)
- **Tools used:** Figma (new), Magic UI registry (MCP, search and inspect), 21st.dev (search only, no retrieval), Chrome for the live critique.
- **Design:** Figma file *MALULEKE-KS — Home hero (Sprint 1)* — https://www.figma.com/design/KkGly8QVHOrfyRSFjcqLxb. A **21-variable token collection** ("MALULEKE-KS tokens": the graphite/bone/ember colours and radii from the Design System) and four frames, all in IBM Plex, all built with auto-layout and token-bound fills: **A · Shipped product** (desktop 1440 and phone 390 — recommended), **B · Portrait and proof** (desktop), **C · Editorial** (desktop). Real data on the frames (20 rules enforced, 66 audited changes this week, 11 systems, build `0091d34` — read from the live public API); the two product windows and the portrait are labelled placeholders for the real captures, which Figma cannot fetch.
- **Candidates shortlisted, nothing retrieved or installed:** Magic UI `safari` (the browser frame — or our own `SystemPreviewFrame`, already built), `marquee` (stack strip), `blur-fade` (the one entrance); 21st.dev *Hero with Mockup* (#1492), *Featured Project Hero* (#37282), *Hero with Product Mockup* (#4710), *Portfolio Hero* (#9037), *Hero Block* (#10628), *Minimal Logo Kicker Strip* (#26889) — to be looked at by eye at the live review; at most one retrieval (the 2/day limit) after the owner picks.
- **Decided / pending:** direction, wording, the guide's place — pending the owner's live review (HOME-HERO-PLAN §13).
- **Verified:** the Figma frames were screenshotted and corrected twice (padding and translucent fills were wrong in the first build; an overlapping caption and a clipped stack row in the second). Nothing in code changed.
- **Found:** the live hero (build `0091d34`) shows five competing devices and an illustration as its subject; a duplicate CV action; its numbers sit below the fold (HOME-HERO-PLAN §2).

### 2026-10-20 · Home hero — Direction C chosen; the image slot and colour treatments designed (Sprint 1, S1.1)
- **Decided by the owner:** Direction C (editorial) with a professional hero photograph — a crop for desktop and one for mobile, from a professional site; the guide's character leaves the hero; the avatar later; Sunduza stays featured.
- **Tools used:** Figma (frames *C v2 · 1 Graphite · 2 Ember horizon · 3 Bone* at 1440, *1 Graphite* at 390; the image slot with a credit pill; auto-layout, token-bound fills, IBM Plex — same file, variables reused); Chrome with Unsplash (view only) to scout photo themes; the repo's photo pipeline read (`lib/profile/photos.ts`, `PHOTO_PURPOSES`).
- **Implementation decisions (planned, not yet built):** the hero image as two photo slots (`hero-desktop`, `hero-mobile`) — one `PHOTO_PURPOSES` entry each, no migration — with their own max-edge and quality settings and the credit as content-block data; the photo sits below the type in a framed panel so legibility never depends on it; no image → no panel; `components/shared/PageHero.tsx` is evolved, not forked, so inner pages inherit; the entrance reuses the existing `components/ui/blur-fade.tsx`.
- **Not needed, so not used:** Magic UI `safari` and `marquee`; any 21st.dev code (no retrieval spent — two free ones remain).
- **Standards held:** tokens only (the palette is unchanged); ember only where the page acts; image weight budgets (≤ 90 KB desktop, ≤ 60 KB mobile); decorative image with empty alt; real photography, credited, licence read on each photo's own page.

### 2026-10-20 · Home hero — S1.1 built; colour and photo decided (Sprint 1)
- **Decided by the owner:** the colour treatment *C v2 · 2 Ember horizon*; the photo is to be found online by Claude, not the owner's own.
- **Tools used:** Chrome with Unsplash (view only; the size menu was read, nothing downloaded) to choose the photo; the repo's own stack for the build — Next.js server component, Tailwind v4 tokens, shadcn `Button` (Radix Slot, CVA), Lucide (`ArrowRight`, `Sparkles`).
- **Implementation:** `components/home/HomeHeroV2.tsx` (server component; type is the hero — one fluid display size, `.type-hero-name`; no effects, no Magic UI and no Motion in this slice — the one entrance is S1.4); `lib/home/hero.ts` (pure, tested); the owner-edited `home-hero` content block with its admin field (D-010: statements are data, button labels are code); the flag `home.hero_v2`, off, so the previous hero stays until the review; `AskGuideButton` gained `showFace` so the hero carries a sparkle, not the cartoon face.
- **Evidence:** `tests/unit/home-hero.test.ts`; the Figma frames *C v2*; plan §14.
- **Standards held:** tokens only; one accent (ember on the primary action and the live dot); a zero is never shown as proof; no illustration in the first view; the Design System's contrast pairs (paper and mist on night-deep).
- **Not yet:** the image (S1.2/S1.3), the entrance (S1.4), a rendered check by eye.

### 2026-10-20 · Home hero — S1.2 to S1.7 built (Sprint 1)
- **Nothing hardcoded (owner's rule, restated):** the statement, both button labels, the live line, the record's labels and aria name, the photo's credit and focal points are the `home-hero` content block (shipped wording is only a fallback); the photos are two photo slots; the image's size and quality, the entrance's duration and stagger, and the glow's strength are seven `home.hero.*` settings — all editable in the admin without a deploy.
- **Components (kit):** `HeroImage` (later replaced by `HeroBackdrop`, see the next entries) (`<picture>` with a crop per screen, credit, warm light, nothing when empty), `ProofLedger` (hairline figures with evidence chips) — shared; `HomeHeroV2` + `HomeHeroV2Section` (the data) — home.
- **Motion — a decision recorded, not skipped:** Motion remains the library for anything that responds or coordinates (nav, guide, timeline). The hero's entrance is **CSS** (`.hero-rise`): it needs no hydration, starts at 40 % opacity so the largest text is a paint candidate from the first frame, and is gone under reduced motion — a Motion entrance would add client JavaScript and an initial hidden state to the LCP element. Verified by `tests/e2e/home-hero-v2.spec.ts` (`animation-name` is `hero-rise` with motion allowed, `none` when reduced).
- **Magic UI, 21st.dev, shadcn:** shadcn `Button` for both actions; Magic UI and 21st.dev were consulted (registry search, shortlists) and nothing was needed — recorded in PLAN §7a. No 21st.dev retrieval was spent.
- **Photograph:** *City skyline during night time*, Tania Melnyczuk, Unsplash — chosen from four themes, downloaded with approval (Original Size, 1.23 MB), cropped to a 21:9 band and a 4:5 portrait, graded lightly, encoded to 88.6 KB and 57.3 KB; provenance and licence in `design/hero/README.md`; reproducible with `scripts/build-hero-photos.mjs`.
- **No duplicates:** the hero's record carries the rules and audited-changes figures *with their evidence*; the control room drops its tiles and two terminal lines when the new hero shows (`ControlRoom showFigures`).
- **Verification built:** unit (`home-hero`, `photo-slots`), integration (`home-hero`: the retired flag, block valid, photos within budget, no metadata), Playwright (`home-hero-v2.spec.ts`: 360, 390 and 1280 px, the right crop per screen, no canvas, no overflow, reduced motion, axe) and the preview switch `/?hero=v2` (refused on production).

### 2026-10-20 · Home hero — the cover image redone with ChatGPT; content improved (Sprint 1)
- **Decided by the owner:** the image goes behind the whole hero; it must be about the system and software engineering; generate it in ChatGPT in Chrome (a powerful prompt, desktop and mobile); "think of a better hero content".
- **Tools used:** **ChatGPT (image generation)** in the owner's Chrome, his account — a prompt engineered for the design system: low-key graphite with the one International Orange accent, a dark smooth centre and upper area for type, photoreal not illustrated, no text or people; the phone version asked in the same chat for matching style and a low vanishing point. Prompts verbatim in `design/hero/README.md`. Chrome automation for the session; `sharp` for the encode (`scripts/build-hero-photos.mjs`).
- **Implementation:** `HeroBackdrop` — `<picture>` (portrait below `md`), `object-cover`, a two-layer graphite overlay (vertical gradient + a soft pool behind the type) at the strength of `home.hero.scrim`, an optional ember glow, the credit; the hero section is `min-h-svh`, `relative isolate`, content centred. The images ride the existing photo slots, so they stay replaceable data.
- **Standards held:** type contrast comes from the overlay (a setting, tuned by eye), not from hoping the image is dark; the credit is honest about AI generation; decorative image, empty alt; no image → a graphite field; weights asserted in a test.
- **Content decisions (all data):** statement without figures; credential from his titles; "Building now" from the sync; a ledger led by systems shipped to production.
- **Lesson:** my earlier rule "real photography, not AI-generated" was an inference; the owner's actual requirement was *relevance to the work* and *a cover behind the content*. Record what the owner said, not what I read into a complaint.

### 2026-10-20 · Home hero — composition, content architecture and honesty (Sprint 1)
- **Owner at the review:** the image and the text must work together and each have room to breathe; content structured at the highest professional, unique level; fix everything found; the credit line removed ("who told you to do so"); everything real data, nothing hardcoded or false.
- **Method:** a **high-fidelity review page** (a private artifact built from the real encoded images, the real data and the real IBM Plex fonts, with a live overlay slider) was used to judge the composition by eye while the local dev server could not run — it caught two real defects before they shipped (a hero taller than a 900 px screen with its record cut off; small text over the image too faint).
- **Composition:** overlay shaped to the layout, not laid evenly — dark at the left where the type sits and clearing to the right on larger screens, on phones an even, lighter veil so the image shows behind the whole hero, deepening only at the bottom (owner, 2026-10-20: the image was only in the lower part on a phone); type left-aligned in the image's quiet zone; vertical rhythm tightened so levels 1–5 fit 900 px; the technologies row only on screens at least 1000 px tall (`.hero-tall-only`).
- **Content architecture:** promise → proof (HOME-HERO-PLAN §16, D-035): the record's claims mirror the statement's clauses; the stack row is drawn from `SkillEvidence` by category (setting), most used first.
- **Honesty:** no wording in code (D-036); a figure with no label is not shown; the live line says "Live" only for the production deployment; the review page's values are real values read from the API, with absolute dates.
- **Standards held:** tokens only; ember only where the page acts (the action, the live dot, the claim ticks, the image's own light); one h1; the record is a list; the image is decorative; weights asserted by a test.

### 2026-10-20 · Header and navigation (Sprint 1, S1.9)
- **Decided by the owner:** "the best outstanding header and nav bar … top notch"; everything real data.
- **Reading first:** the existing header (`SiteHeader`, `HeaderFrame`, `NavLinks`, `MobileMenu`) was already refined, so the work added what only this platform can: a Systems preview of the owner's real featured systems with live status, and removed every typed word from the header and phone menu (the `site-header` block).
- **Implementation:** `lib/queries/header.ts` (pure shaping + public-view reads), the setting `header.systemsPreview.count`, `NavLinks` — a CSS-driven disclosure (`group-hover` / `group-focus-within`, `visibility: hidden` until opened so it stays out of the tab order) with a document-level Escape, and a glass pill behind the links in the top state via `group-data-[scrolled]/header`; `SiteHeader` and `MobileMenu` read their wording from the block and hide a part whose label is empty.
- **Caught by the tests before CI:** the first Escape handler lived on the nav item, so a preview opened by hovering could not be closed with Escape — moved to the document. A skip-link label added to the block but not seeded would have removed the skip link — seeded and asserted.
- **Standards held:** no wording in code; real data only; keyboard parity with hover; reduced-motion respected (no transition under `motion-reduce`); the preview is an addition, never a gate.

### 2026-10-20 · Sprint 1b — speed and reliability (D-040)
- **Decided by the owner:** approved in order — phone speed, the owner-set building line, self-hosted fonts, CI screenshots, one meaning of the words, the tidy-ups.
- **Method:** read what the phone actually loads (the page's own resource list) before changing anything; the finding was two below-the-fold screenshots being preloaded beside the hero image. Self-hosting fonts removes a build-time network dependency, and `next/font/local` needs literal font lists — a `.map()` does not compile.
- **Evidence still to come:** the runner's phone LCP after the release.

### 2026-10-20 · The new hero replaces the old one (D-038)
- **Decided by the owner:** after the first release he could not see the hero on his phone because it was behind a flag: "everything old should be replaced per sprint … the new one must work, not the old one."
- **Done:** the flag, the preview switch and the previous hero's code are removed; the rebuilt hero is the home hero. A flag is for work the owner has not approved; once approved, the sprint replaces what it rebuilt.

### 2026-10-22 · The AI guide band — premium pass (D-044)
- **What makes a UI read as generated, named before fixing it:** the icon-in-a-tile feature trio; containers nested in containers; illustrated mascots; adjectives where a product would show a number; stock micro-copy; fine print. **What premium products do instead:** show live facts, use hairlines and alignment rather than boxes, keep one identity mark, give keyboard users a shortcut, keep small print to one honest line.
- **Built:** live facts (`knowsLine`), the self-check in view, an editorial trust list, a single card with a hairline question list, the K-S cube mark as the guide's avatar, a calmer composer, the "/" shortcut.
### 2026-10-22 · The AI guide band, rebuilt (D-043, owner's choice A)
- **Owner:** the band was "fading inside content and very poor". **Method:** captured the live band at phone and desktop width, closed and opened, before touching code; listed what was wrong by what a visitor sees; offered three directions (A ready guide beside the introduction, B no band, C A plus a live example); the owner chose A.
- **Built:** a graphite band of its own; the introduction and three trust points (owner data) beside a ready guide — the real composer and three questions in full; the conversation replaces the card in place on the first question; no portrait, glows or moving lines; no blur-in. Phone-first order through CSS grid placement (DOM order introduction → guide → points; on large screens the guide spans both rows).
- **Caught by looking, not by tests:** a `content-visibility: auto` wrapper (added the day before for speed) contains `position: fixed` descendants — the phone's full-screen conversation rendered inside the band. Rule written in `globals.css`; e2e test added.
### 2026-10-22 · The inner heroes in one shape (D-046)
- **Owner:** approved the hero audit's proposal in full ("i approve all of them go ahead"); asked for the Systems spotlight's cards to be bigger. **Method:** captured all six heroes at 390 and 1440 px and measured their heights before changing anything; named what read as generated (capsule eyebrows, icon-tile stat cards, shine borders, light rays, radial glows) and what made the phone heroes long (About's full introduction, two-row stat tiles).
- **Built:** `HeroLabel` and `HeroFigures` (`components/shared/HeroKit.tsx`), the home hero's ledger style, used by every inner hero and `PageHero`; About's introduction split by `lib/profile/bio.ts` (first sentence up top, the rest word for word in the story); the coverflow ring takes a `frameClassName` so its edges fade by a mask instead of slicing a card; the ring's card size lives in one plain module shared with the streaming placeholder.
- **Removed:** `StatCards`, `LightRays`, the `stat-line` and `flow-light` animations; the shine borders and glows in the four heroes.
- **Caught by looking:** the bigger ring's neighbour cards were cut flat at the frame's edge on a desktop — fixed with the edge mask; the titles line wrapped its detail into a second column on a phone — now plain inline text.
### 2026-10-23 · The home page's premium pass (D-047)
- **Owner:** "plan and design each page first" — then approved the plan in full and asked for the best components (Motion, Magic UI, shadcn/ui, 21st.dev), clean everywhere, "speaking the world of our system".
- **Method:** audit of production at 390 and 1440 px with section heights; a review document with a live mock of every proposed section in the real tokens and IBM Plex; owner decisions D1–D5; built only after approval.
- **Components, each where it does work:** shadcn/ui **Hover Card** (added through the CLI, converted to the graphite tokens) — evidence previews; Magic UI **Lens** over each case's live site; a browser frame after Magic UI's **Safari** mockup (padlock and address bar) in our own `SystemPreviewFrame`; Magic UI **Animated List** for the commit feed; 21st.dev **Project Showcase** for More work; Magic UI **Animated Beam** (our adapted single-SVG version) for the map's traced connections; Motion behind all of them. Removed: Magic UI **Terminal** (the status became one line), the icon bento's Spotlight cards on the home page.
- **System language:** the status line is set as the platform's own command (`$ platform status --live`) and its checks; every card is a real system, every figure computed, every proof one hover or click away.
### 2026-10-23 · The phone pass (D-048)
- **Method:** a script measured the live page at 360/390/430 px — sideways overflow, every link and button's hit area (including an `::after` hit area), every text node's computed size — and listed each by section; the owner approved the eight fixes before any code.
- **Built as design-system rules, not one-offs:** `tap-target` (44 × 44 px minimum hit area, invisible), `press` (finger-down feedback, reduced-motion aware), a 12 px type floor on phones, 16 px inputs (no iOS zoom), safe areas through `viewport-fit=cover`, scroll padding under the sticky header, the theme colour for the browser bar.
