# AI guide — Phase 1 plan: one console, visible grounding, live cards, the character at work

**Status:** approved by the owner 2026-10-08 (card tools ship **on**; the four "what it does" cards dropped; phone and desktop each designed for themselves) — built the same day.
**Owner's brief (2026-10-08):** the guide "doesn't impress me, it's so basic and normal". Start with visual, UI/UX and structure. Chosen: **A** one console in place, **B** live answer cards, **C + D** working trail and receipts, **E** the character as its body — *and the character must stay visible while the AI is working*.
**Out of the locked V2 spec** — an owner request, logged as D-023. The guide's laws stay exactly as they are: read-only (BR-4.1), drafts never sent (BR-4.2), nothing about the owner that isn't in the site's data, always labelled AI, third person (BR-4.3), every tool behind a flag (BR-4.4), nothing a visitor sends changes what it is (BR-4.6).

---

## 1. What's wrong today (seen on the live site)

1. It **tells** instead of **shows**: four text cards claim "Grounded in live data", "Shows its sources"… while the chat itself is a grey bubble of plain text.
2. **Three steps and two places**: collapsed bar → expanded brochure → the conversation opens in a *separate* side panel.
3. **Flat answers**: a system is described in a sentence instead of shown — status, stack, last commit are all one query away.
4. **Invisible work**: searches and page reads collapse into one orb with a label; the steps that prove it are hidden.
5. **A body that isn't there**: the hero character doesn't know the chat exists; in the chat it's a 32 px face.

## 2. The idea in one line

> The home section **is** the guide: the character on one side, *visibly working* — thinking, searching, speaking — and the conversation on the other, where every answer arrives with **the records it used** and **live cards of the real thing**.

## 3. Structure — one conversation, two surfaces

- **One chat state for the whole site.** Today `useChat` lives inside `GuidePanel`. It moves up into a `GuideChatProvider` (inside the existing `GuideProvider`), so the home console and the docked panel on other pages are two views of **the same conversation** — start on the home page, keep talking on /systems.
- **One console component, two sizes.** `components/guide/console/` — the panel and the home section both render it:

```
components/guide/console/
  GuideConsole.tsx      layout shell: stage (character) + conversation; "inline" (home) and "panel" (elsewhere) modes
  GuideStage.tsx        the character's bust + what it's doing right now (E)
  Conversation.tsx      messages, scroll anchoring, announcements (a11y)
  AnswerMessage.tsx     one answer: trail → text → cards → receipts
  WorkingTrail.tsx      the real steps (C)
  Receipts.tsx          the records an answer used (D)
  cards/SystemCard.tsx, cards/JourneyCard.tsx, cards/SkillCard.tsx, cards/PulseCard.tsx   (B)
  Composer.tsx          input, send/stop, character count, starters
hooks/useGuideChat.ts   the shared chat (provider + hook)
lib/guide/receipts.ts   site links in an answer → resolved records (pure, unit-tested)
lib/guide/cards.ts      tool outputs → card props (pure, unit-tested)
```

- `GuidePanel.tsx` (532 lines) and `AiGuideExpanded.tsx` are **replaced** by the console; the panel keeps its sheet/dialog behaviour (focus trap, Escape, bottom sheet on phones) as a thin wrapper.

## 4. A — One console, in place (home)

