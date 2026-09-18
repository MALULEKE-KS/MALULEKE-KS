# MALULEKE-KS — DESIGN SYSTEM v2.0 ("Cyanotype")

**Derives from:** PLATFORM-CONSTITUTION-v1.md, PLATFORM-OVERVIEW-AND-RATIONALE.md (voice & tone, mission)
**Status:** Active — supersedes v1.0
**Changed from v1.0:** v1 was deliberately flat (one brass accent, no depth, one animation on the whole site). Built out, it read as correct but lifeless — nothing a visitor would remember. v2 keeps v1's engineering-drawing DNA and gives it colour, depth and motion. What survives unchanged: IBM Plex, left-aligned reading order, mono for real identifiers, the corner-bracket selection motif, the ledger hero, status colour as data, print as a separate ink-only output.

---

## 0. Grounding

The subject is a systems architect who governs his own work through numbered, citable rules. The visual answer is a **drawing set**: every page is a sheet, drawn on vellum, with the platform itself drafted in blueprint. The blueprint (cyanotype) is the oldest way engineers reproduced a design — which is exactly what this platform is: the design, reproduced as a running system.

That metaphor is the source of every device below. If a device can't be explained by "this is how a drawing set works", it doesn't belong.

Still deliberately avoided: the SaaS rounded-card grid with a soft blurred shadow; gradient text; glassmorphism; near-black with a neon accent; stock "hero headline + gradient blob"; tracked-out all-caps eyebrows.

## 1. Color

Every value checked against WCAG 2.1 contrast, not assumed.

### Surfaces
| Token | Hex | Role |
|---|---|---|
| `paper` | `#F4F1EA` | Vellum — the base surface of every page |
| `sheet` | `#FFFDF8` | Raised surface — cards, form fields, the title block |
| `blueprint` | `#0B2A4A` | **Primary.** Hero bands, primary buttons, the hard "print" shadow |
| `blueprint-deep` | `#06182E` | Header, footer, deep bands |

### Ink
| Token | Hex | On | Contrast |
|---|---|---|---|
| `ink` | `#0F1729` | paper / sheet | 15.85 / 17.58 — AAA |
| `slate` | `#3D4A5C` | paper / sheet | 7.98 / 8.86 — AAA |
| `paper` (as text) | `#F4F1EA` | blueprint | 12.89 — AAA |
| `mist` | `#B7C9DF` | blueprint / deep | 8.61 / 10.56 — AAA. Secondary text on dark |
| `line` | `#7CA7D6` | blueprint | 5.79 — drafting linework on dark (non-text) |

### Accent — one hue, two values
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `amber` | `#F5B335` | **Secondary.** Accent *on dark* (text, lines, active state) and as a *fill* on light, always with `ink` text on it | 7.88 on blueprint, ink on amber 9.69 — AAA |
| `accent` (brass) | `#8A5D12` | The same accent as *text or line on light* | 5.09 on paper, 5.65 on sheet — AA |

**Rule:** amber is never text or a meaningful line on a light surface (1.64:1 on paper — fails). On light, reach for brass; on dark, amber.

### Status (data, never decoration)
| Token | Hex | On light | On dark variant |
|---|---|---|---|
| `signal-finished` | `#1F6F5C` | 5.34 — AA | `#4CD1A0` 9.28 |
| `signal-progress` | `#8A5D12` | 5.09 — AA | `#F5B335` 9.66 |
| `signal-planned` | `#5A6470` | 5.33 — AA | `#9FB0C4` 8.05 |
| `critical` | `#9B3A2E` | 6.13 — AA | — |

## 2. Type

IBM Plex superfamily, unchanged from v1 — an engineering company's typeface for an engineering document.

| Role | Face | Usage |
|---|---|---|
| Display / UI | IBM Plex Sans | Headlines, nav, buttons, labels |
| Long-form | IBM Plex Serif | Case studies, About, Journey narrative, mission |
| Identifiers | IBM Plex Mono | Sheet numbers, rule IDs, dates, status, stack names, the ledger |

Sentence case everywhere. Line length under 80 characters on body copy.

### 2a. Type scale
| Token | Tailwind | Role |
|---|---|---|
| `micro` | `text-xs` | Mono identifiers, badges, title-block cells |
| `small` | `text-sm` | Secondary metadata, captions, nav |
| `body` | `text-base` | Default UI text |
| `lead` | `text-lg` | Card titles, lead paragraphs |
| `subhead` | `text-xl` | Subsection headings |
| `section` | `text-3xl` → `md:text-4xl` | Section titles |
| `page-title` | `text-4xl` → `md:text-5xl` | Page `<h1>` |
| `display` | `text-4xl` → `md:text-6xl` | Home hero ledger only |

Display and section sizes use `tracking-tight` and `leading-[1.05]`–`leading-tight`; that's optical correction for large sizes, not the all-caps tracking v1 banned.

