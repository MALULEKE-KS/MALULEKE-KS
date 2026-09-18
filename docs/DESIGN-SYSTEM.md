# MALULEKE-KS — DESIGN SYSTEM v3.0 ("Graphite & International Orange")

**Derives from:** PLATFORM-CONSTITUTION-v1.md, PLATFORM-OVERVIEW-AND-RATIONALE.md (voice & tone, mission)
**Status:** Active — supersedes v2.0 ("Cyanotype") and v1.0
**History:** v1 was deliberately flat — correct, but forgettable. v2 added colour and motion on a navy + amber drafting grid, which read as the generic generated look. v3, directed by the owner, is a modern product-grade interface: graphite, one engineering accent, glass, soft depth, real icons, bento layouts and purposeful motion. It keeps what made the platform its own: the live ledger, the system-map drawing, mono for real identifiers, and the rule that every visual device carries real information.

`/modern_ui_ux_layout_structuring_guide.md` (repo root) is now a **working reference** for layout rhythm, the 60-30-10 colour rule, glass, card anatomy and micro-interactions — applied through the tokens below, never as raw copied values.

---

## 0. Grounding

The subject governs his own work through numbered, citable rules, and this platform is itself one of those systems. The interface should feel like a precise, living product — the kind of site the work itself would have — not a template about it.

**International Orange** is the accent because it's the engineering colour: aerospace and structural engineering use it to mark what's critical. It has a reason to be here; a stock brand colour wouldn't.

## 1. Color — 60 / 30 / 10

Every text pairing below is measured (WCAG 2.1), not assumed.

| Role | Token | Value | Notes |
|---|---|---|---|
| **60 — graphite** (dark) | `night-deep` / `night` / `night-soft` | `#0B0C0E` / `#131519` / `#1B1E23` | Hero, principles, footer, dark cards |
| **30 — bone** (light) | `paper` / `sheet` | `#F4F2EE` / `#FCFBF9` | Content sections, cards on light |
| Text on light | `ink` / `slate` | `#121417` / `#4B5159` | 16.50 / 7.17 on paper |
| Text on dark | `paper` / `mist` / `line` | `#F4F2EE` / `#A3A9B1` / `#7C858F` | 16.43 / 8.26 / 5.23 on night-deep |
| **10 — accent** | `ember` | `#FF5B1F` | On dark 6.31; as a fill **with ink text** 5.95 |
| Accent as text on light | `accent` | `#C2410C` | 4.63 paper / 5.01 sheet |
| Gradient partner | `ember.soft` | `#FFB547` | Only inside `.text-ember-gradient` |

**Rules.** Ember is never text on light (2.78:1 — fails); use `accent`. Never white text on ember (3.10:1 — fails); use `ink`. Ember marks: the primary CTA, key numbers, the active nav item, focus rings, live highlights — nothing else.

**Status (data, never decoration):** `signal-finished` `#0F7A4B`, `signal-progress` `#C2410C`, `signal-planned` `#5B616A` on light; `-on-dark` variants `#3DDC97`, `#FF5B1F`, `#A3A9B1`. The colour on a badge is the `Status.colorToken` from the database.

## 2. Type

IBM Plex: **Sans** (UI, headings), **Serif** (long-form, the mission quote), **Mono** (real identifiers — dates, slugs, stack names, sheet numbers). Sentence case everywhere; no all-caps labels.

| Role | Classes |
|---|---|
| Display (hero ledger) | `text-4xl md:text-5xl`, `font-medium`, `tracking-tight` |
| Section title | `text-3xl md:text-5xl`, `font-semibold`, `tracking-tight` |
| Card title | `text-lg`–`text-3xl` by card size |
| Body | `text-base`/`text-lg`, `leading-relaxed`, muted tone |
| Micro | `text-xs` — badges, labels |

## 3. Layout & surfaces