No brochure and no separate panel on the home page. *(Amended by the owner the same day: the section stays a collapsible bar, closed by default, so visitors who didn't come for the AI scroll freely; opening it or asking unfolds this console in place.)*

**Desktop (≥ lg):**
```
┌──────────────────────────── The AI guide · AI ───────────────────────────────┐
│  ┌──────────────┐   ┌──────────────────────────────────────────────────────┐ │
│  │              │   │ Hi — I'm Kurhula's AI guide…                         │ │
│  │  CHARACTER   │   │ [I'm hiring] [I have a project] [I'm an engineer]    │ │
│  │  (bust, live │   │                                                      │ │
│  │   rig)       │   │ ▸ Searched systems — "AI" · 3 found                  │ │
│  │              │   │ ▸ Read Governova                                     │ │
│  │  ● Thinking… │   │ Answer text…                                         │ │
│  │  "Searching  │   │ ┌SystemCard┐ ┌SystemCard┐                            │ │
│  │   systems"   │   │ Receipts: [Governova] [Journey 2025] [About#skills]  │ │
│  └──────────────┘   │ ┌──────────────────────────────── Ask… ──── ➤ ┐     │ │
│                     └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```
**Phone (designed for the phone, not squeezed):**
```
┌────────────────────────────┐
│ ◖bust◗ Kurhula's AI guide  │  ← sticky header: the character's bust stays
│        ● Searching systems │    visible while it works, whatever you scroll
├────────────────────────────┤
│ conversation (fills)       │
│ cards: horizontal snap row │
│ receipts: wrap             │
├────────────────────────────┤
│ [ Ask…               ➤ ]   │  ← composer pinned to the bottom, thumb reach
└────────────────────────────┘
```
- The section's height is fixed (about one screen) with the conversation scrolling inside, so the page doesn't jump as answers stream. **"Full screen"** opens the same conversation as a sheet (phones) or a wide dialog.
- The four "what it does" text cards go — the console *demonstrates* each one. The admin-edited `ai-guide` copy keeps the heading and one line.
- Other pages: the docked launcher opens the same console as today's panel/sheet, now with the bust and the same answer anatomy.

## 5. C — The working trail (real steps, never timed)

Built from the message's real parts as they stream (`reasoning`, `tool-search_systems`, `tool-open_page`, the new `tool-show_*`), each with its state:

| Part | Running | Done (expandable) |
|---|---|---|
| reasoning | "Thinking…" | "Thought for 4 s" |
| search_systems | "Searching — "AI"" | "Searched "AI" · 3 found" → the 3 results as links |
| show_systems / show_journey / show_skills | "Looking up Governova" | "Read Governova" → the card below |
| open_page | "Opening /systems" | "Opened /systems" |
| draft_inquiry | "Drafting your message" | "Drafted — review it in the form" |

No step exists unless the part exists; nothing cycles on a timer. Collapsed to one line once the answer finishes; tap to expand.

## 6. D — Receipts (the records each answer used)

Every site link in an answer (`/systems/governova`, `/journey#entry-…`, `/about#skills`) plus every tool output becomes a **receipt chip** under the answer, resolved against **the public API** (the same data the pages show):
- a link that doesn't resolve to a real record is **not** shown as a receipt (and is logged as a guide evals failure);
- each chip opens the page (or the section), with the record's real title and kind icon;
- "Sources: none" is said honestly when an answer used none.

`lib/guide/receipts.ts` is pure and unit-tested (parse → dedupe → resolve).

## 7. B — Live answer cards (from data, never from the model's words)

New **read-only, server-executed** tools — the model only chooses *which* records; the card content comes from the public views, so it can't be invented:

| Tool (flag, ships **off** per BR-4.4) | Input | Reads | Card |
|---|---|---|---|
| `show_systems` (`guide.tool.showSystems`) | 1–4 slugs | `PublicSystem` + skills + activity | name, status dot, real tech marks, last commit date, private badge, "Open" |
| `show_journey` (`guide.tool.showJourney`) | 1–6 entry ids | `PublicTimeline` (via `lib/queries/journey.ts`) | compact timeline |
| `show_skills` (`guide.tool.showSkills`) | 1–8 skill names | `getSkillEvidence()` (`lib/queries/evidence.ts`) | skill + the systems that prove it |
| `show_pulse` (`guide.tool.showPulse`) | — | `PublicPlatformPulse` (rules enforced by the database, audited changes) | "this site, right now" stat card |

- An unknown slug/key returns nothing for it (the card isn't drawn). Outputs are rebuilt server-side; the browser never supplies card data (BR-4.6, as `search_systems` today).
- Capability map, contract and generated guides updated in the same PR (capability coverage).
- **Rule cards** ("BR-1.1 → enforced in …") need the enforcement register as data — not in this phase; logged for later.

## 8. E — The character as its body (and visible while it works)

- **GuideStage**: the existing WebGL rig (`GuideCharacter`), cropped to a bust in a rounded stage with the ember field. A second rig instance; it renders only while on screen (as today). Reduced motion: the still image.
- **States wired to the conversation** (the rig already supports each): composing → *attentive*, eyes on the composer; request sent → *thinking* (eyes up, the orb behind it); tool running → *thinking* + the step label under the bust ("Searching systems"); streaming → *speaking*, the mouth following the streamed text (`speak()`); done → *idle*, looks back at the visitor.
- **Always visible while working**: desktop — the stage sits beside the conversation; phone — the bust lives in the console's sticky header; on other pages — the panel's header carries the bust. While an answer is in progress and the console is scrolled out of view on the home page, a small floating bust ("Still answering…") appears bottom-right and brings you back.
- The hero character also reacts: while the guide is working, it glances toward the console section.

## 9. Quality bar (checked before shipping)

- **Phone first**: 360 and 390 px in `tests/e2e/mobile.spec.ts` (console fits, composer reachable, cards scroll horizontally, no page overflow); the owner checks on a real phone.
- **A11y**: the console is a labelled region; answers announced politely when finished; the trail is a list with real states; receipts are links; axe passes.
- **Performance**: console JS loaded on first view of the section; no new libraries; two rigs never render off screen; first-view weight not increased.
- **Honesty tests**: unit — receipts never resolve to a missing record; cards built only from tool outputs; trail only from parts. Integration — each `show_*` tool reads the public views only and drops unknown keys. AI evals — the existing 39 plus "cards match the text" checks.
- **Docs in the same PR**: PUBLIC-REDESIGN-PLAN §3a, ENFORCEMENT-REGISTER (BR-4.x rows for the new tools), capability map + guides, ROADMAP-V2 log, DECISIONS D-023, TRACKER handoff.

## 10. Build order (one verified batch)

1. Shared chat provider + console shell (A), panel rebuilt on it — behaviour unchanged.
2. Working trail + receipts (C, D) — from today's parts and links.
3. `show_*` tools + cards (B), flags off; integration tests.
4. GuideStage + state wiring + floating bust (E).
5. Home section replaced by the inline console; phone pass; docs; full test run; ship.

## 11. Decisions for the owner

1. **The new card tools ship off** (BR-4.4). Switch them on yourself in Admin → Flags after seeing them — or tell me to enable them in the same release.
2. **The four "what it does" cards go** from the home section (the console shows each one instead). OK?
3. **Later phases (not now):** a better model than the free one (cost per question is in the AI Gateway note), role-tailored openers (F), "Ask the guide" in ⌘K search (G), rule cards once rules are data.
