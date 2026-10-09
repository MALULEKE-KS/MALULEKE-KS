# AI guide — Phase 2 plan: fast, grounded, reasoned, funny on purpose, and unlike any other portfolio guide

**Status:** owner answers recorded 2026-10-09 (§11) — model stays **free for now**, built so that paying for Claude later is a settings change, not a rebuild. Release 1 is next; nothing below is built yet.
**Owner's brief (2026-10-09):** phase 2 is the guide's *logical thinking and system interaction* and its *speed* "throughout the system". It has to be fast, accurate, reliable and must not hallucinate. It needs a sense of humor, and it must **know when humor is right** — "calculated". Recommend what to strengthen and what features would make it outstanding and unique: "the best guide ever for a portfolio".
**Out of the locked V2 spec** — an owner request, logged as D-024 (proposed). The guide's laws do not move: read-only (BR-4.1), drafts never sent (BR-4.2), nothing about the owner that isn't in the site's data, always labelled AI, third person (BR-4.3), every tool behind a flag (BR-4.4), nothing a visitor sends changes what it is (BR-4.6).

---

## 1. Where it stands (read from the code, 2026-10-09 — nothing measured in production yet)

| # | Finding | Why it matters |
|---|---|---|
| 1 | **The whole site rides in every prompt** (`lib/guide/corpus.ts`, budget up to 60,000 tokens: every repo, 400 commits, READMEs, case studies). | Slowest part of a question is reading it. A model must find one fact in a very large block — more room for a wrong or blended answer. Cost scales with it. |
| 2 | **Production runs on free models** (tracker: 2026-10-08 retired id, 503 outages; memory: ~5 requests/minute for the whole team; free tier is `no_training: none` — visitors' messages may be trained on). | One busy minute = "the guide is busy". Reliability, and the privacy of what visitors type, are limited by the model tier, not by our code. |
| 3 | **Fallback happens only on failure** (`providerOptions.gateway.models`). | A model that is alive but slow holds the visitor for up to `maxDuration` (60 s). No first-token deadline. |
| 4 | **Honesty is a prompt rule plus evals that are not in CI** (`tests/ai-evals`, 39 cases; the register still says 30 and "not yet in CI"). | A prompt or corpus change can regress "no hallucination" without anything failing. |
| 5 | **Nothing checks an answer's claims.** Receipts (phase 1) verify *links*; they do not verify a date, a count, a stack item or a status the model wrote. Models are also weak at date arithmetic ("about a year"). | The one failure that costs the owner — a confident wrong fact about him — is caught only by the prompt. |
| 6 | **No telemetry.** No time-to-first-token, no model-used, no fallback rate, no list of questions the site couldn't answer. | We cannot make it faster or smarter than we can measure it; the owner cannot see what visitors want that the site doesn't say. |
| 7 | **Humor is one prompt line** ("when the moment allows"). | It is the model's mood, not a decision: no gravity check, no frequency limit, no eval that it stays silent when someone is stressed or serious. |
| 8 | **Reasoning is one paragraph for every question**; tools are lookups (`search_systems`, `show_*`), none computes anything. | Fit, comparison and "when/how long" questions are done in the model's head, where they are least reliable. |

**What I will not promise:** "never hallucinates" is not a thing any language-model system can honestly claim. What this plan delivers is stronger and checkable: **facts about the owner come from data, not from the model's memory; they are verified after the answer; the failure rate is measured by evals that block shipping; and anything outside the site's data is labelled as general knowledge.** That is the claim the platform can put its name to (EVIDENCE-SPEC).

---

## 2. Targets (set now, measured from P2-0, tuned with real numbers)

| Measure | Target | How it's measured |
|---|---|---|
| Visible response to a send | < 150 ms (trail + character react) | already instant; e2e keeps it so |
| First answer word, p50 / p95 | ≤ 1.5 s / ≤ 4 s | `GuideTurn.firstTokenMs` |
| Complete answer, p50 | ≤ 6 s | `GuideTurn.totalMs` |
| "Instant lane" answers | < 300 ms, no model | same |
| Questions with a fallback hit / "busy" error | < 2 % / < 0.5 % | same |
| Factual claims about the owner not found in the site's data | 0 in the eval set; < 1 % of sampled production answers | evals + verifier log |
| Humor in a serious/distress context | 0 in the eval set | humor evals |

---

## 3. Pillar A — Speed

**A1. Measure first (P2-0).** A `GuideTurn` table (additive migration): time to first token, total time, model used, fallback position, tokens in/out, cache hit, tools run, finish reason, verifier result, `instantLane` yes/no — **metrics only, no IP, no visitor text** (see §9 for question text). Admin → Guide health shows p50/p95, busy rate, model mix and cost per day against the cap. A benchmark script (30 fixed questions) gives a before/after number for every change in this plan.

**A2. Retrieve, then answer (the biggest lever).** Replace "the whole site in every prompt" with:
- a **core brief** that is always in (~3–4k tokens: the owner, the system list as one line each, skills, the claims and what they do/don't prove, contact, pages), plus
- **the records the question needs, fetched by the server before the model is called** — the system(s) named or implied, the page the visitor is on, the skills/years asked about — through the same public views and `searchPublic()`, and
- lookup tools (`get_system`, `get_repo`, `get_case_study`) for anything beyond that, in parallel, one step.
Smaller prompt → faster first token, lower cost per question, and fewer places for a fact to get blended. This is the retrieval step ROADMAP-V2 §3 already specified (it names `ContentChunk`); the trigger there was corpus *size*, this plan's trigger is speed and accuracy — the roadmap entry is updated in the same PR. Postgres full-text search first; embeddings only if evals show recall gaps (no new library without a use).

**A3. The instant lane.** Questions that are pure data — how to contact him, the CV, how many systems/repos, what's new, the platform pulse, "what is the status of X" — are recognised by a deterministic router and answered from the public views with a card and one templated sentence: no model, no cost, no hallucination, under 300 ms, and it still works when every model is busy. Anything ambiguous goes to the model.

**A4. First-token deadline (off on the free tier).** If the primary model hasn't produced a token within a deadline (`concierge.firstTokenDeadlineMs`), the next model starts in parallel and the first to speak wins; the loser is aborted. Racing two calls **doubles the requests against the free models' ~5-per-minute team limit**, so it ships **off (0)** and is switched on in settings when the owner moves to a paid model. On the free tier the equivalent is a *sequential* deadline: give up on a silent model after the deadline and move to the next one, instead of waiting out `maxDuration`. *To verify first:* whether the installed AI SDK / gateway provider options already expose a per-provider timeout (read `node_modules/ai/docs/` before writing any of it).

**A5. Caching and warmth.** Prompt caching only works on models that support it; with a paid Anthropic model the static instructions + core brief are cached (the code already marks it). A tiny `GET /api/v1/guide/warm` fired when the guide section opens primes the corpus memo and the model list so the first question isn't cold.

**A6. Fewer round trips.** Parallel tool calls; step cap lowered from 4 to 3 once retrieval removes the search-then-read loop; answers lead with the conclusion (already in the prompt) so streaming starts with substance.

---

## 4. Pillar B — Accuracy that is built in, then checked, then measured

**B1. Computed facts, not recalled facts.** The corpus gains server-computed phrases beside every raw date: *"last push 3 days ago (2026-10-06)"*, *"building since 2025 — about 1 year, 9 months"*, *"expected graduation 2027 — in 14 months"*. The model quotes them; it never subtracts dates. Counts ("12 systems", "5 private") are computed the same way. Tested against a fixed clock.

**B2. The verifier (deterministic, no model).** After an answer finishes, `lib/guide/verify.ts` extracts the checkable claims — numbers, years/dates, system names, technologies, statuses, URLs/paths — and checks each against the retrieved records and the public views. Result streamed as message metadata:
- all clear → "Checked against the site: 7 facts ✓" in the *How this answer was made* drawer;
- something not found → an amber note under the answer ("Couldn't verify: *Kubernetes* — not in his published stack") and a row in the quality log; for a stack/employer/credential claim the answer is also flagged for the owner's review.
It can't silently rewrite a streamed answer, but it never lets an unchecked claim look checked. Over time the log tells us exactly which prompts to fix.

**B3. Knows what it doesn't know — and tells the owner.** Every "that's not on the site" answer writes a **gap** (category + scrubbed question, see §9) to Admin → Guide health: "12 people asked about his certifications abroad". The owner closes the gap by adding content (data, EXT-1) and the guide improves without a code change. This turns the guide into a feedback loop for the portfolio itself.

**B4. Evals become a gate (P2-1).** Grow from 39 to ~120 cases: hallucination traps (a system that doesn't exist, a tech he never used, GPA, salary, a date), numeric/date accuracy, citation accuracy, injection through README and commit text, multilingual, tool choice, and the humor cases in §6. Run on every change to the prompt, corpus, tools or model setting (CI job with a pinned judge and pace), plus a **daily canary** of ten questions against production that raises a flag on the Guide health page. The latest result is shown publicly as a claim with its evidence (EVIDENCE-SPEC): *"Tested against N hard questions, last run <date>, N passed"* — written by the job, never by hand.

**B5. The model — free now, paid later with no rebuild (owner, 2026-10-09).** Staying on the free models means the guide must be fast and right *within* their limits: ~5 requests a minute for the whole site, no prompt caching, weaker tool use. That raises the value of everything that avoids a model call or shrinks the prompt — the **instant lane** (A3, costs no request), **retrieval** (A2), computed facts (B1) and the verifier (B2, no model). The free tier's other limit — free-tier models may train on what visitors type — is stated plainly in the *How this answer was made* drawer and the privacy sentence.

*Model-agnostic by design — "paying for Claude" is a settings change:*
- the model, fallbacks, reasoning allowance, answer length, first-token deadline and (later) the stronger-model tier are all `concierge.*` settings (Admin → Settings); no model id appears in code;
- provider-specific options (prompt caching for Anthropic) are applied **by provider prefix of the configured id**, and are inert for other providers — so the same code path serves a free model today and Claude tomorrow;
- `concierge.model.reasoning` (empty = use the main model) is the optional router tier for Fit Check/comparisons — unset means nothing changes;
- the **acceptance test for any switch is the eval suite**: change the setting, run the evals against the new id, ship if green (§4 B4) — the same gate that protects every other change;
- structured outputs (Fit Check's requirement extraction) are schema-validated with one retry and fall back to a deterministic parse, so a weaker model degrades gracefully instead of failing.

---

## 5. Pillar C — Logical thinking

**C1. Question types with playbooks.** A small router classifies each turn (hiring/fit, technical depth, "how was X built", comparison, timeline, general knowledge, small talk, adversarial). Each type has a short playbook injected for that turn only (what to open with, which records to read, how to structure the answer). The standing prompt gets shorter; behaviour gets sharper. Classification is deterministic first (intent lexicon, tested); the model is only asked when it's unclear.

**C2. Tools that compute (the logic moves into code).** Server-side, read-only, flagged (BR-4.4), results rebuilt server-side (BR-4.6):
- `compare_systems(a, b)` — stack overlap, status, stage, activity, what each proves;
- `evidence_for(skill | requirement)` — systems, roles and study behind it, from `getSkillEvidence()`;
- `timeline_between(from, to)` / durations — exact arithmetic;
- `fit_check(requirements[])` — see D1.
The model chooses and narrates; the overlap, counts and gaps are computed, so they are repeatable and testable.

**C3. Conversation memory without storing people.** A server-built *visitor brief* from the visitor's own words in this conversation (role: recruiter / engineer / student; goal; what they've seen) travels with the turn — never stored, never from tool results. Next steps and tone follow it ("you asked about full-stack AI roles earlier — Governova is the strongest evidence").

---

## 6. Pillar E — A humor governor ("calculated", not random)

> **Humor is a decision the server makes, then the model carries out.** The model is never trusted to decide on its own when a joke is appropriate.

**Inputs (all deterministic, unit-tested):**

| Signal | Effect |
|---|---|
| **Gravity** of the topic — hiring decision, rejection, money/rates, legal, medical, security incident, complaint, mistake or failure the visitor is upset about, distress words | → **off**, and a "steady" register |
| **Visitor register** — casual wording, emoji, "lol", a joke, play, a riddle/poem/fun-fact request | → raises one step |
| **Answer type** — facts, fit, numbers → low; greeting, small talk, general-knowledge fun, a limit/"resting" message → higher | ± one step |
| **Turn position and history** — not the very first answer unless the visitor opens playfully; at most one humorous beat in three answers unless the visitor keeps leading | frequency cap |
| **Owner setting** `concierge.humor` = off / dry / playful (default *dry*) | the ceiling |

**Output:** `humor: off | dry | playful`, injected as a per-turn system line after the cached part (built by the route, never visitor text) with fixed rules: *one line at most; after the substance, never instead of it; never carries or bends a fact; never at the visitor's expense, the owner's weaknesses, or named people/companies; never about identity, religion, politics, health; in the visitor's language.*

**The guide can say so.** In a serious moment it stays steady and may say it ("Let me keep this one straight"); when the room is light it plays. The character follows: a `tone` value rides the stream and the rig eases into a warm or a composed expression (the rig has moods today — idle/attentive/thinking/speaking — so a small expression blend is the one rig addition; if the art doesn't support it, tone shows as the stage's caption only).

**Evals (≥ 12):** distress → no joke; legal/hiring-decision → none; formal recruiter → at most dry; riddle/poem → playful ok; "roast him" → warm deflection, no jab; repeated jokes → within the cap; a joke never contains a fact absent from the knowledge.

---

## 7. Pillar D — Standout features (what makes it the best portfolio guide)

| Rank | Feature | What the visitor sees | Why nobody else has it |
|---|---|---|---|
| **1** | **Fit Check** | Paste a job description or pick a role → a card listing each requirement as **✓ evidenced** (with the systems/roles that prove it, linked), **◐ partial**, or **○ not evidenced yet** (honestly, with what he's learning), then "Draft a message to him". No percentage score, no hype. | Portfolios sell; this one shows its gaps — and that honesty is the pitch. Built on `getSkillEvidence()` + the claims register, computed in code. |
| **2** | **Guided tour** (drives the real site) | "Show me his strongest work" → the guide opens a page, scrolls to a section, **spotlights** the element, narrates in one line while the character points, with Next / Skip / Ask-about-this. Persona tours: recruiter 90 s, engineer 3 min. Targets are an allowlist of `data-guide-target` anchors; read-only. | The guide *operates the site* instead of describing it. |
| **3** | **Receipts that argue back** | "Challenge this": the visitor pushes on any claim and the guide shows the claim, what it proves, **what it does not prove**, and the open evidence (from the evidence register). | An AI that cites its own limits is the most trustworthy thing on a portfolio. |
| **4** | **Public proof of reliability** | The eval scoreboard (B4) and a *How this answer was made* drawer on every answer: model, sources, checks run, time. | Turns "trust me, it's accurate" into something inspectable. |
| **5** | **Page-aware & everywhere** | On `/systems/x` it already knows "this"; add page-specific openers, **Ask the guide in ⌘K**, and an "Ask about this" on cards. | Smoothness; the guide is part of navigation, not a widget. |
| **6** | **Voice (optional, 2b)** | Speak the answer with the browser's speech synthesis, lip-synced by the existing `speak()` rig; voice input where the browser supports it. Free, no new library. | The character already moves its mouth — this lets it use it. Browser support on phones varies, hence optional. |
| **7** | **Compare** | Two systems side by side (stack overlap, status, activity, what each proves). | Falls out of C2 almost free. |

Rule cards ("BR-1.1 → enforced in …") stay deferred until the enforcement register is data (phase-1 note).

---

## 8. Cost (to be measured in P2-0 before any switch; figures below are earlier measurements, not today's)

- Recorded 2026-10-01: guide context ≈ 7.2k tokens per question → Claude Haiku 4.5 ≈ **$0.0135 per question**, about half with prompt caching.
- Today's corpus is larger than then (all repos, commits, READMEs), so today's uncached cost per question is **higher than that figure**; retrieval (A2) is expected to bring it well below it. The real number comes from `GuideTurn` token counts, in dollars, on the Guide health page.
- Spend is bounded by what already exists and stays: `concierge.dailyMessageCap` (a hard stop, today 500/day), the per-visitor limit, `maxAnswerTokens`. The Fit Check and any stronger-model route get their **own** daily cap setting.
- **On the free models the cost is $0**; the limits are rate and reliability, not money. The owner does all billing; when the move to Claude comes, I quote the measured per-question cost and worst-day figure from the Guide health page first, then it is a settings change (B5).

---

## 9. Privacy, data and rules (what changes in the database)

- Additive migrations only: `GuideTurn` (metrics), `GuideGap` (unanswered questions), `GuideFeedback` (👍/👎 + "this was wrong"), `GuideEvalRun` (job results behind the public scoreboard). Each with RLS/roles like the existing tables, audit triggers, a capability-map entry + contract + generated guides (capability coverage), and an ENFORCEMENT-REGISTER row.
- **Question text** is the sensitive part. Proposal: store a question **only when the guide couldn't answer it or the visitor marked it wrong**, with emails/phone numbers scrubbed, kept `concierge.logRetentionDays` (default 30; 0 = never store text, metrics only), and a plain sentence on the privacy page. Metrics never include IP or identifiers. (Owner decision, §10.)
- New settings (nothing hardcoded): `concierge.humor`, `concierge.firstTokenDeadlineMs`, `concierge.logRetentionDays`, `concierge.fitCheck.dailyCap`, `concierge.instantLane` toggle. Every new tool/feature ships behind a `Flag` (BR-4.4) — Fit Check, tour, compare, instant lane, voice each separately.
- BR-4.3/4.6 rows extended: the verifier and the instant lane are enforcement for "grounded in the site's data".

---

## 10. Build order (three verified releases, batched against the deploy limits)

**Release 1 — Measure, speed, safety net**
1. **P2-0** Telemetry + Guide health + benchmark script (baseline before any change).
2. **P2-1** Eval upgrade (~120 cases), CI gate, daily canary, register corrected.
3. **P2-2** Speed core: computed facts (B1) → retrieve-then-answer (A2) → instant lane (A3) → first-token deadline (A4) → warm path (A5). Re-run the benchmark; report before/after.

**Release 2 — Accuracy, humor, logic**
4. **P2-3** Verifier + gap log + "How this answer was made" (B2, B3).
5. **P2-4** Humor governor + tone to the character + humor evals (§6).
6. **P2-5** Question playbooks + `compare_systems` / `evidence_for` / `timeline_between` + **Fit Check** (C1, C2, D1).

**Release 3 — Interaction and trust surface**
7. **P2-6** Guided tour + spotlight anchors + page-aware openers + ⌘K ask.
8. **P2-7** Feedback, public scoreboard, challenge-a-claim.
9. **P2-8 (optional)** Voice.

Each step: phone first (`tests/e2e/mobile.spec.ts` at 360/390), a11y/axe, no new library without a use, unit + integration tests, evals green, and the docs in the same PR (PUBLIC-REDESIGN-PLAN §3a, ENFORCEMENT-REGISTER, capability map + guides, ROADMAP-V2 log, DECISIONS D-024, TRACKER handoff).

---

## 11. Decisions (owner, 2026-10-09)

1. **Model and budget — stay on the free models for now; paying for Claude later must not need a rebuild** ("it shouldn't require rebuilt but it should work as it is required"). → B5: model-agnostic by design; hedging and the stronger-model tier ship off.
2. **Unanswered questions logged — yes**, scrubbed, kept 30 days (`concierge.logRetentionDays`, 0 = metrics only), with a sentence on the privacy page.
3. **Public eval scoreboard — yes**, written by the test job, never by hand.
4. **Voice — later**, as the optional last step (P2-8).
5. **Release 1 scope** — as §10 (not objected to; ordered measure → evals → speed so every change has a before/after).
