<!-- Generated from lib/capabilities/map.ts by `npm run docs:capabilities`. Don't edit by hand — edit the map. -->

# Frontend data guide

Page by page, every piece of data and every action the backend offers — so a redesign can't miss a capability that exists in the database. Pages marked *(proposed)* don't exist yet; their data and actions do. Rules a screen must respect are in each item's notes. The backend view of the same map is `docs/BACKEND-API-GUIDE.md`.

## Public site

### (every page)

**Owner profile and links** — Header name, footer contact and social links

- Call `GET /profile`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).

**Instant search** — ⌘K search palette

- Call `GET /search`
- Results: kind (system → /systems/{key}, journey → /journey#{key}, skill), title, subtitle.
- Debounce typing; 429 means slow down (limits are admin settings search.rateLimit.*).
- Queries under 2 characters are refused — don't send them.

### /

**Owner profile and links** — Hero: name, headline

- Call `GET /profile`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).

**Homepage** — Hero ledger (years building, organizations founded, shipped / in progress / queued); Featured work (the admin's picks, in order); Numbers band (approved metrics only)

- Call `GET /home`
- Ledger counts are live content facts; metrics are curated snapshots — label them differently (BR-5.3).
- featured falls back to flagship-first until the admin picks some; never empty while anything is published.

**Curated numbers** — Numbers band

- Call `GET /metrics`
- Show approvedAt as "as of" — these are point-in-time figures.

### /about

**Owner profile and links** — Bio, availability, location, building since

- Call `GET /profile`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).

**Skills with evidence** — What I work with

- Call `GET /skills`
- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

**Certifications and awards** — Certifications and awards

- Call `GET /achievements`
- systemSlug links an achievement to its case study when present.

**Curated numbers** — By the numbers

- Call `GET /metrics`
- Show approvedAt as "as of" — these are point-in-time figures.

### /contact

**Owner profile and links** — Email, phone (only when set), links

- Call `GET /profile`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).

**Contact — send an inquiry** — Inquiry form and confirmation

- Call `POST /inquiries`
- Types come from GET /lookups/inquiry-type; include the hidden honeypot field "website".
- Send an idempotencyKey (uuid) so a double-submit returns the original confirmation.
- The review promise comes from the inquiry.reviewSlaHours setting — don't hardcode "48 hours".

**Lookups — statuses, domains, types, categories, relationships** — Inquiry type select

- Call `GET /lookups/{type}`
- Call `POST /lookups/{type}`
- Call `PATCH /lookups/{type}/{id}`
- Call `POST /lookups/{type}/{id}/deprecate`
- 409 LOOKUP_KEY_DEPRECATED means offer "reactivate" instead of creating again (BR-8.3).

### /cv

**Skills with evidence** — Skills

- Call `GET /skills`
- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

**Certifications and awards** — Certifications

- Call `GET /achievements`
- systemSlug links an achievement to its case study when present.

**CV — the options, view and download** — CV options (GET /cv/options), in the order given, each with its label and note; the uploaded one shows its upload date; On-screen CV, target-role box, Download PDF / Word — only while the generated option is listed

- Call `GET /cv/options`
- Call `GET /cv`
- Call `POST /cv/generate`
- Call `GET /cv/documents/{id}`
- Call `GET /cv/uploads/{id}`
- Start from GET /cv/options: show exactly those options, in that order, with their labels — never assume either exists.
- Never present one option as the other: the uploaded CV is the owner's file as uploaded; the generated one is live data (BR-7.1).
- Render GET /cv exactly — it's the same model the generated files come from. It, generate and document downloads are 404 while the generated option is hidden.
- POST /cv/generate returns a fileUrl; navigate to it to download. Uploaded files are plain links (files[].url). 429 = rate-limited.

### /journey

**Journey** — Timeline and type filter

- Call `GET /timeline`
- Filter options come from GET /lookups/milestone-type.

### /systems

**Systems catalog** — Grid, filters, pagination

- Call `GET /systems`
- Call `GET /organizations`
- organization may be a masked label ("a fintech client") — show it as text, never link it.
- repoPrivate = true means repoUrl is null: show a private-repository lock and a Request access action (to /contact).
- Status colour comes from statusColorToken — never map status keys to colours in code (EXT-1).

**Lookups — statuses, domains, types, categories, relationships** — Status and domain filters

- Call `GET /lookups/{type}`
- Call `POST /lookups/{type}`
- Call `PATCH /lookups/{type}/{id}`
- Call `POST /lookups/{type}/{id}/deprecate`
- 409 LOOKUP_KEY_DEPRECATED means offer "reactivate" instead of creating again (BR-8.3).

### /systems/[slug]

**Case study** — Header, case study body, impacts, testimonials; Related systems

