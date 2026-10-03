# MALULEKE-KS — PUBLIC SITE REDESIGN PLAN (F5c)

**Status:** approved by the owner 2026-09-30 ("I approve all … lock them in"). Governs the full page-by-page redesign of the public site. Where it changes a page, `PAGE-SPECIFICATIONS.md` is updated in the same PR; where it changes the look, `DESIGN-SYSTEM.md` wins on tokens and type.
**Order:** home first (the biggest effort), then header + footer, then every other page. Built locally on one branch; **nothing is pushed until the owner says it is ready.**

---

## 1. Locked decisions

| # | Decision | Source |
|---|---|---|
| D1 | **The site is the proof.** Its signature is live data from the platform itself — not claims. Every number, list and label on a public page comes from the database or a sourced system (GitHub, Vercel, CI); nothing is typed into a component. | Owner 2026-09-30; CLAUDE.md "nothing hardcoded" |
| D2 | **Every database capability is represented on the frontend** — a public capability with no page/section that uses it is a failing test, the same way an undocumented table already is (extends `capability-coverage.test.ts`). | Owner 2026-09-30 |
| D3 | **Each page gets its own structure** — no shared "dark banner + pill + title" template. | Recommendation B |
| D4 | **Hero leads with positioning, numbers become the ledger beneath it.** | Recommendation C |
| D5 | **Animated likeness of the owner on the home page** — a high-quality animated anime-style character, generated from the owner's own portrait; approved image assets only. | Owner 2026-09-18/30 |
| D6 | **About carries the owner's real photo** (`portrait.png` from `my-nextjs-portfolio`). | Owner 2026-09-30 |
| D7 | **Motion with purpose** — counters, the system map, hovers, the character. No blanket fade-in on scroll; content is visible without JavaScript. | Recommendation D |
| D8 | **Compact consent bar**, not a large card over content. | Recommendation E |
| D9 | **Components from Magic UI and 21st.dev first** (browsed on their sites, code copied), converted to the design tokens and IBM Plex — then shadcn/ui, then our own. Figma for layout decisions before code. | Owner 2026-09-30; CLAUDE.md component order |
| D10 | **Header:** Systems · Journey · CV · Method · About · Search · **Let's talk** (the only contact entry — the separate "Contact" link is removed; /contact stays as the page Let's talk opens). | Owner 2026-09-30 |
| D11 | **Footer does not repeat the header.** It carries what the header can't: the GitHub homes, the review promise and *Start a conversation* (→ /contact), a live platform status line with the version ("V1 · V2 on the way", the `release` block), public social links, privacy choices. **Amended 2026-10-02** (V2 spec WP-105, D-006): no raw email or WhatsApp number on every page — /contact keeps them — and no typed-in "Built on …" stack (the platform's own case study shows its stack, from data). | Owner 2026-09-30; amended 2026-10-02 |
| D12 | **Three GitHub homes** — MALULEKE-KS (personal), KSDRILL-SA, GrowthCore-Solutions — are first-class: each has its systems, and any repo in any of them can become a system. | Owner 2026-09-30 |
| D13 | **Titles and qualifications are data, many and dated** — "Software & AI Engineer" together with "Final-year BSc Computer Science & Mathematics student", later graduate → Honours → Masters → PhD, and new roles (e.g. cybersecurity) — added, retired or reordered in the admin with no code change. | Owner 2026-09-30; EXT-1 |
| D14 | **The CV is a data product of the whole platform**, not a page render — designed from zero as a real CV: what to include, in what order, from which source, tailored per target role. | Owner 2026-09-30 |
| D15 | **Personal details only as given**, and the home street address is never published (the CV file lists it; the site shows region only) unless the owner says otherwise. | CLAUDE.md personal-info rule |

---

## 2. Information architecture

