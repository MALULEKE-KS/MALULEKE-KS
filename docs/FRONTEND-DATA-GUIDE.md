<!-- Generated from lib/capabilities/map.ts by `npm run docs:capabilities`. Don't edit by hand — edit the map. -->

# Frontend data guide

Page by page, every piece of data and every action the backend offers — so a redesign can't miss a capability that exists in the database. Pages marked *(proposed)* don't exist yet; their data and actions do. Rules a screen must respect are in each item's notes. The backend view of the same map is `docs/BACKEND-API-GUIDE.md`.

## Public site

### (every page)

**Owner profile and links** — Header name, footer contact and social links

- Call `GET /profile`
- Call `GET /profile/photo/{purpose}`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).
- titles[] are the owner's current titles and qualifications, in order — show them together wherever the name appears; never type a title into a page (F5c, D13).
- photos.{purpose} gives a cache-safe url, alt text and size — use it with next/image; a missing purpose means no photo yet: render nothing (BR-1.17).

**GitHub homes** — Footer: the three homes with their system counts

- Call `GET /homes`
- Counts come from the database and never include a draft, a scheduled system or an unnamed client (BR-1.4).

**Visitor lenses** — AI guide: opening chips

- Call `GET /lenses`
- Key and label only — the framing prompt and priority content stay private (they are the guide's instructions).

**Public GitHub work** — AI guide: its GitHub knowledge

- Call `GET /github/repos`
- Call `GET /github/commits`
- The sync stores a README and commits for public repos only, and wipes them if a repo turns private.

**The AI guide** — Docked launcher and the chat panel (the same console and conversation)

- Call `POST /guide`
- Call `POST /guide/warm`
- Off unless concierge.enabled is on; every limit (model, questions per conversation and per visitor, daily cap, answer length, context budget) is a concierge.* setting.
- Grounded only in the public views, read through the public role; the lens framing prompt is read server-side and never sent to the browser.
- The instant lane (flag concierge.instant_lane): pure-data questions — contact, the CV, how many systems, the platform's numbers — are answered from the data with no model, in the wording of the guide-instant content block, before any limit is spent. POST /guide/warm primes the server when a visitor focuses the chat.

**Platform pulse** — Footer status line

- Call `GET /platform/pulse`
- Aggregates only — no rows, no actors. deployment is null outside Vercel.

**Instant search** — ⌘K search palette

- Call `GET /search`
- Results: kind (system → /systems/{key}, journey → /journey#{key}, skill), title, subtitle.
- Debounce typing; 429 means slow down (limits are admin settings search.rateLimit.*).
- Queries under 2 characters are refused — don't send them.

### /

**Owner profile and links** — Hero: name, headline

- Call `GET /profile`
- Call `GET /profile/photo/{purpose}`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).
- titles[] are the owner's current titles and qualifications, in order — show them together wherever the name appears; never type a title into a page (F5c, D13).
- photos.{purpose} gives a cache-safe url, alt text and size — use it with next/image; a missing purpose means no photo yet: render nothing (BR-1.17).

**GitHub homes** — System map: homes → systems → technologies

- Call `GET /homes`
- Counts come from the database and never include a draft, a scheduled system or an unnamed client (BR-1.4).

**Visitor lenses** — Hero: lens chips

- Call `GET /lenses`
- Key and label only — the framing prompt and priority content stay private (they are the guide's instructions).

**Weekly build activity** — Selected work: a sparkline on each system

- Call `GET /activity`
- Only systems that are live on the site; no commit content, no authors.

**The AI guide** — Hero: the character, greeting and lens chips; The AI guide's console: the character at work, the trail, live cards and sources

- Call `POST /guide`
- Call `POST /guide/warm`
- Off unless concierge.enabled is on; every limit (model, questions per conversation and per visitor, daily cap, answer length, context budget) is a concierge.* setting.
- Grounded only in the public views, read through the public role; the lens framing prompt is read server-side and never sent to the browser.
- The instant lane (flag concierge.instant_lane): pure-data questions — contact, the CV, how many systems, the platform's numbers — are answered from the data with no model, in the wording of the guide-instant content block, before any limit is spent. POST /guide/warm primes the server when a visitor focuses the chat.

**Platform pulse** — Control room

- Call `GET /platform/pulse`
- Aggregates only — no rows, no actors. deployment is null outside Vercel.

**Homepage** — Hero ledger (years building, organizations founded, shipped / in progress / queued); Featured work (the admin's picks, in order); Control room: approved figures (approved metrics only)

- Call `GET /home`
- Ledger counts are live content facts; metrics are curated snapshots — label them differently (BR-5.3).
- featured falls back to flagship-first until the admin picks some; never empty while anything is published.

**Page content blocks** — Principles band

- Call `GET /content/{key}`
- 404 for an unknown or empty block — hide the section rather than showing placeholder copy.

**Case study** — Selected work: each system's screenshot

- Call `GET /systems/{slug}`
- Call `GET /systems/{slug}/related`
- Call `GET /systems/{slug}/screenshot`
- An unknown or unpublished slug is a plain 404 — never a "private" message (BR-1.3/1.4).
- liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.
- An old slug answers with a permanent redirect (308) to the current one — follow it; links from before a rename keep working (BR-1.14).
- caseStudyAuthor = ai means the case study was written by AI from the public repo (BR-4.5): label it, with caseStudyWrittenAt.
- screenshotUrl points at /systems/{slug}/screenshot?v=… when a screenshot is stored (captured or uploaded, BR-1.18) — the link is immutable; never present for NDA work.

**Curated numbers** — Control room: approved figures

- Call `GET /metrics`
- Show approvedAt as "as of" — these are point-in-time figures.

**CV — the options, view and download** — Header and phone menu: a CV button to the uploaded file while it's offered; the home hero's 'Get my CV'

- Call `GET /cv/options`
- Call `GET /cv`
- Call `POST /cv/generate`
- Call `GET /cv/documents/{id}`
- Call `GET /cv/uploads/{id}`
- Start from GET /cv/options: show exactly those options, in that order, with their labels — never assume either exists.
- Never present one option as the other: the uploaded CV is the owner's file as uploaded; the generated one is live data (BR-7.1).
- Render GET /cv exactly — it's the same model the generated files come from. It, generate and document downloads are 404 while the generated option is hidden.
- POST /cv/generate returns a fileUrl; navigate to it to download. Uploaded files are plain links (files[].url). 429 = rate-limited.

**Let's Talk — send a message** — Let's talk band: each category opens /contact?about=<key>

- Call `POST /inquiries`
- Call `GET /inquiries/form`
- Call `GET /inquiries/types`
- Fetch GET /inquiries/form when the form is shown and send its token as formToken; include the hidden honeypot field "website" (the visitor's own site is organizationWebsite).
- Send an idempotencyKey (uuid), kept across retries, so a double-submit returns the original confirmation.
- The review promise comes from the inquiry.reviewSlaHours setting — don't hardcode "48 hours".
- Show the reference from the response; it identifies the message, it never unlocks anything.

### /about

**Owner profile and links** — Bio, availability, location, building since

- Call `GET /profile`
- Call `GET /profile/photo/{purpose}`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).
- titles[] are the owner's current titles and qualifications, in order — show them together wherever the name appears; never type a title into a page (F5c, D13).
- photos.{purpose} gives a cache-safe url, alt text and size — use it with next/image; a missing purpose means no photo yet: render nothing (BR-1.17).

**Page content blocks** — Method: the mission and principles, each with its evidence (#method)

- Call `GET /content/{key}`
- 404 for an unknown or empty block — hide the section rather than showing placeholder copy.

**Skills with evidence** — Skills, with the evidence for each (#skills)

- Call `GET /skills`
- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

**Certifications and awards** — Certifications and awards

- Call `GET /achievements`
- systemSlug links an achievement to its case study when present.

**Curated numbers** — By the numbers

- Call `GET /metrics`
- Show approvedAt as "as of" — these are point-in-time figures.

**CV — the options, view and download** — Download my CV, while the uploaded option is offered

- Call `GET /cv/options`
- Call `GET /cv`
- Call `POST /cv/generate`
- Call `GET /cv/documents/{id}`
- Call `GET /cv/uploads/{id}`
- Start from GET /cv/options: show exactly those options, in that order, with their labels — never assume either exists.
- Never present one option as the other: the uploaded CV is the owner's file as uploaded; the generated one is live data (BR-7.1).
- Render GET /cv exactly — it's the same model the generated files come from. It, generate and document downloads are 404 while the generated option is hidden.
- POST /cv/generate returns a fileUrl; navigate to it to download. Uploaded files are plain links (files[].url). 429 = rate-limited.

### /contact

**Owner profile and links** — Email, phone (only when set), links

- Call `GET /profile`
- Call `GET /profile/photo/{purpose}`
- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).
- titles[] are the owner's current titles and qualifications, in order — show them together wherever the name appears; never type a title into a page (F5c, D13).
- photos.{purpose} gives a cache-safe url, alt text and size — use it with next/image; a missing purpose means no photo yet: render nothing (BR-1.17).

**The AI guide** — A draft from the guide, for the visitor to review and send

- Call `POST /guide`
- Call `POST /guide/warm`
- Off unless concierge.enabled is on; every limit (model, questions per conversation and per visitor, daily cap, answer length, context budget) is a concierge.* setting.
- Grounded only in the public views, read through the public role; the lens framing prompt is read server-side and never sent to the browser.
- The instant lane (flag concierge.instant_lane): pure-data questions — contact, the CV, how many systems, the platform's numbers — are answered from the data with no model, in the wording of the guide-instant content block, before any limit is spent. POST /guide/warm primes the server when a visitor focuses the chat.

**Let's Talk — send a message** — What brings you here? — the category tiles (GET /inquiries/types); The form shaped to the category, and the confirmation with its reference

- Call `POST /inquiries`
- Call `GET /inquiries/form`
- Call `GET /inquiries/types`
- Fetch GET /inquiries/form when the form is shown and send its token as formToken; include the hidden honeypot field "website" (the visitor's own site is organizationWebsite).
- Send an idempotencyKey (uuid), kept across retries, so a double-submit returns the original confirmation.
- The review promise comes from the inquiry.reviewSlaHours setting — don't hardcode "48 hours".
- Show the reference from the response; it identifies the message, it never unlocks anything.

**Lookups — statuses, domains, types, categories, relationships** — Inquiry type select

- Call `GET /lookups/{type}`
- Call `POST /lookups/{type}`
- Call `PATCH /lookups/{type}/{id}`
- Call `POST /lookups/{type}/{id}/deprecate`
- 409 LOOKUP_KEY_DEPRECATED means offer "reactivate" instead of creating again (BR-8.3).

### /cv

**CV — the options, view and download** — Redirects to the uploaded CV file (or About when it's off). The generated CV is dormant (owner, 2026-10-02): switched off in Admin → CV, its page kept unrouted

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

### /now (proposed)

**Public GitHub work** — What's changing: recent commits and active repos

- Call `GET /github/repos`
- Call `GET /github/commits`
- The sync stores a README and commits for public repos only, and wipes them if a repo turns private.

**Weekly build activity** — What's moving this week

- Call `GET /activity`
- Only systems that are live on the site; no commit content, no authors.

### /organizations/[slug] (proposed)

**GitHub homes** — One page per home

- Call `GET /homes`
- Counts come from the database and never include a draft, a scheduled system or an unnamed client (BR-1.4).

### /systems

**Public GitHub work** — Each card: languages and last push

- Call `GET /github/repos`
- Call `GET /github/commits`
- The sync stores a README and commits for public repos only, and wipes them if a repo turns private.

**Weekly build activity** — Each card: a 26-week sparkline and a live marker when it moved this month

- Call `GET /activity`
- Only systems that are live on the site; no commit content, no authors.

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

**Public GitHub work** — At a glance: languages and topics; proof strip: started, last push, commits this year; latest commits

- Call `GET /github/repos`
- Call `GET /github/commits`
- The sync stores a README and commits for public repos only, and wipes them if a repo turns private.

**Weekly build activity** — Activity: 26 weeks of commits as bars

- Call `GET /activity`
- Only systems that are live on the site; no commit content, no authors.

**Case study** — Header, case study body, impacts, testimonials; Who wrote the case study: an "AI" label when it was written from the repo; The screenshot of the live site, in a browser frame; Related systems

- Call `GET /systems/{slug}`
- Call `GET /systems/{slug}/related`
- Call `GET /systems/{slug}/screenshot`
- An unknown or unpublished slug is a plain 404 — never a "private" message (BR-1.3/1.4).
- liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.
- An old slug answers with a permanent redirect (308) to the current one — follow it; links from before a rename keep working (BR-1.14).
- caseStudyAuthor = ai means the case study was written by AI from the public repo (BR-4.5): label it, with caseStudyWrittenAt.
- screenshotUrl points at /systems/{slug}/screenshot?v=… when a screenshot is stored (captured or uploaded, BR-1.18) — the link is immutable; never present for NDA work.

**Skills with evidence** — Skills this system proves (match systemSlugs)

- Call `GET /skills`
- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

## Admin

### /admin

**Admin dashboard** — Attention list, pipeline, CV score, jobs, recent activity

- Call `GET /admin/overview`
- Each attention count links to its screen, filtered (e.g. /admin/inquiries?overdue=true).

**Freshness nudges** — Attention: stale content count (overview attention.staleContent)

- Call `GET /admin/freshness`
- Call `POST /admin/freshness/{kind}/{id}/reviewed`
- Only a real edit to what visitors see, or Mark reviewed, restarts the clock; GitHub sync updates don't (BR-1.16).
- The threshold is the setting content.freshnessDays (default 90).

**Scheduled jobs and their runs** — Last run per job (overview.jobs)

- Call `GET /admin/jobs`
- Call `POST /admin/jobs/{job}/run`
- Run now answers 409 ALREADY_RUNNING while a run holds the lock; a failed run answers 500 with its recorded error.
- github.sync summaries list unmappedOwners (map them via an Organization's githubLogins), activityPending (GitHub still computing; retried next run) and accountErrors (an account that refused the token, with GitHub's reason — the other accounts still sync).

### /admin/account

**Admin sign-in (password + 2FA)** — Change password; recovery codes — remaining count, low-count notice, regenerate (show the ten codes once)

- Call `POST /admin/auth/login`
- Call `POST /admin/auth/verify-2fa`
- Call `POST /admin/auth/logout`
- Call `POST /admin/auth/change-password`
- Call `GET /admin/auth/recovery-codes`
- Call `POST /admin/auth/recovery-codes`
- Show neutral copy on expiry ("session ended"), not an error.
- Sign-out (POST /admin/auth/logout) ends every session, not just this browser's.
- Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in.
- Show ACCOUNT_LOCKED with its lockedUntil countdown — lockouts grow with repeated failures (BR-3.2).
- Regenerated recovery codes are in that one response only — make the admin save them before leaving (BR-3.12).
- Mutations must come from this site's own pages; a 403 CSRF_REJECTED means a cross-site request (BR-3.9).

### /admin/activity-log

**Audit trail** — Log with filters (entity, action, actor, date range), before/after diff

- Call `GET /admin/activity-log`
- "[redacted]" marks a secret or personal field that's never stored in the log.

### /admin/content

**Page content blocks** — One editor per block; save replaces the block

- Call `GET /admin/content`
- Call `GET /admin/content/{key}`
- Call `PUT /admin/content/{key}`
- Each key has a schema (lib/content/blocks.ts); a body that doesn't match is refused with the issues.
- An unknown key is 404 — a new block is one registry entry and one row, no migration.

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

### /admin/freshness

**Freshness nudges** — Stale items oldest first — open to edit, or Mark reviewed

- Call `GET /admin/freshness`
- Call `POST /admin/freshness/{kind}/{id}/reviewed`
- Only a real edit to what visitors see, or Mark reviewed, restarts the clock; GitHub sync updates don't (BR-1.16).
- The threshold is the setting content.freshnessDays (default 90).

### /admin/guide

**AI guide health** — Guide health: daily self-check, questions, failures, timings, models, per-day chart, latest turns

- Call `GET /admin/guide/health`
- The window is 1, 7 or 30 days (?days=). Rows are pruned by the daily maintenance job after the setting concierge.metricsRetentionDays (default 180).
- outcome is one of answered, instant, busy, error, aborted, limited, resting — fixed by a CHECK in the database. The canary's own questions are stored with source = canary and kept out of the visitors' numbers.
- The canary is the job guide.canary (run it now with POST /admin/jobs/{job}/run, see admin.jobs), on its own cron entry (01:30 UTC) so it keeps its own 300-second budget; each run is a GuideEvalRun row (fixed question ids and pass/fail/unavailable — never answers or visitor text). A failed check fails the job, which shows red on Admin → Jobs.

### /admin/inquiries

**Inquiries — Let's Talk management** — Inbox: search, filters, overdue and duplicate flags, failed-email banner

- Call `GET /admin/inquiries`
- Call `GET /admin/inquiries/{id}`
- Call `PATCH /admin/inquiries/{id}`
- Call `POST /admin/inquiries/{id}/notes`
- Call `POST /admin/inquiries/{id}/messages`
- Call `POST /admin/inquiries/{id}/meetings`
- Call `PATCH /admin/inquiries/{id}/meetings/{meetingId}`
- Call `GET /admin/inquiries/{id}/documents/{documentId}`
- Call `GET /admin/notifications`
- Call `POST /admin/notifications/{id}/retry`
- Call `GET /admin/inquiry-subtypes`
- Call `POST /admin/inquiry-subtypes`
- Call `PATCH /admin/inquiry-subtypes/{id}`
- Offer only the moves in nextStatuses; send expectedVersion — 409 STALE means reload.
- internalReason is private; applicantMessage is what they were told — never mix them.

### /admin/inquiries/[id]

**Inquiries — Let's Talk management** — Workbench: status (stale-screen guard), priority, details, meetings, documents, messages, notes, history, emails

- Call `GET /admin/inquiries`
- Call `GET /admin/inquiries/{id}`
- Call `PATCH /admin/inquiries/{id}`
- Call `POST /admin/inquiries/{id}/notes`
- Call `POST /admin/inquiries/{id}/messages`
- Call `POST /admin/inquiries/{id}/meetings`
- Call `PATCH /admin/inquiries/{id}/meetings/{meetingId}`
- Call `GET /admin/inquiries/{id}/documents/{documentId}`
- Call `GET /admin/notifications`
- Call `POST /admin/notifications/{id}/retry`
- Call `GET /admin/inquiry-subtypes`
- Call `POST /admin/inquiry-subtypes`
- Call `PATCH /admin/inquiry-subtypes/{id}`
- Offer only the moves in nextStatuses; send expectedVersion — 409 STALE means reload.
- internalReason is private; applicantMessage is what they were told — never mix them.

### /admin/jobs

**Scheduled jobs and their runs** — Jobs with schedule and last run; runs by job, failures first; Run now

- Call `GET /admin/jobs`
- Call `POST /admin/jobs/{job}/run`
- Run now answers 409 ALREADY_RUNNING while a run holds the lock; a failed run answers 500 with its recorded error.
- github.sync summaries list unmappedOwners (map them via an Organization's githubLogins), activityPending (GitHub still computing; retried next run) and accountErrors (an account that refused the token, with GitHub's reason — the other accounts still sync).

### /admin/login

**Admin sign-in (password + 2FA)** — Password step, 2FA step, recovery-code option

- Call `POST /admin/auth/login`
- Call `POST /admin/auth/verify-2fa`
- Call `POST /admin/auth/logout`
- Call `POST /admin/auth/change-password`
- Call `GET /admin/auth/recovery-codes`
- Call `POST /admin/auth/recovery-codes`
- Show neutral copy on expiry ("session ended"), not an error.
- Sign-out (POST /admin/auth/logout) ends every session, not just this browser's.
- Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in.
- Show ACCOUNT_LOCKED with its lockedUntil countdown — lockouts grow with repeated failures (BR-3.2).
- Regenerated recovery codes are in that one response only — make the admin save them before leaving (BR-3.12).
- Mutations must come from this site's own pages; a 403 CSRF_REJECTED means a cross-site request (BR-3.9).

### /admin/numbers

**Curated numbers — define, propose, decide** — Metrics, pending proposals with approve / reject, history

- Call `GET /admin/metrics`
- Call `POST /admin/metrics`
- Call `PATCH /admin/metrics/{key}`
- Call `POST /admin/metrics/{key}/proposals`
- Call `POST /admin/metrics/compute`
- Call `POST /admin/metrics/snapshots/{id}/approve`
- Call `POST /admin/metrics/snapshots/{id}/reject`
- A proposal's value can't be edited — enter a new one (the database refuses changes).

### /admin/organizations

**Organizations** — List and editor

- Call `GET /admin/organizations`
- Call `POST /admin/organizations`
- Call `PATCH /admin/organizations/{id}`
- isClient only affects systems created afterwards (BR-1.2) — say so next to the switch.

### /admin/profile

**Profile, links and achievements** — Profile form, links, achievements

- Call `GET /admin/profile`
- Call `PATCH /admin/profile`
- Call `GET /admin/profile/photos`
- Call `POST /admin/profile/photos`
- Call `GET /admin/profile/photos/{id}`
- Call `PATCH /admin/profile/photos/{id}`
- Call `POST /admin/profile/photos/{id}/restore`
- Call `GET /admin/profile/titles`
- Call `POST /admin/profile/titles`
- Call `PATCH /admin/profile/titles/{id}`
- Call `DELETE /admin/profile/titles/{id}`
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
- Call `POST /admin/systems/{id}/writeup`
- Call `GET /admin/systems/{id}/screenshot`
- Call `POST /admin/systems/{id}/screenshot`
- Call `POST /admin/systems/{id}/screenshot/capture`
- Call `POST /admin/systems/{id}/screenshot/automatic`
- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.
- Renaming (PATCH slug) keeps the old URL as a permanent redirect; the detail lists previousSlugs. 409 SLUG_TAKEN / SLUG_RESERVED — show the message.
- Every case-study and description edit is kept (BR-1.15); restoring records a new version — nothing is ever overwritten.
- writeup.descriptionSource / caseStudySource (BR-4.5): sync, generated (AI from the repo) or owner. Saving an edit makes a field the owner's, and the database then refuses any generated write over it. POST …/writeup hands both back to the AI and rewrites them now — 409 WRITEUPS_OFF / NOT_ELIGIBLE, 502 WRITEUP_FAILED, 503 WRITEUPS_UNAVAILABLE: show the message.

### /admin/systems/[id]

**Systems — curate, publish, feature** — Editor, publish controls, homepage + CV placement, repo ownership; Skills, impacts, status history, pace, activity chart; Revision history for the case study and description: versions with who and when, restore; Who wrote the summary and case study (you / AI from the repo), Regenerate from repo; Screenshot: the current one and where it came from; Upload, Capture now, Back to automatic

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
- Call `POST /admin/systems/{id}/writeup`
- Call `GET /admin/systems/{id}/screenshot`
- Call `POST /admin/systems/{id}/screenshot`
- Call `POST /admin/systems/{id}/screenshot/capture`
- Call `POST /admin/systems/{id}/screenshot/automatic`
- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.
- Renaming (PATCH slug) keeps the old URL as a permanent redirect; the detail lists previousSlugs. 409 SLUG_TAKEN / SLUG_RESERVED — show the message.
- Every case-study and description edit is kept (BR-1.15); restoring records a new version — nothing is ever overwritten.
- writeup.descriptionSource / caseStudySource (BR-4.5): sync, generated (AI from the repo) or owner. Saving an edit makes a field the owner's, and the database then refuses any generated write over it. POST …/writeup hands both back to the AI and rewrites them now — 409 WRITEUPS_OFF / NOT_ELIGIBLE, 502 WRITEUP_FAILED, 503 WRITEUPS_UNAVAILABLE: show the message.

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
| `GET /profile/photo/{purpose}` | Owner profile and links | public |
| `GET /homes` | GitHub homes | public |
| `GET /lenses` | Visitor lenses | public |
| `GET /github/repos` | Public GitHub work | public |
| `GET /github/commits` | Public GitHub work | public |
| `GET /activity` | Weekly build activity | public |
| `POST /guide` | The AI guide | public |
| `POST /guide/warm` | The AI guide | public |
| `GET /platform/pulse` | Platform pulse | public |
| `GET /home` | Homepage | public |
| `GET /content/{key}` | Page content blocks | public |
| `GET /systems` | Systems catalog | public |
| `GET /organizations` | Systems catalog | public |
| `GET /systems/{slug}` | Case study | public |
| `GET /systems/{slug}/related` | Case study | public |
| `GET /systems/{slug}/screenshot` | Case study | public |
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
| `POST /inquiries` | Let's Talk — send a message | public |
| `GET /inquiries/form` | Let's Talk — send a message | public |
| `GET /inquiries/types` | Let's Talk — send a message | public |
| `GET /lookups/{type}` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /lookups/{type}` | Lookups — statuses, domains, types, categories, relationships | public |
| `PATCH /lookups/{type}/{id}` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /lookups/{type}/{id}/deprecate` | Lookups — statuses, domains, types, categories, relationships | public |
| `POST /admin/auth/login` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/verify-2fa` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/logout` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/change-password` | Admin sign-in (password + 2FA) | admin |
| `GET /admin/auth/recovery-codes` | Admin sign-in (password + 2FA) | admin |
| `POST /admin/auth/recovery-codes` | Admin sign-in (password + 2FA) | admin |
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
| `POST /admin/systems/{id}/writeup` | Systems — curate, publish, feature | admin |
| `GET /admin/systems/{id}/screenshot` | Systems — curate, publish, feature | admin |
| `POST /admin/systems/{id}/screenshot` | Systems — curate, publish, feature | admin |
| `POST /admin/systems/{id}/screenshot/capture` | Systems — curate, publish, feature | admin |
| `POST /admin/systems/{id}/screenshot/automatic` | Systems — curate, publish, feature | admin |
| `GET /admin/organizations` | Organizations | admin |
| `POST /admin/organizations` | Organizations | admin |
| `PATCH /admin/organizations/{id}` | Organizations | admin |
| `GET /admin/inquiries` | Inquiries — Let's Talk management | admin |
| `GET /admin/inquiries/{id}` | Inquiries — Let's Talk management | admin |
| `PATCH /admin/inquiries/{id}` | Inquiries — Let's Talk management | admin |
| `POST /admin/inquiries/{id}/notes` | Inquiries — Let's Talk management | admin |
| `POST /admin/inquiries/{id}/messages` | Inquiries — Let's Talk management | admin |
| `POST /admin/inquiries/{id}/meetings` | Inquiries — Let's Talk management | admin |
| `PATCH /admin/inquiries/{id}/meetings/{meetingId}` | Inquiries — Let's Talk management | admin |
| `GET /admin/inquiries/{id}/documents/{documentId}` | Inquiries — Let's Talk management | admin |
| `GET /admin/notifications` | Inquiries — Let's Talk management | admin |
| `POST /admin/notifications/{id}/retry` | Inquiries — Let's Talk management | admin |
| `GET /admin/inquiry-subtypes` | Inquiries — Let's Talk management | admin |
| `POST /admin/inquiry-subtypes` | Inquiries — Let's Talk management | admin |
| `PATCH /admin/inquiry-subtypes/{id}` | Inquiries — Let's Talk management | admin |
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
| `GET /admin/profile/photos` | Profile, links and achievements | admin |
| `POST /admin/profile/photos` | Profile, links and achievements | admin |
| `GET /admin/profile/photos/{id}` | Profile, links and achievements | admin |
| `PATCH /admin/profile/photos/{id}` | Profile, links and achievements | admin |
| `POST /admin/profile/photos/{id}/restore` | Profile, links and achievements | admin |
| `GET /admin/profile/titles` | Profile, links and achievements | admin |
| `POST /admin/profile/titles` | Profile, links and achievements | admin |
| `PATCH /admin/profile/titles/{id}` | Profile, links and achievements | admin |
| `DELETE /admin/profile/titles/{id}` | Profile, links and achievements | admin |
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
| `GET /admin/content` | Page content blocks | admin |
| `GET /admin/content/{key}` | Page content blocks | admin |
| `PUT /admin/content/{key}` | Page content blocks | admin |
| `GET /admin/freshness` | Freshness nudges | admin |
| `POST /admin/freshness/{kind}/{id}/reviewed` | Freshness nudges | admin |
| `GET /admin/jobs` | Scheduled jobs and their runs | admin |
| `POST /admin/jobs/{job}/run` | Scheduled jobs and their runs | admin |
| `GET /admin/guide/health` | AI guide health | admin |
