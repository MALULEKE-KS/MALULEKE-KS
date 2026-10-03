# MALULEKE-KS — PAGE SPECIFICATIONS v1.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md §12 (route map), DESIGN-SYSTEM.md (visual language), BUSINESS-RULES-v1.md
**Status:** Locked
**Scope:** Every route, every section on it, what data fills it, and how it behaves in its empty/loading/error states. Where a page reuses `SystemCard`, `LedgerHero`, `StatusBadge`, or `RuleCitation`, that's stated rather than re-described.

---

## PUBLIC

> **F5c redesign in progress (owner-approved 2026-09-30).** Every public page is being rebuilt from `docs/PUBLIC-REDESIGN-PLAN.md` — its decisions (D1–D15), information architecture (§2), home (§3) and AI guide (§3a) govern where they differ from a page's section below. Each page's section here is rewritten in the same PR that rebuilds the page.

### Shell — header and footer (F5c, rebuilt)

- **Header:** floating graphite glass pills over the page — logo; nav Systems · Journey · CV · Method · About (current page marked with an ember dot and `aria-current`); search (⌘K); **Let's talk** → `/contact`, the only contact entry (Contact is no longer a nav item). Below `lg`, a Menu pill opens a glass sheet. DESIGN-SYSTEM §6a.
- **Footer:** the mission (method content block), social links (`ProfileLink`), the three GitHub homes with live published-system counts (`GET /homes`), email + the review promise (setting `inquiry.reviewSlaHours`) + *Start a conversation*, a status line from `GET /platform/pulse` (business rules enforced by the database, last GitHub sync, build), the dithered MALULEKE-KS wordmark, privacy choices, colophon, back to top. No page list.
- **AI guide launcher (F5c, planned):** a docked button with the guide's face on every page, opening the chat (PUBLIC-REDESIGN-PLAN §3a).

### `/` — Home

*Being rebuilt — target: PUBLIC-REDESIGN-PLAN §3. Below: the page as shipped in F5a.*

1. **LedgerHero** — already built, content evolved per Design System §7: three lines blending Kurhula's career-aggregate facts and the system's aggregate facts (never named individual systems — that's the grid below, `/systems`, `/journey`'s job), typing out as a log entry, with the `ScaleFigure` line-art self-draw synced to finish alongside the third line.
2. **Priority systems grid** — 3–4 `SystemCard`s, ordered by the active `VisitorLens.priorityContent`, not a fixed flagship list. A recruiter and a fintech client see a different lead system on the same URL.
3. **By the numbers** — the curated, admin-selected impact strip (Constitution §8). Brass accent, three to five numbers, nothing live or per-visitor.
4. **Method teaser** — one paragraph of the mission statement plus a link through to `/method`. Not the full methodology here — a pointer to it.
5. **Contact band** — one line, one button, to `/contact`.

**Behavior:** on first visit, a small dismissible lens picker offers to tailor the ordering (2-tap, per Constitution §4) — never blocking, never a modal that has to be closed to read anything. `VisitorLensProvider` persists the choice for the session.

### `/systems` — Catalog

1. **Filter bar** — Home, Status, Built with, Domain, each pulled live from the data, each a dropdown (owner, 2026-10-03: the chip rows were noise) built on `<details>` so it works without JavaScript; options are links with counts, technologies with their real brand marks and a search box, ordered most used first (said in the panel).
2. **Results grid** — `SystemCard` throughout, corner-bracket interaction intact.
3. **Pagination** — a plain "3 / 5" mono indicator with prev/next, not decorative dots.

**Behavior:** filters write to URL query params — the filtered view is a shareable link, not throwaway client state. Loading state is skeleton cards with the corner-bracket frame already drawn, not a spinner. Empty state: *"No systems match these filters."* with a one-click clear-filters action — never a dead end.

### `/systems/[slug]` — Case Study

1. Header — name, `StatusBadge`, flagship marker if `isFlagship`.
2. Tech stack row — mono chips.
3. `caseStudyBody` — serif, long-form, the one place on the site body copy runs at full `max-w-prose` reading width.
4. Impact numbers — only rendered if `impacts[]` is non-empty; no empty-state placeholder box.
5. Testimonials — only ones with `hasPermission = true` are ever queried (BR-6.1) — never filtered client-side from a fuller list.
6. Links — `repoUrl`/`liveUrl`, absent entirely (not shown-as-disabled) when `clientVisibility = NDA_RESTRICTED` (BR-1.3).
7. "More systems" — two to three related cards by shared domain.