### 2b. Spacing
4px base, the same named steps as v1: `micro` 1–2, `tight` 3, `default` 4, `loose` 6, `section` 8, `major` 12, `page` 16, plus `band` = `py-20 md:py-28` for full-bleed bands.

## 3. Layout — the drawing set

- **Frame:** one `Container` (`max-w-6xl px-6`) sets the left edge. Pages are composed of **bands** that run full-bleed (colour/grid edge to edge) with their content inside the container.
- **Sheets:** every page is a numbered sheet. The page header is a **title block** — the drafting convention of a ruled table in the corner of every drawing — carrying the page's real facts (sheet number, title, revision date, drawn by). Sheet numbers follow the nav order: 01 Home, 02 Systems, 03 Journey, 04 CV, 05 How I build, 06 About, 07 Contact.
- **Grid:** blueprint bands carry a drafting grid (fine 24px, major 120px) in `line` at low opacity. Light pages can carry the same grid in `blueprint` at very low opacity, sparingly.
- **Margin annotations** (v1 §3a) remain: real metadata in a hairline-divided right column ≥768px, collapsed to badges directly under the heading below that.

## 4. Principles

1. **Every device encodes real information.** Status colour is the actual status. A node in the hero drawing is an actual published system and links to it. A title-block cell is an actual fact. Nothing is decoration wearing the costume of data.
2. **Primary builds, secondary signals.** Blueprint carries structure (bands, primary actions, shadows). Amber/brass marks what matters now: the numbers, the active page, the thing to click next.
3. **Depth is printed, not lit.** Elevation is a hard offset shadow in blueprint with no blur (`6px 6px 0`), like a misregistered print plate — never a soft light-source shadow.
4. **Motion draws; it doesn't decorate.** Lines draw themselves in, facts log themselves, sections are laid down as you reach them. Everything settles and stops. Nothing loops except the slow rotation of one construction circle in the hero.
5. **Errors and empty states speak plainly.** What happened, what to do next, no apology.

## 5. Motion

All motion lives in `globals.css` (timed, sequenced) or Tailwind state variants (hover/focus). Everything is disabled under `prefers-reduced-motion: reduce`, rendering the final state immediately.

| Name | What | Timing |
|---|---|---|
| `draw` | SVG stroke draws in (`pathLength=1`, dashoffset 1 → 0) | 900–1400ms, `--delay` staggered |
| `node-in` | Drawing node fades + settles into place | 500ms after its line |
| `reveal` | Section content rises 16px + fades in when it enters the viewport (once) | 700ms, children staggered 80ms |
| `ledger` | Hero lines type out, caret blinks, stops | ~28ms/char |
| `orbit` | One dashed construction circle rotates | 90s linear, the only loop |
| `print` | Hover lift: translate(-4px,-4px) + hard shadow grows | 180ms |

Reveal is progressive enhancement: content is only hidden when a `js` class is on `<html>` (set before paint), so without JS nothing is ever invisible.

## 6. Components

- **Button:** `primary` (blueprint fill, paper text), `accent` (amber fill, ink text — one per view, the thing to do next), `outline` (ink border), `outline-light` (paper border, for dark bands). Sharp corners. Hover = the `print` lift with a hard ink shadow. Focus = 2px outline in the accent for the surface.
- **SystemCard:** a `sheet` on vellum. Mono header row (organization / domain), name, status badge, serif summary, stack chips, "Read case study" footer. Hover/focus: `print` lift with blueprint shadow **and** the four corner brackets in brass — the v1 selection motif, kept.
- **Title block:** ruled mono table (Sheet, Title, Rev, Drawn) — the page header device.
- **Section header:** mono sheet-section index (`02.1`), section title, optional right-aligned link.
- **Status badge:** mono, bordered, colour = status token; `on-dark` variant uses the dark status values.
- **Hero drawing (`SystemsBlueprint`):** the scale figure at the centre of construction circles, published systems as linked nodes on orthogonal leader lines, a dimension line carrying this platform's real stack.

## 7. Home (Sheet 01)

1. **Blueprint hero** — full bleed. Left: who (name, role), the ledger typing live facts with the numbers in amber, primary actions. Right: the hero drawing. Bottom-right: the title block.
2. **Featured system** — the flagship, as a spread: preview frame + story + stack. The full catalog is `/systems`; home features one and links through.
3. **How I build** — deep band, the four principles as a numbered spec sheet.
4. **Contact** — amber band, one line, one action.

## 8. Login

Unchanged from v1 §5 in behaviour (two steps, generic credential errors, live lock countdown, auto-submit on the 6th digit, neutral session-ended copy); restyled onto v2 surfaces.

## 9. Print

`/cv` prints ink-only: no header, nav, footer, hero, bands, shadows, grid or accent colour. Genuinely a different output for a different job.

## 10. Tailwind mapping

Every token is a named Tailwind colour/font in `tailwind.config.ts` and a CSS custom property in `globals.css` (so data like `Status.colorToken` can bind to it at runtime). No magic hex values in components.
