# Page Build Playbook — how every public page is built

**Version 1.0 · 2026-10-01 · owner-directed ("every page is going to be built like that")**

The home page was rebuilt end to end on 2026-09-30 → 10-01 (PUBLIC-REDESIGN-PLAN §3, update log in ROADMAP-V2). This playbook turns that walkthrough into the **reusable process** for every other page: the same stages, the same checks, the same toolkit — with each page bringing its **own** data, components and story (the per-page sheets in §9).

It sits under the governing documents: DESIGN-SYSTEM.md wins on visuals, BUSINESS-RULES on behaviour, the Constitution on what exists. When this playbook and those disagree, they win — and this playbook gets fixed.

---

## 1. The owner's rules — non-negotiable on every page

| Rule | What it means in practice | Where it came from |
|---|---|---|
| **Mobile by default** | Every page is designed for a phone first and widened for desktop — never a desktop page squeezed down. A section is not done until it reads, taps and fits at 360 and 390 px. `tests/e2e/mobile.spec.ts` fails the build if any page is wider than the screen. | Owner, 2026-10-01: *"mobile responsiveness should be default by design"* — the live home page measured 811 px wide on a 390 px phone. |
| **Evidence, not claims** | Say less and show more. A statement is a fact the page proves (live counts, real systems, commits), never a boast. | Hero brief: *"I don't rush in claiming things but I make a good first impression."* |
| **No duplicates** | Nothing appears twice in one view or one page — not with the header, the footer or another section. Before adding anything, ask *"is this already on the page?"* | Hero's second Let's talk; floating AI button on home; mission repeated in the footer; "Where the code lives" twice. |
| **Nothing hardcoded** | Copy is a content block, tunables are settings, growing lists are lookups. UI micro-labels ("Try asking") may live in code; statements about the owner never do. | CLAUDE.md, EXT-1. |
| **No invented personal facts** | Only what's in the repo or what the owner said. Empty data shows as absent, never as filler. | memory: no-invented-personal-info. |
| **Private stays private** | No model ids, no internal defences advertised, no private repo content, no client names without approval. | Model id shown on the console (removed); "Guard-railed" tile (removed). |
| **Unique, not template** | Don't reach for the obvious AI-generated look. Pick one idea that fits the page's story and execute it well. | *"It should be unique and not obvious."* |
| **Highest level, then clean** | Build rich, then audit and remove what doesn't earn its place (§7). | The home audit. |
| **Deploys are the owner's call** | Build and verify locally; never push, PR or merge until the owner says the batch is ready. | memory: deploy-budget. |

---

## 2. The stages — zero to hero

Every page goes through these stages in order. Each ends with something the owner can see or a check that passes.

### Stage 0 — Brief and inventory (read before touching code)

1. Read the page's entry in **PAGE-SPECIFICATIONS.md** and its row in **PUBLIC-REDESIGN-PLAN §2**.
2. Read **FRONTEND-DATA-GUIDE.md** (generated): every capability whose `frontend` names this page — that's the data the page **must** show (the coverage rule, D2).
3. Look at the **real data** in the dev database for this page (a short Prisma script through `npx dotenv -e .env.development.local`). Thin data changes the design: the system map shows repos because systems were few; the control room hides "approved figures" until there are some.
4. Write down the page's **one story** in a sentence (home: *"most of it is already running"*). Every section must serve it.
5. Ask the owner only what the data and docs can't answer (voice of a headline, a personal detail, a choice between real alternatives — with previews).

### Stage 1 — Data first

The page never invents a shape; it reads public views.

1. Missing data → an **additive migration**: a view for the public role (`REVOKE … FROM platform_runtime; GRANT SELECT … TO platform_public`), never widening an existing one silently. Examples from home: `PublicVisitorLens`, `PublicGithubRepo`, `PublicRepoCommit`, `PublicSystemActivity`, `PublicSystemHome`.
2. Apply it to **dev and test** (`npx dotenv -e .env.development.local -- npx prisma migrate deploy`, same with `.env.test.local`); update `prisma/schema.prisma`; `npx prisma generate` (stop the dev server first on Windows — it locks the engine DLL); check drift with `prisma migrate diff`.
3. Add an **endpoint** for every new public view (`app/api/v1/...`), the **contract** entry (`openapi-contract.yaml`), the **capability** (`lib/capabilities/map.ts` — db, endpoints, rules, the page and section that shows it), the view in `tests/integration/db-roles.test.ts`, then `npm run docs:capabilities`.
4. A **query module** per page area in `lib/queries/` (e.g. `work.ts`, `map.ts`) that returns exactly what the components render — relative times ("2 days ago") computed there, per request.
5. **Tests** for the data rules (visibility, masking, privacy) in `tests/integration/`.

