# MALULEKE-KS — PAGE SPECIFICATIONS v1.0

**Derives from:** PLATFORM-CONSTITUTION-v1.md §12 (route map), DESIGN-SYSTEM.md (visual language), BUSINESS-RULES-v1.md
**Status:** Locked
**Scope:** Every route, every section on it, what data fills it, and how it behaves in its empty/loading/error states. Where a page reuses `SystemCard`, `LedgerHero`, `StatusBadge`, or `RuleCitation`, that's stated rather than re-described.

---

## PUBLIC

### `/` — Home

1. **LedgerHero** — already built, content evolved per Design System §7: three lines blending Kurhula's career-aggregate facts and the system's aggregate facts (never named individual systems — that's the grid below, `/systems`, `/journey`'s job), typing out as a log entry, with the `ScaleFigure` line-art self-draw synced to finish alongside the third line.
2. **Priority systems grid** — 3–4 `SystemCard`s, ordered by the active `VisitorLens.priorityContent`, not a fixed flagship list. A recruiter and a fintech client see a different lead system on the same URL.
3. **By the numbers** — the curated, admin-selected impact strip (Constitution §8). Brass accent, three to five numbers, nothing live or per-visitor.
4. **How I Build teaser** — one paragraph of the mission statement plus a link through to `/how-i-build`. Not the full methodology here — a pointer to it.
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

1. Header — name, role line, **Download PDF** button (`POST /cv/generate`).
2. Experience — reverse-chronological.
3. Education.
4. Skills — grouped by `SkillCategory`, not one flat tag cloud.
5. A small on-screen note: *"Formatted for print — use Download PDF for the cleanest copy."*

**Behavior:** on-screen view uses the full design system; the downloaded/printed version uses the ink-only print stylesheet already built in `globals.css` — genuinely different outputs for genuinely different jobs (reading vs. printing/attaching to an application).

### `/how-i-build`

1. Mission statement, set prominently but not oversized — restraint, per Design System §4.
2. The governing principles — EXT-1, Smart Not Hard, Controlled Imperfection Engineering, Permission Boundaries — each with a short, plain-language explanation of what it means in practice, not the full constitution text.
3. Two or three real rule citations rendered as actual `RuleCitation` components (e.g. BR-1.1, BR-4.1) — making the discipline tangible instead of asserted. This is the page the Overview document flagged as currently "buried in a README" — this is where it surfaces properly.

**Behavior:** static content, admin-editable as a single content block rather than a full CMS page — it changes rarely enough not to need its own entity.

### `/about`

1. First-person narrative — voice per Design System/Overview §voice-and-tone.
2. Organizational affiliations — KSDRILL-SA, GrowthCore, brief, not a repeated systems list.
3. Pointers to `/journey` and `/how-i-build` for anyone wanting depth.

**Behavior:** core content is stable; the subtitle/framing line shifts per active `VisitorLens`, the body does not.

### `/contact`

1. `InquiryForm` — a real `<select>` for the six `InquiryType` values, not six separate buttons competing for attention.
2. Name / email / message fields, validated client-side against `InquiryCreateInputSchema` before submit.
3. Inline confirmation on success — no redirect: *"Received. I'll get back to you within 48 hours."* — states the actual BR-2.2 SLA rather than a vague "soon."
4. Rate-limit error state: *"Too many requests from this connection — try again tomorrow."*

**Behavior:** a hidden honeypot field for basic bot filtering, in addition to the server-side rate limit (BR-2.4).

---

## ADMIN (all 2FA-gated, per BR-3.1)

### `/admin` — Dashboard

1. Quick-stats strip — open inquiries, systems flagged `needsCuration`, recent activity count. Mono, ledger-styled, not a chart-heavy vanity dashboard.
2. Needs-curation queue — every `System` with `needsCuration = true`, direct links to curate. The flag clears automatically the moment the admin opens and saves that system's detail view (BR-1.8) — no separate "mark reviewed" action needed on top of the edit itself.
3. Recent inquiries — last 5, link through to the full inbox.
4. Recent activity — last few `ActivityLog` entries.

This is the operational home screen: action items first, metrics second — consistent with the earlier decision against vanity metrics anywhere on this platform, public or admin.

### `/admin/systems` and `/admin/systems/[id]`

List: a dense table, not cards — name, org, status, `contentStatus`, `needsCuration`, flagship toggle, `sortOrder`, sortable and filterable.

Detail/edit: a form matching `SystemUpdateInputSchema`. The publish toggle is disabled with an inline reason, not just silently rejected on submit, when `clientVisibility != PUBLIC` and `clientApproved = false`: *"Publishing requires client approval — confirm and toggle Client Approved first."* BR-1.1 surfaced as UI guidance, not a mystery 409.

### `/admin/inquiries`

List grouped/filterable by status and type — name, type, snippet, age, status pill. Detail panel: full message, status-transition buttons that only ever offer the valid next step(s) in the BR-2.1 sequence — from `new`, only "Mark reviewed"; from `reviewed`, both "Mark responded" and "Close" (spam/irrelevant doesn't force a fake reply — BR-2.1); from `responded`, only "Close". Never a skip-ahead option. Empty state: *"No new inquiries."* — plain, not falsely upbeat.

### `/admin/timeline`

Standard CRUD for `Timeline` entries only — `POST/PATCH/DELETE /admin/timeline[/{id}]`. `MilestoneType` select pulls live from its lookup table. Timeline entries may be hard-deleted directly (unlike `System`, they carry no publishing-state history worth preserving).

### `/admin/cv`

Three tabbed sections — Experience, Education, Skills — each its own standard CRUD form (`/admin/cv/experience`, `/admin/cv/education`, `/admin/cv/skills`). `SkillCategory` select pulls live from its lookup table. Deleting a `Skill` still referenced by any `System` or `Experience` is blocked with an inline reason (mirrors the BR-1.1 publish-block UX pattern) rather than a raw 409.

### `/admin/settings`

1. Feature flags — toggle list, one at a time; no bulk-enable, consistent with BR-4.4's opt-in-by-default discipline.
2. Lookup table management — per type: list, add, soft-deprecate (BR-8.1/8.2) — no hard-delete control exposed in the UI at all, matching the API surface.
3. Visitor lens configuration — priority content and AI framing prompt per lens.

### `/admin/activity-log`

Read-only table — timestamp, action, entity, admin, an expandable before/after diff. The audit ledger the rest of the platform's discipline depends on, made visible to the one person it's for.

---

*Every page above either reuses a component already built (`LedgerHero`, `SystemCard`, `StatusBadge`, `RuleCitation`) or names the new one it needs. Nothing here introduces a visual pattern outside DESIGN-SYSTEM.md §0–§7.*