**Behavior:** an unknown or unpublished slug renders the same generic not-found page as a real 404 — never a distinct "this one's private" message, which would itself leak that a hidden system exists.

### `/journey` — the person's life and career (rebuilt 2026-10-02; redesigned the same day)

**Redesign:** an editorial timeline — the chapters as stops under the title, then each chapter with its years and place in a sticky column, his words, and its dated moments as a quiet list. No cards, no glow. Moments that only restate the chapter's own heading are not shown (unpublished, D-014).


The owner's story from school to now, in chapters. It covers his life and career, not his repositories (those are on `/systems`). Owner: "the journey is about me and my life since day one".

1. **Hero**
   - The headline and lede from the content block `journey`.
   - A **life line** showing every year from the first chapter to the year ahead:
     - each chapter is a segment that links to that chapter;
     - *now* pulses;
     - the future is dashed.
2. **Chapters** — each shows its number, years and place, then his words, then the dated moments inside it.
   - The moments are `PublicTimeline` milestones and experience starts. Each goes in the latest chapter covering its year.
   - Dates are shown only as precisely as he gave them (`Timeline.datePrecision`, `formatMilestoneDate`).
   - The chapter he's living now is marked and lit.
3. **What's next** — his ambition, his future milestones, Let's talk, and his CV while it's offered.

**Behavior:**
- **Words** come from Admin → Page content → Journey, marked `reviewed: false` until the owner approves the draft.
- **Dates** come from Admin → Journey.
- **No content block:** the page shows "The journey is being written."
- **Never** an invented date or fact.

### `/cv` — retired as a page (2026-10-02)

The owner's uploaded CV is the CV. Owner: generation "is building harder and violating our own rule".

**Where the CV is offered:**
- `/cv` redirects to the uploaded file while it's offered, else to `/about`.
- Everywhere else links the uploaded file directly through `getUploadedCvLink()`, PDF first:
  - the header's **CV** button;
  - the phone menu's *Download my CV*;
  - the home hero's *Get my CV*;
  - the calls to action on Journey and About.

**The generator** is switched off, not deleted:
- Its code, API and admin screen stay; the generated `PublicCvOption` is hidden.
- The old page is kept, unrouted, as `_generated-cv-page.tsx`.

### `/method` — now a section of About

`/method` (and `/how-i-build`) redirect permanently to `/about#method`.

### `/about` — the person, and how he builds (rebuilt 2026-10-02; redesigned the same day — owner: "overcrowded … not professional")

**Redesign:** editorial and calm — hairlines instead of boxes, one accent. No badges on the portrait and no organisations section (the footer has the homes; the facts row has his company roles). Section headings come from the `page-copy` block (`about.*`). Skill categories are ordered by evidence.


1. **Hero**
   - **His portrait**, large and lit. The uploaded `about` photo wins (BR-1.17); otherwise the approved portrait.
   - **Two glass badges** on the portrait's edges, both from his own data: his company role and his study.
   - **Beside it:** his name, his headline and the titles the headline doesn't already state, then Let's talk and *Get my CV*.
2. **In my own words**
   - `Profile.bio`, with the first paragraph set large in serif.
   - **Beside it, the AI guide**, hidden when the guide is off:
     - the anime character, its poses cross-fading;
     - labelled AI;
     - three suggested questions, each opening the guide.
   - **Plain facts:** based in, building since, studying, companies.
3. **Method** (`#method`) — the mission and the five principles from the `how-i-build` block, each opening its evidence (EVIDENCE-SPEC).
4. **Skills** (`#skills`)
   - Grouped by `SkillCategory`, as on his CV.
   - Each skill shows how many published systems use it (`SkillEvidence`) — evidence rather than a rating.
5. **Organisations** — each with his role, its systems count and its GitHub link. The page closes with *Let's build something real.*

**Behavior:** nothing about the owner lives in the page's code. Every section hides when its data is empty.

### `/contact` — Let's Talk (docs/LETS-TALK-SPEC.md; rebuilt 2026-10-02)

1. **Hero**
   - "Let's talk."
   - A person rather than a mailbox: his face and "reads every message himself — reviewed within N hours" (`inquiry.reviewSlaHours`).
   - How it goes from here, as four connected steps. Phones show only the step titles.
2. **What brings you here?** — the active categories as tiles, in the admin's order (`GET /inquiries/types`).
   - Each tile shows its description and what the form will ask, e.g. "8 questions · about 3 min", counted from the form's own spec.
   - `?about=<category>` opens a category directly.
