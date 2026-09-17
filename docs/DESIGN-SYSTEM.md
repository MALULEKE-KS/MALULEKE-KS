# MALULEKE-KS — DESIGN SYSTEM v1.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md, PLATFORM-OVERVIEW-AND-RATIONALE.md (voice & tone, mission)
**Status:** Locked

---

## 0. Grounding

This isn't a generic "developer portfolio" template. The subject is a specific one: a systems architect who governs his own work through numbered, citable rules — the same rules this platform is built from. The visual identity should read like an engineering document, not a marketing page: precise, structural, restrained, with exactly one considered accent rather than decoration.

Deliberately avoided, because they're the current tells of AI-generated design rather than choices for this brief: warm-cream background with a terracotta accent; near-black background with a neon accent; the SaaS rounded-card grid with a soft drop shadow under everything; tracked-out all-caps eyebrow labels; middle-dot-joined meta strings; em-dash "word — fragment" labels; arrows appended to every button.

## 1. Color

Every value below was checked against WCAG contrast ratios as text on `paper` — not assumed. Two values in the original draft failed and are corrected here.

| Token | Hex | Role | Contrast on paper |
|---|---|---|---|
| `ink` | `#0F1729` | Primary text, header backgrounds | 16.65:1 — AAA |
| `paper` | `#F5F7FA` | Base surface | — |
| `slate` | `#3D4A5C` | Secondary text, borders, dividers | 8.39:1 — AAA |
| `accent` (brass) | `#906722` | The one considered accent — flagship markers, active states, the numbers moment | 4.72:1 — AA. *Corrected from an earlier `#C08A2E`, which measured 2.83:1 and failed AA entirely as text* |
| `signal-finished` | `#1F6F5C` | `Status = finished` | 5.61:1 — AA |
| `signal-progress` | `#906722` | `Status = in_progress` — same as accent | 4.72:1 — AA |
| `signal-planned` | `#5A6470` | `Status = planned` | 5.60:1 — AA. *Corrected from `#6B7684`, which measured 4.30:1 and narrowly failed AA-normal* |
| `critical` | `#9B3A2E` | Errors, lockout states | 6.44:1 — AA |

Status colors remain load-bearing, not decorative: the color on a `StatusBadge` is the actual `Status` value, never a separate stylistic choice layered on top.

## 2. Type

Built on the IBM Plex superfamily — chosen because it was designed by an engineering company specifically to read as rational and technical, which is the actual brief, not an aesthetic borrowed from an unrelated context.

| Role | Face | Usage |
|---|---|---|
| Headline / UI | **IBM Plex Sans** | Nav, headings, buttons, form labels — confident, technical |
| Long-form body | **IBM Plex Serif** | Case studies, the Journey narrative, About — same superfamily, clearly distinct register, readable at length |
| Functional / data | **IBM Plex Mono** | Rule citations (`BR-1.1`), system IDs, timestamps, status labels — genuinely functional here, not decorative, because these are literal identifiers from the platform's own rule system |

Line length under 80 characters on body copy. No all-caps labels anywhere — sentence case throughout, including nav and buttons.

## 3. Layout

Left-aligned, not centered — a drafting-table reading order, not a marketing-page one. A narrow annotation column on wide viewports carries rule citations and metadata as literal margin notes (collapses to inline badges under 768px).

```
┌─────────────────────────────────────────────┬──────────┐
│  MALULEKE-KS              Systems  Journey…  │          │
├─────────────────────────────────────────────┤ margin   │
│                                               │ column:  │
│  4 systems. 2 shipped.                       │ rule     │
│  1 constitution governing all of them.       │ cites,   │
│                                               │ status   │
│  [ the actual hero — a real, literal fact,   │ refs     │
│    not a stock headline+gradient treatment ] │          │
├─────────────────────────────────────────────┤          │
│  ── Xkimm Xa Mali ──────────────  [finished] │  BR-1.1  │
│  ── Sunduza ─────────────────────  [finished]│          │
│  ── FundsLink-Academy ──────────  [progress] │          │
├─────────────────────────────────────────────┴──────────┤
```

Section dividers are hairline rules with a left border-accent bar, not rounded cards with drop shadows. Numbered sequence markers (01, 02, 03) are used exactly twice on the whole site — the Build Phases (0→3) and rule citations — because that content genuinely is a sequence; nowhere else.

Motion: one deliberate moment on the homepage — the hero fact "types out" once on load, like a line being logged, then stops. No hover-fade-in on every card, no scroll-triggered reveal per section.

## 4. Principles

1. **Every visual device encodes real information.** Status color is the actual `Status`. Mono type marks actual identifiers. A margin annotation is an actual rule citation. Nothing is decoration wearing the costume of data.
2. **One accent, spent deliberately.** Brass appears on flagship markers, active states, and the numbers section — nowhere else. Restraint is the signature, not a missing feature.
3. **The structure reads like a spec, not a pitch.** Margins for annotation, hairlines for division, left alignment throughout — the same discipline the platform applies to its own rules applies to how it looks.
4. **Errors and empty states speak plainly.** Per the interface's own voice: what happened, what to do next, no apology, never vague.

## 5. Login Flow

Two steps, matching BR-3.1 through BR-3.3 exactly — this is the one screen where the design has to be as precise as the rule it implements.