### Stage 2 — Structure

1. **Sketch the phone layout first** (one column, the order a thumb scrolls), then decide what widens into columns at `md`/`lg`. Hover-only ideas need a tap or always-visible equivalent; copy never says "hover".
2. List the sections: **purpose → data source → one action**. Example (home): hero → AI guide → selected work → system map → control room → method → let's talk.
2. **Alternate bands** dark (`bg-night-deep` / `hero-field`) and light (`bg-paper`) so each section reads as its own space; a hairline or glow marks special bands (the AI band).
3. Each section has **one** primary action; the header's Let's talk is the site-wide contact — don't repeat it near the top.
4. Check the duplicates rule against the header, the footer and the other sections **before** building.

### Stage 3 — Components: source, then adapt

Order of sources (CLAUDE.md): **this codebase → shadcn/ui → Magic UI → 21st.dev**.

- **Magic UI**: `mcp__magic-ui__getRegistryItem({ name, includeSource: true })` — unlimited. Browse magicui.design in the owner's Chrome to shortlist.
- **21st.dev**: browse the site first. On a component page, **Copy prompt ▾ → Claude Code** copies the component with its demo — it uses the **site's own free allowance** ("N free" next to Upgrade), separate from the MCP's 2 retrievals a day. The owner clicks it (clipboard writes need a real click); read it with PowerShell `Get-Clipboard -Raw`, save it to the scratchpad, then adapt.
- **Never paste as-is.** Every imported component goes through the adaptation checklist:

| Check | What we fix (examples from home) |
|---|---|
| Tokens and fonts | Colours from the tokens (ember, graphite, bone), IBM Plex; no theme libraries we don't use (Magic Card's `next-themes` removed). |
| Data as props | Demo arrays become props fed from `lib/queries` (Project Showcase). |
| Content always in the page | Typed/animated text keeps the full text in the DOM for screen readers, crawlers and no-JS, and reserves its height (Typing Animation, Terminal). |
| Reduced motion | `useReducedMotion` / `motion-reduce:` — a still, complete result. |
| Touch devices | Hover-only effects gated on `(hover: hover) and (pointer: fine)` (Lens, Project Showcase preview). |
| Performance | No `setState` every animation frame (Project Showcase re-rendered at 60 fps forever); one observer/SVG instead of one per item (Animated Beam: 30 SVGs → 1); pause off screen; throttle decorative loops (Flickering Grid ~20 fps). |
| Positioning bugs | No `position: fixed` from a rect read at render (it drifts on scroll). |
| Accessibility | Names on controls, decorative parts `aria-hidden`, focus shows the same state as hover. |
| Honesty | No stock images, no fake screenshots — an honest tile when there's nothing real. |

- Record every adopted component in **PUBLIC-REDESIGN-PLAN §7a** (where, source, what was changed).

### Stage 4 — Copy and content

1. Anything about the owner is **data**: a `SiteContent` block (`lib/content/blocks.ts` registry → seeded by migration with `ON CONFLICT DO NOTHING` → an editor in `/admin/content` via `FieldsBlockEditor`).
2. **Voice**: understated, specific, evidence-first; first person for the owner's own words, third person for the AI guide.
3. **Accents**: one phrase per heading written `*like this*` in the content → Plex Serif italic in the ember gradient (`<Accent>`). One per title, not more.
4. Offer the owner **options with previews** for anything that is their voice (the hero intro), then let them edit it in the admin.

### Stage 5 — Build