3. **A form shaped to the category**, in numbered parts:
   - **What it is** — the kinds (with "Other — describe"), the category's own fields, and the message.
   - **Compensation**, where it applies.
   - **An arranged interview or meeting**, with its own time zone.
   - **You**, with the preferred channel.
   - **Documents** — PDFs, dropped or chosen.

   Beside the form, a **progress rail** ticks each part off and jumps to it.
4. **Confirmation** — inline: the reference, the review window and the removal route (BR-5.5). No account.
5. **Beside the form:** email as the other way in, and what happens to their details (BR-5.2).

**Structure:**
- **The category fields are data** in `lib/inquiries/fields.ts`. One spec is drawn by one renderer and read by the payload builder; its labels are typed against the schema enums.
- **State and sending** live in `use-inquiry-form.ts`, with one component per part.
- **`tests/unit/inquiry-fields.test.ts`** proves the spec and the server schemas (`lib/inquiries/forms.ts`) agree.

**Behavior:**
- **Validation:** the same rules run in the browser and on the server. The server's answer counts.
- **Abuse protection:** a hidden honeypot, a signed form token, and per-connection and per-address limits.
- **Duplicates:** one idempotency key per message.
- **Ways in:**
  - **Let's talk** in the header;
  - the home band;
  - the footer;
  - the AI guide's `draft_inquiry`, when the visitor asks. It only fills the message; the visitor still sends it (BR-4.1/4.2).

### `/now` (F5c, planned)

What is being built right now: in-progress systems and the latest GitHub activity per system (`SystemActivityWeek`, last pushes), newest first. No hand-maintained text.

### `/organizations/[slug]` (F5c, planned)

One page per GitHub home (`PublicHome`): name, the owner's role, its GitHub accounts, and its published systems.

---

## ADMIN (all 2FA-gated, per BR-3.1)

