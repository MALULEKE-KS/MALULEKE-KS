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

1. **Filter bar** — Organization, Domain, Status, each pulled live from its lookup table (mono labels, not icons standing in for text).
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

### `/journey` — Timeline

Single vertical log, not a generic icon-and-card timeline component — visually a continuation of the homepage's ledger language: each `Timeline` entry is a dated line, title, short description, tag pills. Filterable by `MilestoneType` via mono filter chips at the top.

**Behavior:** empty state per filter — *"No entries tagged [type] yet."* — plain, not apologetic.

### `/cv`

1. Header — name, role line, and the **CV options** the admin shows (`GET /cv/options`, #92), in the admin's order, each with its label and note (BR-7.1, BR-7.5):
   - **Generated CV** — **Download PDF** / **Download Word** (`POST /cv/generate` with `format`, #74), the same ATS-safe CV in both formats, built from live data on click.
   - **Uploaded CV** — the owner's own file(s), with the upload date; plain download links.

   Sections 2–5 are the generated CV on screen, so they show only while the generated option is visible.
2. Experience — reverse-chronological.
3. Education.
4. Skills — grouped by `SkillCategory`, not one flat tag cloud.
5. A small on-screen note: *"Formatted for print — use Download PDF for the cleanest copy."*

**Behavior:** on-screen view uses the full design system; the downloaded/printed version uses the ink-only print stylesheet already built in `globals.css` — genuinely different outputs for genuinely different jobs (reading vs. printing/attaching to an application).

### `/method` (was `/how-i-build`, which redirects permanently)

1. Mission statement, set prominently but not oversized — restraint, per Design System §4.
2. The governing principles — EXT-1, Smart Not Hard, Controlled Imperfection Engineering, Permission Boundaries — each with a short, plain-language explanation of what it means in practice, not the full constitution text.
3. Two or three real rule citations rendered as actual `RuleCitation` components (e.g. BR-1.1, BR-4.1) — making the discipline tangible instead of asserted. This is the page the Overview document flagged as currently "buried in a README" — this is where it surfaces properly.

**Behavior:** the mission and principles are the admin-edited content block `how-i-build` (Admin → Page content, #106) — never text in the page's code.

### `/about`

1. First-person narrative (`Profile.bio`) — voice per Design System/Overview §voice-and-tone.
2. **The owner's photo** — the current `about` photo (`GET /profile` → `photos.about`, uploaded in Admin → Profile → Photos, BR-1.17); nothing rendered when none is set.
3. **Titles and qualifications** — every current `ProfileTitle` (e.g. "Software & AI Engineer", "Final-year BSc Computer Science & Mathematics student · North-West University"), in the owner's order.
4. Organizational affiliations — KSDRILL-SA, GrowthCore, brief, not a repeated systems list.
5. Pointers to `/journey` and `/method` for anyone wanting depth.

**Behavior:** core content is stable; the subtitle/framing line shifts per active `VisitorLens`, the body does not.

### `/contact`

1. `InquiryForm` — a real `<select>` for the six `InquiryType` values, not six separate buttons competing for attention.
2. Name / email / message fields, validated client-side against `InquiryCreateInputSchema` before submit.
3. Inline confirmation on success — no redirect: *"Received. I review every inquiry within 48 hours."* — states the actual BR-2.2 commitment (a review, not a promised reply) rather than a vague "soon", followed by the BR-5.5 removal route: *"To request removal of this submission, email <owner email>."*
4. Rate-limit error state: *"Too many requests from this connection — try again tomorrow."*

**Behavior:** a hidden honeypot field for basic bot filtering, in addition to the server-side rate limit (BR-2.4). The review window in the copy is the setting `inquiry.reviewSlaHours`, never a typed number. Reached from **Let's talk** (header) and the footer, and — when the visitor asks — pre-filled by the AI guide's `draft_inquiry`, which the visitor still sends themselves (BR-4.1/4.2).

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