| Page | Keep / change | Why |
|---|---|---|
| `/` Home | **Rebuild** — §3 | The first impression; the most work |
| `/systems`, `/systems/[slug]` | Rebuild: an index grouped by the three GitHub homes; case studies as **engineering dossiers** (problem → architecture diagram → decisions → rules it follows → impact → stack → links) | D12, recommendation A |
| `/journey` | Rebuild: year-by-year timeline fed by Timeline + Education + Experience + shipped systems, never empty while any of them has data | Today it says "No entries yet." |
| `/cv` | Rebuild as a document page (the web view of §5) with the two download options | D14 |
| `/how-i-build` → **`/method`** | Rename (old path redirects): principles as numbered chapters + the live "rules this platform keeps" ledger | Shorter, clearer nav label |
| `/about` | Rebuild: photo, story (Profile.bio), titles & qualifications, the three homes, availability | D6, D13 |
| `/contact` | Keep as the Let's talk destination; redesign the form | D10 |
| **New `/now`** | What is being built right now — from GitHub activity (SystemActivityWeek, last pushes) and in-progress systems | Live, unique, zero hand-maintenance |
| **New `/organizations/[slug]`** | One page per GitHub home: role, focus, its systems | D12 |

Page removals: none beyond the Contact nav link. Every new page reads existing views; new data only where §6 says.

---

## 3. Home page (first, and the heaviest)

Sections, top to bottom — each names its data source:

1. **Hero** — positioning line (Profile.headline + titles, D13), the animated character (D5), primary CTA *Explore the systems*, secondary *Let's talk*. Ledger strip beneath: years building, organisations, shipped / in progress / queued (PublicLedger).
2. **Control room** — the platform reporting on itself: rules enforced (register count), audit events this week, last deploy, CI status, uptime. Sources: ActivityLog aggregate (public-safe view), deployment + CI metadata. *New public view required — §6.*
3. **Selected work** — the admin's homepage picks (featuredOnHome), bento layout, real screenshots.
4. **System map** — interactive: the three homes → their systems → the skills each proves (PublicSystem, SkillEvidence), animated connections. Replaces the stick figure.
5. **Numbers** — approved metrics only (PublicMetric), labelled as curated (BR-5.3).
6. **Method teaser** — the principles (SiteContent `how-i-build`) → /method.
7. **Now** — the latest activity → /now.
8. **Let's talk** — the review promise from settings (BR-2.2).

---

### 3a. The guide — an animated AI character (finalised with the owner, 2026-09-30)