- Server component for the page and data; client components only where interaction needs them.
- Type system (`app/globals.css`): `type-display` (H1), `type-h2`, `type-lede`, `type-eyebrow`, `type-accent`, `type-data`.
- Layout: `Container`, `SectionHeader` (tone light/dark, one action), `Reveal` / `BlurFade` for entrance.
- **Mobile-safe grids:** every grid gets `grid-cols-1` before its breakpoint columns, and every grid or flex child that holds text gets `min-w-0` — otherwise a long line stretches the column past the screen (the home page's 811 px bug). Decorative glows sit in a section with `overflow-hidden` or `overflow-x-clip`. Tap targets are at least 40 px; text at least 12 px.
- One moment of motion per card/section; decorative motion pauses off screen.

### Stage 6 — Verify (every time, before showing the owner)

1. `npx tsc --noEmit` · `npx eslint <changed files>` · `npx vitest run` for the affected unit and integration tests, plus `capability-coverage` and `db-roles` when data changed · `npm run docs:capabilities`.
2. Server render check: `curl -s localhost:3000/<page>` and grep for the section titles.
3. **Phone check:** `npx playwright test tests/e2e/mobile.spec.ts` (every public page at 360 and 390 px, plus the phone menu) — add the page to its list when it's new — and look at full-page phone screenshots section by section (headless, never the owner's Chrome).
3. Browser review in the owner's **already-open Chrome** (Claude in Chrome): screenshots need the tab in front — open a fresh tab if the owner is on another; measurements and DOM checks work through `javascript_tool` in the background; a mobile check loads the page in a 390 px `iframe` and looks for horizontal overflow.
4. The **audit checklist** (§7) before calling the page done.

### Stage 7 — Document (in the same change)

- ROADMAP-V2 **update log** (what changed, why).
- PUBLIC-REDESIGN-PLAN **§8 delivery status** and **§7a** components.
- ENFORCEMENT-REGISTER rows for any new claim the page makes.
- Business rules replaced, not worked around, when one is weak (memory: replace-poor-business-rules).

### Stage 8 — Owner review loop

Show it, listen, iterate. The owner's feedback on home became rules in §1 and pitfalls in §8 — add new ones here when they come.

---

## 3. The reusable toolkit (built during the home page)

| Piece | Path | Use it for |
|---|---|---|
| Accent headings | `components/shared/Accent.tsx` | `*phrase*` → Plex Serif italic accent; `plainAccent()` for metadata |
| Section header | `components/shared/SectionHeader.tsx` | Eyebrow pill, title, description, one action; `tone="dark"` |
| Reveal / Blur Fade | `components/shared/Reveal.tsx`, `components/ui/blur-fade.tsx` | Entrance animation, once, reduced-motion safe |
| Magic Card | `components/ui/magic-card.tsx` | Cards whose border lights up under the pointer (`surface` for light/dark) |
| Border Beam | `components/ui/border-beam.tsx` | One travelling light on the single most important card of a view |
| Typing Animation | `components/ui/typing-animation.tsx` | A line that types once on view, full text always in the DOM |
| Animated Shiny Text | `components/ui/animated-shiny-text.tsx` | A quiet shimmer on a status line |
| Animated List | `components/ui/animated-list.tsx` | A live feed (commits, events) |
| Lens | `components/ui/lens.tsx` | Loupe over screenshots (fine pointers only) |
| Terminal | `components/ui/terminal.tsx` | Live checks / commands played as a terminal, text always present |
| Flickering Grid | `components/ui/flickering-grid.tsx` | Subtle texture behind a feature (~20 fps, pauses off screen) |
| Dot Pattern | `components/ui/dot-pattern.tsx` | Masked texture in a card header |
| Number Ticker | `components/ui/number-ticker.tsx` | Counting figures — the real value server-rendered |
| Project Showcase | `components/ui/project-showcase.tsx` | A list with a preview that follows the pointer (21st.dev, adapted) |
| Sparkline | `components/shared/Sparkline.tsx` | Weekly activity at a glance |
| Tech chip | `components/shared/TechChip.tsx` | A technology with its real brand mark (`techMark()`) |
| System preview frame | `components/shared/SystemPreviewFrame.tsx` | A browser frame with the screenshot or an honest placeholder |
| Status badge | `components/shared/StatusBadge.tsx` | Status label + colour token from data |
| Beam graph | `components/home/SystemMapGraph.tsx` | Connected columns drawn in one SVG, hover to trace |
| Ask the guide | `components/guide/AskGuideButton.tsx` | Open the AI guide with a question about this page |
| Page hero | `components/shared/PageHero.tsx` | The dark opening band of an inner page (clears the header) |
| Queries | `lib/queries/work.ts` (`ago()`, weekly series), `map.ts`, `github.ts`, `lenses.ts`, `profile.ts` | Page-shaped data from public views |
| Content blocks | `lib/content/blocks.ts` + `/admin/content` | Owner-edited copy for any page |

The AI guide is site-wide: every page can hand it a question (`useGuide().ask(...)`, `AskGuideButton`), and the floating launcher shows on every page but home.

---

## 4. Section patterns that worked