- Call `GET /systems/{slug}`
- Call `GET /systems/{slug}/related`
- An unknown or unpublished slug is a plain 404 — never a "private" message (BR-1.3/1.4).
- liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.
- An old slug answers with a permanent redirect (308) to the current one — follow it; links from before a rename keep working (BR-1.14).

**Skills with evidence** — Skills this system proves (match systemSlugs)

- Call `GET /skills`
- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

## Admin

### /admin

**Admin dashboard** — Attention list, pipeline, CV score, jobs, recent activity

- Call `GET /admin/overview`
- Each attention count links to its screen, filtered (e.g. /admin/inquiries?overdue=true).

### /admin/activity-log

**Audit trail** — Log with filters (entity, action, actor, date range), before/after diff

- Call `GET /admin/activity-log`
- "[redacted]" marks a secret or personal field that's never stored in the log.

### /admin/cv

**CV content, options, uploads, completeness and history** — Experience, Education, Skills tabs; Completeness panel (score, issues, suggested summary, preview by target role); Generated documents; Uploaded CV: upload (PDF/Word), versions with download and make-current; What visitors can download: show/hide each option, which is first, labels and notes

- Call `GET /admin/cv/experience`
- Call `POST /admin/cv/experience`
- Call `PATCH /admin/cv/experience/{id}`
- Call `DELETE /admin/cv/experience/{id}`
- Call `GET /admin/cv/education`
- Call `POST /admin/cv/education`
- Call `PATCH /admin/cv/education/{id}`
- Call `DELETE /admin/cv/education/{id}`
- Call `GET /admin/cv/skills`
- Call `POST /admin/cv/skills`
- Call `PATCH /admin/cv/skills/{id}`
- Call `DELETE /admin/cv/skills/{id}`
- Call `GET /admin/cv/check`
- Call `GET /admin/cv/documents`
- Call `GET /admin/cv/uploads`
- Call `POST /admin/cv/uploads`
- Call `GET /admin/cv/uploads/{id}`
- Call `POST /admin/cv/uploads/{id}/restore`
- Call `GET /admin/cv/options`
- Call `PATCH /admin/cv/options`
- Upload is multipart/form-data, field "file". 415 = not a PDF/Word file (or has macros), 413 = over cv.upload.maxMegabytes; show the message.
- CV options: show the database's BR-7.5 message on a 400 (e.g. hiding the generated CV before any upload).
- The suggested summary is an offer: save it only through PATCH /admin/profile when the owner accepts.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

### /admin/inquiries

**Inquiries — triage** — Inbox, overdue badge (reviewDueAt / overdue), status actions

- Call `GET /admin/inquiries`
- Call `PATCH /admin/inquiries/{id}`
- Only offer the transitions BR-2.1 allows; 409 INVALID_STATUS_TRANSITION otherwise.

### /admin/jobs (proposed)

**Job runs** — Runs by job, failures first

- Call `GET /admin/jobs`

### /admin/login

**Admin sign-in (password + 2FA)** — Password step, 2FA step, recovery-code option

- Call `POST /admin/auth/login`
- Call `POST /admin/auth/verify-2fa`
- Call `POST /admin/auth/change-password`
- Show neutral copy on expiry ("session ended"), not an error.
- Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in.

### /admin/numbers (proposed)

**Curated numbers — define, propose, decide** — Metrics, pending proposals with approve / reject, history

- Call `GET /admin/metrics`
- Call `POST /admin/metrics`
- Call `PATCH /admin/metrics/{key}`
- Call `POST /admin/metrics/{key}/proposals`
- Call `POST /admin/metrics/compute`
- Call `POST /admin/metrics/snapshots/{id}/approve`
- Call `POST /admin/metrics/snapshots/{id}/reject`
- A proposal's value can't be edited — enter a new one (the database refuses changes).

### /admin/organizations (proposed)

**Organizations** — List and editor

- Call `GET /admin/organizations`
- Call `POST /admin/organizations`
- Call `PATCH /admin/organizations/{id}`
- isClient only affects systems created afterwards (BR-1.2) — say so next to the switch.

### /admin/profile (proposed)

**Profile, links and achievements** — Profile form, links, achievements

- Call `GET /admin/profile`
- Call `PATCH /admin/profile`
- Call `POST /admin/profile/links`
- Call `PATCH /admin/profile/links/{id}`
- Call `DELETE /admin/profile/links/{id}`
- Call `GET /admin/achievements`
- Call `POST /admin/achievements`
- Call `PATCH /admin/achievements/{id}`
- Call `DELETE /admin/achievements/{id}`
- Achievements start as drafts; publishing puts them on the site and the CV.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

### /admin/settings

**Lookups — statuses, domains, types, categories, relationships** — Lookups: add, rename, re-stage, recolour, deprecate