The home-page character is the face of the **Tier 1 concierge** (PLATFORM-CONSTITUTION §6; V1.1, in scope by the owner's direction now that V1 is live). It greets visitors, answers questions about the owner's work, and takes them through the site.

**Owner decisions (2026-09-30)**

| Question | Decision |
|---|---|
| Animation | **Layered rig built in code now; a professional Live2D rig can replace it later** without changing anything else (ROADMAP-V2 §1). |
| Identity | **The owner's AI guide** — in his likeness, always labelled *"AI guide · answers from this site's data"*, speaking about him in the third person. Nothing is put in the owner's mouth (BR-4.3). |
| Placement | **Large in the home hero + a docked launcher (his face) on every page**; the chat opens as a panel on desktop and a bottom sheet on phones. |
| Voice | **Text now**, mouth moving with the streamed answer; a spoken-voice toggle with real lip sync later (ROADMAP-V2 §2). |

**Body — the rig**
- Master: `design/character/master-anime-2d.png` (transparent 1024×1536, from the owner's portrait). Web asset: WebP/AVIF at the displayed sizes, loaded after the page is interactive.
- **One image, deformed — not many redrawn images**, so nothing drifts out of alignment: a small WebGL2 renderer (no library) draws the master through a displacement field. Soft region masks (head, chest, shoulders — authored once over the master) weight the motion: breathing (chest rise, shoulders), head tilt and turn (a few degrees), gaze toward the cursor.
- **Face overlays** drawn as vector shapes over measured points of the master, in its lineart style: eyelids for blinking, five mouth shapes (rest, A, E, O, M) for talking, eyebrow lift for "listening".
- **Pose frames** for the few moments a warp can't carry — *wave* (greeting), *point* (when the guide opens a page), *thinking* (hand to chin) — generated from the master in the same ChatGPT conversation and cross-faded in and out of idle.
- **State machine** (the only interface the chat and page use): `idle` (breathe, blink every 3–6 s), `attentive` (cursor over the hero or the chat open: gaze follows), `thinking` (request sent, before the first token), `speaking` (mouth shapes paced by the streamed words), `pointing` (a tool opens a page), `greeting` (first visit of the session, once).
- **Performance budget:** the rig's code under 15 KB gzipped plus the image; renders only while visible (IntersectionObserver) and the tab is active; capped at 60 fps, dropping to 30 on low-power devices.
- **Accessibility and fallbacks:** `prefers-reduced-motion` → a still pose with no warp; no WebGL or no JavaScript → the static image; the character is decorative (`aria-hidden`), the chat is the accessible interface; the guide button is keyboard-reachable, and the panel traps focus and closes with Escape.

**Brain — governed, not improvised**
- **Model:** a fast Claude model through the AI SDK (the Vercel AI Gateway in production, the existing Anthropic key as fallback). The model id is a setting (`concierge.model`), not code.
- **Grounding:** the site's own public data — every public view (systems, case studies, homes, journey, titles, skills with evidence, CV model, method, numbers) serialised into one cached context. The corpus is small (tens of thousands of words), so the whole of it is read rather than searched: more accurate than retrieval, and Claude's prompt caching makes it cheap. When the corpus outgrows a token budget (setting `concierge.contextBudgetTokens`), retrieval over `ContentChunk` (pgvector, already in the schema) takes over (ROADMAP-V2 §3). *This refines Constitution §6's "retrieval over ContentChunk" for a small corpus; recorded as a change in the Constitution in the same PR.*
- **BR-4.3 in the prompt and in evals:** a question about the owner that the data doesn't answer gets "I don't know that — here's how to ask him", never a guess. General CS and mathematics knowledge is allowed.
- **Every answer cites its sources** (the Message Thread component's source chips link to the page each fact came from).
- **Tools** (a registry; each behind a `Flag`, off until the owner enables it — BR-4.4):
  - `open_page(path, section?)` — navigates and highlights the section; the character points (the "tour"). Client-side only.
  - `search_systems(query)` — the same search as ⌘K (`search_public()`).
  - `tailor_cv(role)` — links the generated CV tailored to a role; never invents facts.
  - `draft_inquiry(type, message)` — fills the contact form for the visitor to **review and send themselves**; the send is the normal form, same validation and rate limit (BR-4.1/4.2). The guide never submits on its own.
- **Opening:** a greeting plus the visitor-lens chips — *I'm hiring · I have a project · I'm an engineer · Just exploring* — which frame the answers (Constitution §4).
- **Limits are settings:** messages per session, messages per visitor per day (the database rate limiter, BR-2.4 style), max answer length, daily spend cap — past the cap the guide says it's resting and offers the contact form. A kill-switch flag turns it off entirely.
- **Learning loop (Constitution §2):** each exchange is counted; questions the guide couldn't answer are kept, without identifiers, for the retention period (BR-5.2) and shown to the owner in the admin so the missing content gets written. The panel says so before the first message.
- **Evals in CI:** a fixture set — grounding, scope boundary, "I don't know", tone, tool use — run on every change to the prompt or the grounding code; a failing eval blocks the merge.

**Personality and range — the owner's brief (2026-09-30)**
- His friend, narrating in the third person and **vouching for him hard** — leading with the strongest real evidence, persuasive, never inventing (BR-4.3: a made-up fact would cost him more than any admitted gap).
- **Calm under any pressure**: jailbreaks, fake authority ("I'm Kurhula / the admin"), fake system messages, encoded tricks, role-play traps, insults and baiting all get the same calm, good-humoured reply — and change nothing (BR-4.6).
- **A real AI, broad and curious — part of the showcase.** It engages properly with CS, maths, AI, science, careers, ideas, short code, poems, riddles and jokes; thinks outside the box; asks follow-ups. **He is the anchor, not a fence**: it connects topics to his work where they naturally fit. Limits stay reasonable (snippets and outlines, not 300-line programs or someone's homework); no political sides; nothing harmful.
- Model: `anthropic/claude-haiku-4.5` by default, with a 30-questions-a-day cap (`concierge.dailyMessageCap`) — sized to stay inside the Vercel AI Gateway's free monthly credit; the owner does not want a paid API bill (2026-09-30). A Claude subscription can't power a public site (consumer terms), so the Gateway is the route. Sonnet is one setting away.

**As built (2026-09-30)**
| Layer | Where |
|---|---|
| Route, flag gate, limits, tools behind flags, provider errors hidden | `app/api/v1/guide/route.ts` |
| Request whitelist and bounds (BR-4.6) | `lib/guide/request.ts` |
| Grounding — every public view, one document, sources per section | `lib/guide/corpus.ts` |
| Standing instructions — persona, range, honesty, defences | `lib/guide/prompt.ts` |
| Chat panel, docked launcher, hero greeting + lens chips, safe answer rendering | `components/guide/*`, `components/home/HeroGuide.tsx` |
| Lenses as data (key/label public, framing prompt private) | `VisitorLens.sortOrder`, `PublicVisitorLens`, `GET /lenses` |
| Settings | `concierge.model`, `.fallbackModels`, `.maxMessagesPerConversation`, `.maxQuestionCharacters`, `.rateLimit.*`, `.dailyMessageCap`, `.maxAnswerTokens`, `.maxReasoningTokens`, `.contextBudgetTokens`, `.corpusCacheSeconds` |
| Tests | `tests/unit/guide-request.test.ts`, `tests/unit/guide-text.test.tsx`, `tests/integration/guide-api.test.ts` (mock model, real everything else), `tests/ai-evals/guide.eval.test.ts` (30 judge-graded cases: grounding, range, "I don't know", commitments, attacks — needs `AI_GATEWAY_API_KEY`) |

**Strengthened — the V1 guide audit (2026-10-02; owner: "the smartest … knows each and every corner … high reasoning … sense of humour … conscience")**

*Reliability*
- **Fallback models.** The gateway's free models each allow about 5 requests a minute for the whole team, measured in an eval run where every case failed on that limit alone. Two or three visitors at once would have broken the guide. `concierge.fallbackModels` (default: the three free general models) hands a busy model's request to the next one. When every model is busy, the visitor gets an honest "busy — try again in a minute" with a **Try again** button, not a generic failure.
- **Reasoning budget.** A reasoning model's thinking counts as output. With `maxAnswerTokens` alone, the thinking used the budget and answers were cut mid-sentence, or never started (11 of the eval cases). `concierge.maxReasoningTokens` is its own allowance on top. If an answer is still cut short, the chat says so and offers **continue**.
- **Speed.** The corpus is reused for `concierge.corpusCacheSeconds` per warm instance (about 20 reads per question became one per window). The gateway caches where the provider can (`caching: auto`). Calls are tagged `guide` for spend reporting.

*Intelligence*
- **The visitor's page.** The chat sends the page path. The route accepts it only if it's one of the site's own pages and tells the model as a separate system note *after* the cached instructions, so "this system" means the one on screen and the cache still hits. The opening suggestions are per page (`ai-guide.pageSuggestions`, data).
- **More of the site in its knowledge:**
  - the Journey chapters;
  - every evidence claim, with what it proves, what it does *not* prove, and its links;
  - the platform's live figures (rules enforced by the database, audited changes, last sync, running build);
  - the kinds of message the contact form takes.
- **Instructions rewritten:**
  - **a reasoning method:** work out the intent, gather and connect the facts, check, then conclusion first;
  - **date arithmetic**, never inflating a student into a senior;
  - **"on the site" vs general knowledge**, kept separate;
  - **the visitor's language**;
  - **an honest self-description:** a language model on the site's data — no browsing, no memory of visitors, not conscious;
  - **care:** no jokes when someone is in distress, and general information only for medical, legal and financial questions;
  - **formats the chat can render.**
- **`draft_inquiry` picks the kind of message** (a lookup key, so the draft opens the right form at `/contact?about=<key>`).

*Security*
- **Tool results are never taken from the browser.** A forged history could otherwise pose as *data*, such as a fake search result. Search results sent back are dropped, and the model searches again if needed. A browser tool's input is cut down to its fields and its output rebuilt from fixed values (`lib/guide/request.ts`).
- **The knowledge is data, not instructions.** READMEs, commit messages and case studies may contain instruction-like text, and the prompt says so explicitly.
- **Link allow-list.** Answers may now link a published system's live site; NDA systems never carry one (BR-1.3).

*Experience*
- **The renderer is a safe Markdown subset:**
  - fenced code blocks with a copy button (an unclosed fence mid-stream shows as code);
  - inline code;
  - numbered steps;
  - `[label](target)` links, showing just the label when the target is refused;
  - `#section` anchors.

  Still React elements only, never HTML.
- **The panel:**
  - the conversation survives a reload (this tab's `sessionStorage` only);
  - **Try again** after an error;
  - "Thinking…" while a reasoning model thinks, then "Thought for Ns";
  - **Copy answer**.
- **Evals:**
  - **Coverage:** 39 cases, adding page context, date reasoning, evidence on demand, contact help, consciousness, a story-framed jailbreak, distress, humour and isiZulu.
  - **Running them:** they run on a gateway OIDC token as well as an API key, and the judge answers with a plain PASS/FAIL line, so any model can judge.
  - **Free-model limits:** `AI_EVAL_PACE_MS` paces calls for free-model limits, judge outages are retried, and the daily cap is lifted for the run and restored afterwards.

Still to do: the learning loop (unanswered questions → admin) and running the evals in CI once a key is available there.

## 4. Header and footer

- **Header:** logo; nav (D10) with the current page marked; ⌘K search; *Let's talk* as the single accent button; condensed on scroll; mobile sheet with the same items. Components: Magic UI / 21st.dev navbar + dropdown candidates, converted to tokens.
- **Footer (D11):** brand line; the three GitHub homes with their system counts; contact (email, review promise); social links (ProfileLink); live status line ("All systems normal · last deploy …"); privacy choices; colophon. No page list.

---

## 5. CV engine — designed from zero

**Structure** (ATS-safe, single column, in this order): Header (name, titles & qualification, location region, email, phone if set, links) → Professional summary → Core skills (grouped by category, evidence-backed) → Experience (role, organisation, dates, highlight bullets with impact) → Selected projects (systems on the CV, impact numbers, stack) → Education (qualification, institution, status or expected graduation, averages if the owner provides them, relevant modules) → Certifications & achievements → Additional (languages, interests — only if provided) → References ("available on request" unless the owner adds referees).

**Sources:** Profile, titles & qualifications (§6), ProfileLink, Experience, System + Impact, Skill + SkillEvidence, Education, Achievement, PublicMetric.
**Behaviour:** tailoring by target role reorders skills, bullets and projects by relevance; the completeness check scores every section; PDF and Word from the same model; the web `/cv` renders the same model. Placeholders from the source CV file (e.g. referee templates) are never published.

---

## 6. Data changes this plan needs (additive migrations only)

| Need | Change |
|---|---|
| D13 titles & qualifications | New `ProfileTitle` table: label, kind (lookup: role / qualification / …), sortOrder, validFrom, validTo, active, audited, `PublicProfileTitle` view. Profile.headline stays as the one-line positioning statement. |
| D12 three homes | Organization gains a `kind` lookup (personal / venture / client …) so the personal home and client organisations are told apart without code; the personal row is renamed from "Personal" to MALULEKE-KS. |
| §3.2 control room | `PublicPlatformPulse` view: aggregate counts only (no rows, no actors) from ActivityLog, JobRun and settings. |
| Real screenshots | Captured per system from its live URL; stored as uploaded assets, referenced by `screenshotUrl`. |
| Real systems | Run the GitHub sync locally for all three homes so the catalogue holds every repo as a draft; the owner picks what's published. Names follow GitHub ("Xkimi Xa Mali" — the catalogue currently spells it "Xkimm"). |

---

## 7. Content the owner supplies (never invented)

- The animated likeness: the master reference sheet generated 2026-09-19 in the owner's ChatGPT conversation "Anime character illustration" (two versions, 1024×1536: a semi-realistic painting and the true 2D-anime redraw — the anime one is the master). Animation is built from it: idle breathing, blink and a subtle look toward the cursor, as layered parts — and, where a still can't carry it, more poses generated from the same prompt.
- CV facts: from `Kurhula_Maluleke_CV_2025-1.docx` (owner-provided), except the street address (D15) and placeholder referees.
- Role highlights, averages, journey milestones: the owner confirms before publishing.

---

## 7a. Component choices (D9) — converted to our tokens and IBM Plex before use

| Where | Source | Why |
|---|---|---|
| Footer | 21st.dev **Dithered Footer** (otatechie) — retrieved 2026-09-30 | The wordmark is the gap in a drifting field of dots in one accent colour — ours is International Orange; spotlight under the cursor; CSS masks only, reduced-motion safe. Newsletter removed (no newsletter exists); columns replaced by the three GitHub homes, contact and status (D11). |
| AI guide chat | 21st.dev **Message Thread** (hirael, MIT) — retrieved 2026-09-30 | Streaming replies, tool calls and **source citations** — BR-4.3's "grounded only" becomes visible to the visitor; hover actions; reduced-motion safe. |
| Header | Our own, rebuilt 2026-09-30 (owner: "looks like a fixture just put there") | One bar that belongs to the page at the top, gathers into a single glass capsule on scroll with a reading-progress line, hides on scroll down and returns on scroll up; nav hover and active states glide (motion layoutId). |
| AI section + chat panel | Magic UI **Magic Card**, **Border Beam**, **Typing Animation**, **Animated Shiny Text**, **Blur Fade**, **Dot Pattern** — adapted | The console and the panel as one product: glow under the pointer, typed greeting, staggered suggestions, a composer that glows on focus. No model id shown to visitors (a private setting). |
| System map | Magic UI **Animated Beam** + **Orbiting Circles** | Homes → systems → skills, drawn from data. |
| Selected work | Magic UI **Magic Card** + **Lens** (screenshot loupe) + **Animated List** (live commit feed) + **Border Beam**; our Sparkline and TechChip (real brand marks) | Built 2026-09-30: the featured system with impacts, stack and 26 weeks of commits; "Now building" from GitHub; compact picks. No repeat of the hero's counts. The other picks: 21st.dev **Project Showcase** (jatin-yadav05) — copied via the site's Copy prompt → Claude Code, adapted: data as props, a ref-driven preview (the original re-rendered every frame), positioned inside the list (the fixed original drifted on scroll), honest tile when there's no screenshot, no preview on touch or reduced motion, keyboard focus highlighted. |
| Numbers / control room | Magic UI **Number Ticker** (already used), **Animated List** | Live counts; the pulse as a list of events. |
| Backgrounds | Magic UI **Dot Pattern** / **Flickering Grid** / **Noise Texture** | Subtle texture on graphite, never decoration for its own sake. |
| Journey | Magic UI **Blur Fade** (visible without JS) | Year-by-year reveal. |
| Screenshots | Magic UI **Safari** / **iPhone** mockups | Real captures of each live system. |
| Buttons | Our pill buttons + Magic UI **Shimmer Button** for the single primary CTA only | One accent, one moment of motion. |
| Journey (2026-10-03) | Magic UI **Light Rays**, **Shine Border**, **Text Animate**, **Magic Card**, **Number Ticker**; 21st.dev **Growth Story Timeline** (pattern only, searched not retrieved) | Rays seeded so server and client draw the same; the beam is scroll-driven and hidden under reduced motion, where a full static beam shows instead. |
| About (2026-10-03) | Magic UI **Orbiting Circles**, **Shine Border**, **Border Beam**, **Magic Card**, **Number Ticker** | Skills proven in code orbit the K-S mark; each orbiter starts where it is going, so reduced motion shows them spread round the ring. Decorative — the same skills are listed and linked beside it. |
| AI guide thinking state (2026-10-03) | 21st.dev **AI thinking orb and input** (MorphOrb) — the orb only | The dotted canvas sphere and its light programs, recoloured from tokens read off computed style; the program follows the chat's real state. The pill-to-card morph and timed labels were left out: the guide streams long answers in its own panel, and labels must be true. |

## 8. Delivery

| # | Step | Status (2026-09-30) |
|---|---|---|
| 1 | Data changes (§6) + local GitHub sync + screenshots | ✅ data layer, titles, homes, pulse, photos (BR-1.17), sync — screenshots with the systems pages |
| 2 | Header and footer (shared by every page) | ✅ built, viewed in the owner's browser |
| 3 | The guide finalised with the owner (§3a) | ✅ decisions recorded |
| 4 | Home (§3) — including the guide's rig and chat — reviewed in the owner's browser before moving on | ✅ built: hero, AI guide section + chat, selected work, system map, control room, method, let's talk (Now folded into selected work; `/now` a page) |
| 5 | Systems + dossiers, Organizations, Journey, Now, Method, About, CV (§5), Contact | ▶ next |
| 6 | Frontend coverage test (D2), full verification, then wait for the owner's "ready to push" | — |