- **Proof strip** — live counts under a headline instead of adjectives (hero ledger).
- **Console** — an interactive card that previews a feature with real controls (AI section).
- **Featured + side + list** — one large card, a live side card, the rest as a pointer-preview list (selected work).
- **Map** — columns joined by beams, hover to trace (system map).
- **Terminal of facts** — live checks typed out, with the same facts as tiles (control room).
- **Titled quote** — a section title plus the owner's words as a blockquote (method).
- **Closing card** — one dark card with the review promise and the ways to reach him (let's talk).

---

## 5. Motion and performance budget (per view)

- At most **one** travelling light (Border Beam) per view; one live indicator (ping) per card.
- Decorative loops pause off screen and are throttled; canvases cap device pixel ratio at 1.5.
- Glass (`backdrop-blur`) on small or few elements; never stacked.
- Everything readable with JavaScript off and with reduced motion.
- The home page measured 26 concurrent animations and 11 glass layers before its audit — treat that as the ceiling, not the target.

---

## 6. Content and data conventions

- Relative times from the server (`ago()`), absolute dates in `title`/data attributes when useful.
- Empty data hides its section or shows an honest line ("Technologies appear here as systems are curated") — never filler.
- Public reads only through `dbPublic` (the `platform_public` role); runtime-role reads (e.g. lens framing prompts) stay server-side and are never sent to the browser.
- Every link out: `target="_blank" rel="noopener noreferrer"`; answers from the AI guide link only to allow-listed hosts.

---

## 7. The audit checklist (run before a page is "done")

**Structure and accessibility**
- One H1; sections as H2 in order; no heading text repeated on the page (footer included).
- Every button and link has a name; decorative images `alt=""`/`aria-hidden`; badges inside headings `aria-hidden`.
- Quotes are `<blockquote>`, not headings; focus states visible; keyboard reaches everything hover reaches.

**Duplicates and clarity**
- Nothing repeats the header, the footer or another section; one primary action per section.
- No internal details exposed (model ids, defences, private repos, unapproved client names).

**Motion and performance**
- Count running animations (`document.getAnimations().length`) and glass layers; apply §5.
- Canvases and loops pause off screen.

**Mobile (first, not last)**
- `tests/e2e/mobile.spec.ts` passes for the page at 360 and 390 px — no element wider than the screen.
- Screenshots at 390 px reviewed section by section: one column reads in order, nothing cramped or cut off, the hero no taller than it needs to be, no copy that says "hover", hover effects have a tap or always-visible equivalent, tap targets ≥ 40 px, text ≥ 12 px.
- Fixed and floating things (header, phone menu, AI launcher, consent banner) don't cover the content a visitor needs.

**SEO and sharing**
- Page `title` and a **specific** meta description from its own content (≤160 chars), Open Graph and Twitter description, canonical URL, JSON-LD where it applies.

**Build health**
- `tsc`, `eslint`, tests, capability coverage, generated guides current.

---

## 8. Pitfalls we already paid for

| Pitfall | Avoid it by |
|---|---|
| Regex backslashes lost when edits go through inline `node -e` template strings (`/\s+/` became `/s+/` — three times) | Write regex edits with the Edit tool or a script file; grep for `replace(/s+` after any scripted edit. |
| Windows CRLF files break exact-match replacements | Normalise `\r\n` in scripts, write back in the file's own style. |
| `prisma generate` fails with EPERM while `next dev` runs | Stop the dev server (and any node on :3000) first. |
| Tight memory (often < 0.5 GB free) — slow paints, stalled screenshots | One dev server; check free memory before builds; don't mistake paint lag for missing content (verify opacity/visibility in the DOM). |
| Claude in Chrome loses the page when the owner switches tabs | Re-read tab context; screenshots only on the front tab; use JS measurements in the background; don't fight the owner for the screen. |
| Hydration warnings from the owner's browser extensions (an injected button over images) | Check the codebase for the element before "fixing" React. |
| 21st.dev MCP quota (2/day) | Use the site's Copy prompt → Claude Code allowance first. |
| Imported components that animate state every frame | Refs and transforms; loops only while visible. |
| Showing internals to visitors | Ask "who is this for?" of every label. |
| Designing on desktop and checking phones at the end | Phone layout first (Stage 2), `mobile.spec.ts` in Stage 6. A grid item without `min-w-0` made the live home page 811 px wide on a phone; a fixed header then centred on that wider page. |
| Warping a flat drawing to fake a 3D turn | Subtle rigid motion only; real turns are the 3D model (ROADMAP-V2 #1). |

---

## 9. Per-page sheets — the unique resources of each page

Fill each sheet at Stage 0; it changes as the page is built. "Candidates" are ideas to evaluate, not commitments.

### `/systems` — the catalog
- **Story:** everything he's built, filterable, each one alive.
- **Data:** `PublicSystem` (status, domain, organisation, stack), `PublicSystemActivity` (sparklines), `PublicSystemHome` (home), `PublicGithubRepo` (languages, last push), filters (`/lookups`), slug redirects.
- **Must show (coverage):** see FRONTEND-DATA-GUIDE for `/systems`.
- **Candidates:** Magic Card grid with sparklines and tech chips; filter chips by home / domain / status; Project Showcase list mode; Lens on previews.
- **Owner inputs:** screenshots and stacks per system (admin).

### `/systems/[slug]` — the case study
- **Story:** one system, from problem to proof.
- **Data:** the system, impacts, skills proven (`SkillEvidence`), pace (`SystemPace`), weekly activity, recent commits (public repos), timeline entries, testimonials (when approved).
- **Candidates:** a dossier layout — sticky side facts, sparkline and commits feed, impact figures as Number Tickers, "Ask the AI guide about this system".
- **Owner inputs:** case study body (or generated from the repo, BR-4.5), impacts, screenshots (captured automatically from the live site, or uploaded — BR-1.18).
- **Built (2026-10-01):** one template for every case study — phone-safe whatever the write-up holds, and every system page tested at phone widths automatically.

### `/journey` — the timeline
- **Story:** from zero to here, dated and sourced.
- **Data:** `PublicTimeline`, `PublicExperience`, `PublicEducation`, `PublicAchievement`, repo start dates.
- **Candidates:** a scroll-driven timeline with Blur Fade; years as anchors; GitHub milestones interleaved.

### `/cv` — the CV engine (designed from zero, §5 of the plan)
- **Story:** a world-class, ATS-safe CV, generated from the same records, tailored to a role.
- **Data:** `PublicCvOption`, the CV model (`lib/cv/model.ts`), uploads.
- **Candidates:** live preview beside the options; role tailoring input; completeness indicator.

### `/method`
- **Story:** how the work is governed — principles as enforced rules.
- **Data:** `how-i-build` block, business rules and where they're enforced (register), the pulse.
- **Candidates:** principles as a numbered sequence with the rule that enforces each; the terminal pattern.

### `/about`
- **Story:** the person behind the work.
- **Data:** profile, titles, photo (`PublicProfilePhoto` — the approved graphite portrait), affiliations, links.
- **Candidates:** portrait with a restrained treatment; titles as data; "by the numbers" figures when approved.

### `/contact`
- **Story:** the one way in, with the review promise.
- **Data:** inquiry types, the review SLA setting, the guide's draft (when enabled).
- **Candidates:** a calm form with the promise visible; the AI draft banner.

### `/now` (new)
- **Story:** what's moving this week.
- **Data:** `PublicSystemActivity`, `PublicRepoCommit`, `PublicGithubRepo` (last pushes).
- **Candidates:** Animated List feed; week-by-week sparkline; "Now building" expanded.

### `/organizations/[slug]` (new)
- **Story:** one home — its role, its systems, its repos.
- **Data:** `PublicHome`, `PublicSystemHome`, `PublicGithubRepo`.
- **Candidates:** the map pattern focused on one home.

---

## 10. The home page — the reference build

| Section | Components | Data |
|---|---|---|
| Header | `SiteHeader`, `HeaderFrame`, `NavLinks` (desktop), `MobileMenu` (full-screen phone menu), `SearchPalette` | sheets, search, profile links |
| Hero | `HomeHero`, `HeroGuide` (rig + Flickering Grid), Number Ticker | `home-intro` block, titles, PublicLedger |
| AI guide | `AiGuideSection` (Magic Card, Border Beam, Typing, Shiny Text, Blur Fade), `GuidePanel` | `ai-guide` block, lenses, flags, GitHub repo count |
| Selected work | `WorkShowcase` (Magic Card, Lens, Animated List, Sparkline, Tech chips, Project Showcase) | `lib/queries/work.ts` |
| System map | `SystemMap`, `SystemMapGraph` | `lib/queries/map.ts` |
| Control room | `ControlRoom` (Terminal, Number Ticker) | PublicPlatformPulse, PublicMetric |
| Method | `PrinciplesBand` | `how-i-build` block |
| Let's talk | `ContactBand` | profile, inquiry types, review SLA |
| Footer | `SiteFooter`, `DitheredWordmark` | homes, pulse, profile |