- **Container:** `max-w-6xl px-6`, shared by header, sections and footer. Sections are full-bleed bands (`py-20 md:py-28`) alternating graphite and bone.
- **Radius family:** `rounded-2xl` cards, `rounded-3xl` feature panels, `rounded-full` buttons, badges and chips, `rounded-xl` icon tiles and windows.
- **Depth:** soft, layered, graphite-tinted shadows (`shadow-soft`, `shadow-lift`) and an ember glow on the primary CTA (`shadow-glow-ember`). Never pure black, never a hard offset.
- **Glass:** on dark only — `bg-white/5`, `border-white/10`, `backdrop-blur`. The header is near-opaque graphite with blur.
- **Hero field:** one quiet dot matrix fading out from the top-left, one soft ember glow, one cool counter-glow. No full-bleed grids — they read as noise.
- **Bento:** content is grouped in bento grids (one large card + supporting cards), following the guide's card anatomy: icon/badge header → title → muted description → specs → one action.

## 4. Principles

1. **Every device encodes real information.** Numbers are computed live. A node in the system map is a real published system and links to it. A badge's colour is its real status. Nothing about the owner appears unless it's sourced from the repo or the owner said it.
2. **One accent, spent on what matters now.**
3. **Depth is soft and quiet;** the accent does the shouting.
4. **Motion confirms, then stops.** Everything settles. The only loops: the live-data ping, the construction-circle orbit and the border beam — all off under reduced motion.
5. **Errors and empty states speak plainly.**

## 5. Motion

| Name | Where | Implementation |
|---|---|---|
| `ledger` | Hero facts type out, caret blinks, stops | `useTypewriterLines` + `.ledger-caret` |
| `draw` / `node-in` | System map lines and nodes draw in | `globals.css` (`pathLength=1` dash) |
| `orbit` | One construction circle, 90s | `globals.css` |
| `reveal` | Sections rise in once on scroll | `Reveal.tsx` + `.js [data-reveal]` (no-JS safe) |
| `spotlight` | Cursor-following light in cards | `Spotlight.tsx` + `.spotlight::before` |
| `ticker` | Count-up numbers | Magic UI `NumberTicker` (server HTML = real value) |
| `beam` | Light travelling around the hero map | Magic UI `BorderBeam` |
| `lift` | Buttons/cards rise 2–4px with a soft shadow | Tailwind `hover:` utilities |
| `live-ping` | Live-data dot | `globals.css` |

All of it renders the final state under `prefers-reduced-motion: reduce`.

## 6. Components & sources

- **Icons:** Lucide for UI; real brand marks via `react-icons` — Font Awesome brands for LinkedIn, WhatsApp and GitHub, Simple Icons for the tech stack.
- **shadcn/ui:** `button`, `input`, `card`, `badge`, `tooltip`, `separator` — restyled to these tokens.
- **Magic UI** (shadcn registry): `number-ticker`, `border-beam`, `dot-pattern` — adapted (real server values, reduced motion).
- **21st.dev** components may be used the same way: brought in, then converted to these tokens and fonts (never their bundled fonts or colours).
- **Own:** `SystemsBlueprint` (the live system map), `LedgerHero`, `SectionHeader`, `StatusBadge`, `SystemPreviewFrame`, `SocialLinks`, `Spotlight`, `Reveal`, `BrandMark`.

## 7. Home

1. **Hero** (graphite): live-data badge, name and sourced role, the ledger with gradient numbers, ember CTA + glass CTA, real facts with icons; right — the system map in a glass window with a border beam.
2. **Selected work** (bone): bento — flagship card, pipeline card (count-up), stack card (real brand marks + how the platform ships).
3. **How I build** (graphite): the mission as a serif quote, four principle cards with icons.
4. **Contact** (bone, with a graphite feature panel): the reply window, the real inquiry types, brand links.

## 8. Login

Behaviour unchanged (BR-3.1–3.3: two steps, generic credential errors, live lock countdown, 6-digit auto-submit, neutral session-ended copy). Visuals follow these tokens.

## 9. Print

`/cv` prints ink-only: no header, nav, footer, hero, glows, shadows or accent colour.

## 10. Tailwind mapping

Every token is a named Tailwind colour in `tailwind.config.ts` and a CSS custom property in `globals.css` (so data like `Status.colorToken` can bind to it at runtime). No magic hex values in components beyond the documented brand marks.