**Step 1 — Credentials**
```
┌──────────────────────────────┐
│  MALULEKE-KS                 │
│  Admin                       │
│                               │
│  Email                       │
│  [______________________]    │
│  Password                    │
│  [______________________]    │
│                               │
│  [        Continue        ]  │
└──────────────────────────────┘
```
- Generic failure copy on invalid credentials: "Email or password is incorrect." Never states which field was wrong.
- After 2 consecutive failures: append "2 attempts remaining before a temporary lock." — the interface stating a fact, not a warning tone.
- On the lock itself (BR-3.2): "Too many attempts. Try again in 14 minutes." — a live countdown, not a static message.

**Step 2 — Verification**
```
┌──────────────────────────────┐
│  Enter your 6-digit code     │
│  [ _ ][ _ ][ _ ][ _ ][ _ ][ _]│
│                               │
│  Use a recovery code instead  │
└──────────────────────────────┘
```
- Auto-submits on the 6th digit — no separate "verify" click.
- "Use a recovery code instead" swaps the six single-digit boxes for one text field accepting a recovery code, consuming it on success (one-time use, per the schema).

**Session end (BR-3.3)**
- At 25 minutes idle: a toast — "Session ending in 5 minutes." Dismissing it or any activity resets the timer.
- At 30 minutes: redirect to `/admin/login` with a neutral message — "Session ended for inactivity." — not styled as an error; nothing went wrong.

## 6. Tailwind mapping

See `tailwind.config.ts` — every token above is a named Tailwind color/font, not a magic hex value scattered through components.

## 7. Signature Interaction Layer — Tailwind and custom CSS, doing what each is best at

**The rule this section follows:** Tailwind owns composition — spacing, layout, responsive breakpoints, and any interaction expressible as discrete utility states (hover, focus, group-hover). Custom CSS owns the two things utilities genuinely can't do well — sequenced, timed animation, and print output — plus the small signature details (caret, selection color, scrollbar) that never come from a class name. Neither tool is asked to do the other's job.

### The signature moment — the ledger hero

Per the frontend-design discipline of spending boldness in exactly one place: the homepage hero doesn't open with a headline-plus-gradient treatment. It opens as a literal audit-log entry writing itself — because that's genuinely what this platform's own `ActivityLog` and audit-trail language already are, not a borrowed visual trope. Real facts type out line by line with a blinking monospace caret, then stop. One orchestrated sequence, once, on load — not a per-section scroll effect.

The three lines are deliberately a blend of **Kurhula's own journey** and **the system's journey**, kept at aggregate-fact level — never a named list of individual systems, which is already the job of the systems grid directly below the hero, `/systems`, and `/journey`. All three numbers are computed server-side from live data (years active from the earliest `Experience`/`Organization` record, organizations founded, systems shipped/queued from `Status`), never hardcoded copy:

```
1 year building. 2 organizations founded.
2 systems shipped. Several more queued.
Engineered in South Africa, held to a global standard.
```

(Line 3 is the closing half of the locked mission statement — Overview §10 — reused verbatim, not new copy.)

Built in React (`components/home/LedgerHero.tsx`) with a small `useTypewriterLines` hook, not pure CSS keyframes — sequencing, real data, and `prefers-reduced-motion` all need to be checked and controlled in code to stay reliable and accessible. The caret blink itself is custom CSS (`globals.css`), since a blinking cursor is a visual detail CSS handles natively and JS shouldn't be timing.

#### The scale figure

A real-world reference, not an invented gimmick: architectural and engineering drawings place a human silhouette — a "scale figure" — into a technical drawing to give it human scale and presence. `components/home/ScaleFigure.tsx` renders exactly that: a simple, unfilled line-art human outline, ink-colored stroke only, positioned in the hero's margin column. As the three ledger lines type out, the figure draws itself in — a single continuous stroke reveal via SVG `stroke-dasharray`/`stroke-dashoffset`, timed to finish exactly as the third line finishes — so the reader's own presence in the system is being drafted at the same pace the facts about them are being logged. This is the visual answer to "a real person evolving": not a cartoon mascot animating through poses, but the reader's own outline being drawn into an engineering document, once, the same way every other fact on this page is being logged rather than decorated.

Mechanics: the draw duration is computed in `LedgerHero.tsx` from the same total-typing-time `useTypewriterLines` already calculates (so the two are never out of sync even if line lengths change), passed to `ScaleFigure` as a CSS custom property (`--draw-duration`), with the actual `stroke-dashoffset` transition living in `globals.css` — same Tailwind/custom-CSS split as the caret (§7 intro): JS owns timing and correctness, CSS owns the timed visual effect itself. `prefers-reduced-motion: reduce` renders the figure fully drawn and static immediately, identically to how the typewriter itself degrades (§ ledger hero above) — the figure is decorative reinforcement of the text, never load-bearing for comprehension, and is `aria-hidden`.

### The corner-bracket selection state

Every `SystemCard` uses a CAD/drafting-tool selection indicator on hover and keyboard focus — four corner brackets appearing at the element's edges — instead of the generic rounded-card-plus-shadow lift this design system already ruled out in §0. This is pure Tailwind: four absolutely positioned corner elements, `opacity-0` to `group-hover:opacity-100` / `group-focus-within:opacity-100`, no custom CSS required. It's the right tool for a discrete two-state interaction.

### Print stylesheet

`/cv` needs a working print/PDF output (Constitution §9 — continuity fallback). This is a pure custom-CSS concern — a `@media print` block in `globals.css` that strips navigation, the ledger hero, and all brass accent color (print in ink-only), and resets the page to a plain, dense CV layout. Tailwind's utility model has no equivalent for print-specific cascades this targeted.