**Shell (#104):** every page below except sign-in sits in one panel — a graphite sidebar grouped by task (Content, Inbox, Quality, Platform), bone content area, a menu on small screens, "View the site" and "Sign out" (`POST /admin/auth/logout`, which ends every session). The layout re-checks the session where pages read data (`requireAdminId`), on top of `proxy.ts`. Removals always ask once ("Remove?") — never a browser dialog.

### `/admin/login`

Email + password, then the 6-digit code (paste fills all six) or a recovery code. Copy never says which credential was wrong; a lockout shows its countdown (BR-3.2). "Start over" is always offered on the code step, because an expired challenge answers exactly like a wrong code (BR-3.5). Arriving from an ended session or a sign-out shows neutral copy, not an error.

### `/admin` — Dashboard

1. Needs your attention — only what needs acting on, each linking to where it's done: overdue inquiries (BR-2.2), systems to curate, repo-owner permissions pending, journey drafts, number proposals, CV gaps, stale content, recovery codes running low (BR-3.12). "All clear" when empty.
2. Quick-stats strip — shipped / in progress / queued, CV readiness. Not a chart-heavy vanity dashboard.
3. Needs-curation queue — every `System` with `needsCuration = true`, direct links to curate. The flag clears automatically the moment the admin opens and saves that system's detail view (BR-1.8) — no separate "mark reviewed" action needed on top of the edit itself.
4. Recent inquiries — last 5, link through to the full inbox.
5. Jobs — the last run of each, failures called out.
6. Recent activity — last few `ActivityLog` entries.

This is the operational home screen: action items first, metrics second — consistent with the earlier decision against vanity metrics anywhere on this platform, public or admin.

### `/admin/systems` and `/admin/systems/[id]`

List: a dense table, not cards — name, org, status, what visitors see (published / scheduled / draft / archived), curation and publish-blocked flags, placement (flagship, home, CV). Filters: needs curation, published, drafts, archived, each with its count.

Detail/edit: a form matching `SystemUpdateInputSchema`. The publish toggle is disabled with an inline reason, not just silently rejected on submit, when `clientVisibility != PUBLIC` and `clientApproved = false`: *"Publishing requires client approval — confirm and toggle Client Approved first."* BR-1.1 surfaced as UI guidance, not a mystery 409. The same for BR-1.11 (a collaborated repo needs its owner's permission recorded as granted). Grouped: the system (name, address — a rename keeps the old address redirecting, BR-1.14 — summary, stack, status, domain, organisation); publishing (visibility, approvals, go-live time, BR-1.13); repo ownership; where it's shown (flagship, home, CV and their order); links; case study. Beside it: impact figures, the skills it proves, the history of the case study and summary with restore (BR-1.15), and the facts nobody types (GitHub metadata, old addresses, status history). Only changed fields are sent; saving with no changes still clears `needsCuration`.

### `/admin/organizations`

List and editor: name, slug, the owner's role, client (sets the default for systems created afterwards only — BR-1.2), and the GitHub logins the sync files repos under.

### `/admin/inquiries`

List grouped/filterable by status and type — name, type, snippet, age, status pill. Detail panel: full message, status-transition buttons that only ever offer the valid next step(s) in the BR-2.1 sequence — from `new`, only "Mark reviewed"; from `reviewed`, both "Mark responded" and "Close" (spam/irrelevant doesn't force a fake reply — BR-2.1); from `responded`, only "Close". Never a skip-ahead option. Empty state: *"No new inquiries."* — plain, not falsely upbeat. An "Overdue" filter shows new inquiries past the admin-set review window (BR-2.2); the detail panel shows where it came from, when review is due, and a reply-by-email link (not for anonymised ones, BR-5.2).

### `/admin/timeline`

Standard CRUD for `Timeline` entries only — `POST/PATCH/DELETE /admin/timeline[/{id}]`. `MilestoneType` select pulls live from its lookup table. Timeline entries may be hard-deleted directly (unlike `System`, they carry no publishing-state history worth preserving). Drafts — including ones the sync drafted when a system shipped (#70) — are listed first with a one-click Publish; any entry can be drafted, published now or scheduled (BR-1.13).

### `/admin/cv`

Tabbed sections — Profile & links (`/admin/profile`), Experience (with CV bullets and show/hide), Education (expected graduation, coursework), Skills, Certifications (`/admin/achievements`) — plus a CV check panel (`/admin/cv/check`: score, gaps, suggested summary, preview) (#74). `SkillCategory` select pulls live from its lookup table. Deleting a `Skill` still referenced by any `System` or `Experience` is blocked with an inline reason (mirrors the BR-1.1 publish-block UX pattern) rather than a raw 409. Above the tabs: the two download options (uploaded file versions with "make current", which options show, which is first, labels — BR-7.1/7.5) and the CV check. Every role and education entry can be drafted, published now or scheduled.

### `/admin/profile`

The profile that fills the site and CV (name, headline, role, location, public email, phone, availability, CV summary, /about text, building-since year), the links beside it (kind picks the icon; on-CV toggle), and achievements (drafts until published, schedulable).

### `/admin/content`

Page content blocks (#106) — one editor per block. how-i-build: the mission and 1–8 principles (name, one line, in full), reorderable; saved as a whole and validated against the block's schema.

### `/admin/numbers`

Every curated number (BR-5.3): public value, the pending proposal with Approve / Reject, manual entry for hand-kept numbers, "Compute now", history, and show/hide. New numbers are defined here.

### `/admin/freshness`

Live content nobody has edited or confirmed within `content.freshnessDays` (BR-1.16), oldest first — Open to edit, or "Still accurate" to restart its clock.

### `/admin/jobs`

Each registered job with its schedule, rules and last result, and Run now; the recent runs below — result, summary or error, what started it, duration.

### `/admin/account`

Sign-in facts (email, two-factor, last sign-in, recovery codes left), password change and recovery-code regeneration — both re-authenticate with the current password and a fresh code (BR-3.14/3.15); new codes are shown once with copy and download.

### `/admin/settings`

1. Platform — every tunable in the settings registry (#67), grouped, with its rule and default; saved one at a time, bounds checked on the server; reset to default.
2. Lookup table management — every type, with its own extra fields (a status's stage and colour, a repo relationship's permission flag, the auto-drafted milestone type): list, add, relabel, soft-deprecate (BR-8.1/8.2) — no hard-delete control exposed in the UI at all, matching the API surface.
3. Feature flags — toggle list, one at a time; no bulk-enable, consistent with BR-4.4's opt-in-by-default discipline.
4. Visitor lens configuration — priority content and AI framing prompt per lens.

### `/admin/activity-log`

Read-only table — timestamp, action, entity, admin, an expandable diff of only the fields that changed. The audit ledger the rest of the platform's discipline depends on, made visible to the one person it's for.

---

*Every page above either reuses a component already built (`LedgerHero`, `SystemCard`, `StatusBadge`, `RuleCitation`) or names the new one it needs. Nothing here introduces a visual pattern outside DESIGN-SYSTEM.md §0–§7.*