- Call `GET /lookups/{type}`
- Call `POST /lookups/{type}`
- Call `PATCH /lookups/{type}/{id}`
- Call `POST /lookups/{type}/{id}/deprecate`
- 409 LOOKUP_KEY_DEPRECATED means offer "reactivate" instead of creating again (BR-8.3).

**Platform settings, feature flags, visitor lenses** — Settings (with each one's rule and default), flags, lenses

- Call `GET /admin/settings/platform`
- Call `PATCH /admin/settings/platform/{key}`
- Call `GET /admin/settings/flags`
- Call `PATCH /admin/settings/flags/{key}`
- Call `GET /admin/settings/lenses`
- Call `POST /admin/settings/lenses`
- Call `PATCH /admin/settings/lenses/{id}`
- Show each setting's default and bounds; a reset is PATCHing the default value.

### /admin/systems

**Systems — curate, publish, feature** — List with curation queue, filters

- Call `GET /admin/systems`
- Call `POST /admin/systems`
- Call `GET /admin/systems/{id}`
- Call `PATCH /admin/systems/{id}`
- Call `PUT /admin/systems/{id}/skills`
- Call `GET /admin/systems/{id}/impacts`
- Call `POST /admin/systems/{id}/impacts`
- Call `PATCH /admin/impacts/{id}`
- Call `DELETE /admin/impacts/{id}`
- Call `GET /admin/systems/{id}/revisions`
- Call `POST /admin/systems/{id}/revisions/{revisionId}/restore`
- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.
- Renaming (PATCH slug) keeps the old URL as a permanent redirect; the detail lists previousSlugs. 409 SLUG_TAKEN / SLUG_RESERVED — show the message.
- Every case-study and description edit is kept (BR-1.15); restoring records a new version — nothing is ever overwritten.

### /admin/systems/[id]

**Systems — curate, publish, feature** — Editor, publish controls, homepage + CV placement, repo ownership; Skills, impacts, status history, pace, activity chart; Revision history for the case study and description: versions with who and when, restore

- Call `GET /admin/systems`
- Call `POST /admin/systems`
- Call `GET /admin/systems/{id}`
- Call `PATCH /admin/systems/{id}`
- Call `PUT /admin/systems/{id}/skills`
- Call `GET /admin/systems/{id}/impacts`
- Call `POST /admin/systems/{id}/impacts`
- Call `PATCH /admin/impacts/{id}`
- Call `DELETE /admin/impacts/{id}`
- Call `GET /admin/systems/{id}/revisions`
- Call `POST /admin/systems/{id}/revisions/{revisionId}/restore`
- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.
- Renaming (PATCH slug) keeps the old URL as a permanent redirect; the detail lists previousSlugs. 409 SLUG_TAKEN / SLUG_RESERVED — show the message.
- Every case-study and description edit is kept (BR-1.15); restoring records a new version — nothing is ever overwritten.

### /admin/timeline

**Journey — entries and approvals** — Entries, auto-drafted queue (autoDrafted + draft), publish

- Call `GET /admin/timeline`
- Call `POST /admin/timeline`
- Call `PATCH /admin/timeline/{id}`
- Call `DELETE /admin/timeline/{id}`
- Publishing an auto-drafted entry is the approval.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

## Every endpoint

| Endpoint | Capability | Audience |
|---|---|---|
| `GET /profile` | Owner profile and links | public |
| `GET /home` | Homepage | public |
| `GET /systems` | Systems catalog | public |
| `GET /organizations` | Systems catalog | public |
| `GET /systems/{slug}` | Case study | public |
| `GET /systems/{slug}/related` | Case study | public |
| `GET /search` | Instant search | public |
| `GET /timeline` | Journey | public |
| `GET /skills` | Skills with evidence | public |
| `GET /achievements` | Certifications and awards | public |
| `GET /metrics` | Curated numbers | public |
| `GET /cv/options` | CV — the options, view and download | public |
| `GET /cv` | CV — the options, view and download | public |
| `POST /cv/generate` | CV — the options, view and download | public |
| `GET /cv/documents/{id}` | CV — the options, view and download | public |
| `GET /cv/uploads/{id}` | CV — the options, view and download | public |
| `POST /inquiries` | Contact — send an inquiry | public |
| `GET /lookups/{type}` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /lookups/{type}` | Lookups — statuses, domains, types, categories, relationships | public |
| `PATCH /lookups/{type}/{id}` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /lookups/{type}/{id}/deprecate` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /admin/auth/login` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/verify-2fa` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/change-password` | Admin sign-in (password + 2FA) | admin |
| `GET /admin/overview` | Admin dashboard | admin |
| `GET /admin/systems` | Systems — curate, publish, feature | admin |
| `POST /admin/systems` | Systems — curate, publish, feature | admin |
| `GET /admin/systems/{id}` | Systems — curate, publish, feature | admin |
| `PATCH /admin/systems/{id}` | Systems — curate, publish, feature | admin |
| `PUT /admin/systems/{id}/skills` | Systems — curate, publish, feature | admin |
| `GET /admin/systems/{id}/impacts` | Systems — curate, publish, feature | admin |
| `POST /admin/systems/{id}/impacts` | Systems — curate, publish, feature | admin |
| `PATCH /admin/impacts/{id}` | Systems — curate, publish, feature | admin |
| `DELETE /admin/impacts/{id}` | Systems — curate, publish, feature | admin |
| `GET /admin/systems/{id}/revisions` | Systems — curate, publish, feature | admin |
| `POST /admin/systems/{id}/revisions/{revisionId}/restore` | Systems — curate, publish, feature | admin |
| `GET /admin/organizations` | Organizations | admin |
| `POST /admin/organizations` | Organizations | admin |
| `PATCH /admin/organizations/{id}` | Organizations | admin |
| `GET /admin/inquiries` | Inquiries — triage | admin |
| `PATCH /admin/inquiries/{id}` | Inquiries — triage | admin |
| `GET /admin/timeline` | Journey — entries and approvals | admin |
| `POST /admin/timeline` | Journey — entries and approvals | admin |
| `PATCH /admin/timeline/{id}` | Journey — entries and approvals | admin |
| `DELETE /admin/timeline/{id}` | Journey — entries and approvals | admin |
| `GET /admin/cv/experience` | CV content, options, uploads, completeness and history | admin |
| `POST /admin/cv/experience` | CV content, options, uploads, completeness and history | admin |
| `PATCH /admin/cv/experience/{id}` | CV content, options, uploads, completeness and history | admin |
| `DELETE /admin/cv/experience/{id}` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/education` | CV content, options, uploads, completeness and history | admin |
| `POST /admin/cv/education` | CV content, options, uploads, completeness and history | admin |
| `PATCH /admin/cv/education/{id}` | CV content, options, uploads, completeness and history | admin |
| `DELETE /admin/cv/education/{id}` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/skills` | CV content, options, uploads, completeness and history | admin |
| `POST /admin/cv/skills` | CV content, options, uploads, completeness and history | admin |
| `PATCH /admin/cv/skills/{id}` | CV content, options, uploads, completeness and history | admin |
| `DELETE /admin/cv/skills/{id}` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/check` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/documents` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/uploads` | CV content, options, uploads, completeness and history | admin |
| `POST /admin/cv/uploads` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/uploads/{id}` | CV content, options, uploads, completeness and history | admin |
| `POST /admin/cv/uploads/{id}/restore` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/cv/options` | CV content, options, uploads, completeness and history | admin |
| `PATCH /admin/cv/options` | CV content, options, uploads, completeness and history | admin |
| `GET /admin/profile` | Profile, links and achievements | admin |
| `PATCH /admin/profile` | Profile, links and achievements | admin |
| `POST /admin/profile/links` | Profile, links and achievements | admin |
| `PATCH /admin/profile/links/{id}` | Profile, links and achievements | admin |
| `DELETE /admin/profile/links/{id}` | Profile, links and achievements | admin |
| `GET /admin/achievements` | Profile, links and achievements | admin |
| `POST /admin/achievements` | Profile, links and achievements | admin |
| `PATCH /admin/achievements/{id}` | Profile, links and achievements | admin |
| `DELETE /admin/achievements/{id}` | Profile, links and achievements | admin |
| `GET /admin/metrics` | Curated numbers — define, propose, decide | admin |
| `POST /admin/metrics` | Curated numbers — define, propose, decide | admin |
| `PATCH /admin/metrics/{key}` | Curated numbers — define, propose, decide | admin |
| `POST /admin/metrics/{key}/proposals` | Curated numbers — define, propose, decide | admin |
| `POST /admin/metrics/compute` | Curated numbers — define, propose, decide | admin |
| `POST /admin/metrics/snapshots/{id}/approve` | Curated numbers — define, propose, decide | admin |
| `POST /admin/metrics/snapshots/{id}/reject` | Curated numbers — define, propose, decide | admin |
| `GET /admin/settings/platform` | Platform settings, feature flags, visitor lenses | admin |
| `PATCH /admin/settings/platform/{key}` | Platform settings, feature flags, visitor lenses | admin |
| `GET /admin/settings/flags` | Platform settings, feature flags, visitor lenses | admin |
| `PATCH /admin/settings/flags/{key}` | Platform settings, feature flags, visitor lenses | admin |
| `GET /admin/settings/lenses` | Platform settings, feature flags, visitor lenses | admin |
| `POST /admin/settings/lenses` | Platform settings, feature flags, visitor lenses | admin |
| `PATCH /admin/settings/lenses/{id}` | Platform settings, feature flags, visitor lenses | admin |
| `GET /admin/activity-log` | Audit trail | admin |
| `GET /admin/jobs` | Job runs | admin |
