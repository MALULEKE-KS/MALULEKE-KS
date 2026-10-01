<!-- Generated from lib/capabilities/map.ts by `npm run docs:capabilities`. Don't edit by hand — edit the map. -->

# Backend API guide

Every capability the platform has: the database objects behind it, the endpoints that serve it, and the business rules it enforces. Nothing in the database is left without an endpoint unless it's listed under *Not exposed*, with the reason. The frontend view of the same map is `docs/FRONTEND-DATA-GUIDE.md`.

**33 capabilities · 118 endpoints.**

## Public

### Owner profile and links

`profile` · public

Who the owner is — name, headline, role, location, contact, summary, bio, availability, building-since year, social links, and the organizations founded or co-founded. All admin-edited data.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /profile`
- `GET /profile/photo/{purpose}`

**Database**

- `PublicProfile`
- `PublicProfileLink`
- `PublicAffiliation`
- `PublicProfileTitle`
- `PublicProfilePhoto`

**Rules:** —

**Notes**

- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).
- titles[] are the owner's current titles and qualifications, in order — show them together wherever the name appears; never type a title into a page (F5c, D13).
- photos.{purpose} gives a cache-safe url, alt text and size — use it with next/image; a missing purpose means no photo yet: render nothing (BR-1.17).

### GitHub homes

`homes` · public

The organisations the owner's repositories live under — their own account and their ventures — each with role, GitHub accounts and how many published systems it holds (F5c, D12).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /homes`

**Database**

- `PublicHome`
- `OrganizationKind`
- `PublicSystemHome`

**Rules:** BR-1.4, BR-1.13

**Notes**

- Counts come from the database and never include a draft, a scheduled system or an unnamed client (BR-1.4).

### Visitor lenses

`lenses` · public

The lenses a visitor picks to frame the site and the AI guide — I'm hiring, I have a project, I'm an engineer, just exploring — in the owner's order (Constitution §4).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /lenses`

**Database**

- `PublicVisitorLens`

**Rules:** —

**Notes**

- Key and label only — the framing prompt and priority content stay private (they are the guide's instructions).

### Public GitHub work

`github` · public

Every public repo in the owner's homes — from the day it began — with languages, topics, stars, activity and README excerpt, and the last 90 days of commits. Refreshed by the daily GitHub sync; private, archived and client-restricted repos never appear (F5c).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /github/repos`
- `GET /github/commits`

**Database**

- `PublicGithubRepo`
- `PublicRepoCommit`
- `RepoCommit`

**Rules:** BR-1.3, BR-1.4, BR-1.7

**Notes**

- The sync stores a README and commits for public repos only, and wipes them if a repo turns private.

### Weekly build activity

`activity` · public

Commits per week for each published system over the last 26 weeks — counts only, from the daily GitHub sync (F5c).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /activity`

**Database**

- `PublicSystemActivity`

**Rules:** BR-1.1, BR-1.13

**Notes**

- Only systems that are live on the site; no commit content, no authors.

### The AI guide

`guide` · public

The owner's AI guide: answers visitors from the site's public data, cites the page each fact came from, and can open a page, search the site or draft the contact form for the visitor to send — each tool behind its own flag (Constitution §6, PUBLIC-REDESIGN-PLAN §3a).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `POST /guide`

**Database**

- `PublicFlag`
- `VisitorLens`

**Rules:** BR-2.4, BR-4.1, BR-4.2, BR-4.3, BR-4.4, BR-4.6

**Notes**

- Off unless concierge.enabled is on; every limit (model, questions per conversation and per visitor, daily cap, answer length, context budget) is a concierge.* setting.
- Grounded only in the public views, read through the public role; the lens framing prompt is read server-side and never sent to the browser.

### Platform pulse

`platform.pulse` · public

The platform reporting on itself — business rules the database enforces (counted from its own constraints, triggers and functions), audit events, the last successful job and GitHub sync, the running build (F5c §3.2).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /platform/pulse`

**Database**

- `PublicPlatformPulse`
- `ActivityLog`
- `JobRun`

**Rules:** BR-3.4

**Notes**

- Aggregates only — no rows, no actors. deployment is null outside Vercel.

### Homepage

`home` · public

Everything the homepage shows in one call: the live ledger, the admin's homepage picks, the published-systems count and the admin-approved numbers.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /home`

**Database**

- `PublicLedger`
- `PublicSystem`
- `PublicMetric`

**Rules:** BR-1.1, BR-5.3

**Notes**

- Ledger counts are live content facts; metrics are curated snapshots — label them differently (BR-5.3).
- featured falls back to flagship-first until the admin picks some; never empty while anything is published.

### Page content blocks

`content` · public

Admin-edited site copy by key — e.g. how-i-build: the mission statement and governing principles (#106).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /content/{key}`

**Database**

- `PublicSiteContent`

**Rules:** —

**Notes**

- 404 for an unknown or empty block — hide the section rather than showing placeholder copy.

### Systems catalog

`systems.catalog` · public

Published systems with filters by organization, domain, status and flagship; the organizations list for the filter shows only names that are disclosed.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /systems`
- `GET /organizations`

**Database**

- `PublicSystem`
- `PublicOrganization`
- `Status`
- `Domain`

**Rules:** BR-1.1, BR-1.3, BR-1.4, BR-1.7

**Notes**

- organization may be a masked label ("a fintech client") — show it as text, never link it.
- repoPrivate = true means repoUrl is null: show a private-repository lock and a Request access action (to /contact).
- Status colour comes from statusColorToken — never map status keys to colours in code (EXT-1).

### Case study

`systems.caseStudy` · public

One published system in full — case study body, measured impacts, permitted testimonials — and related systems in the same domain.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /systems/{slug}`
- `GET /systems/{slug}/related`

**Database**

- `PublicSystem`
- `PublicImpact`
- `PublicTestimonial`
- `PublicSlugRedirect`

**Rules:** BR-1.1, BR-1.3, BR-1.4, BR-1.7, BR-6.1, BR-6.2, BR-1.14, BR-4.5

**Notes**

- An unknown or unpublished slug is a plain 404 — never a "private" message (BR-1.3/1.4).
- liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.
- An old slug answers with a permanent redirect (308) to the current one — follow it; links from before a rename keep working (BR-1.14).
- caseStudyAuthor = ai means the case study was written by AI from the public repo (BR-4.5): label it, with caseStudyWrittenAt.

### Instant search

`search` · public

Full-text and typo-tolerant search over published systems, journey entries and skills — never hidden work, because it reads the public views only.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /search`

**Database**

- `search_public`
- `rate_limit_hit`

**Rules:** BR-1.1, BR-1.4

**Notes**

- Results: kind (system → /systems/{key}, journey → /journey#{key}, skill), title, subtitle.
- Debounce typing; 429 means slow down (limits are admin settings search.rateLimit.*).
- Queries under 2 characters are refused — don't send them.

### Journey

`journey` · public

The published timeline — education, roles, launches, achievements — filterable by milestone type. Entries about a system appear only while it's published.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /timeline`

**Database**

- `PublicTimeline`
- `MilestoneType`

**Rules:** BR-1.12

**Notes**

- Filter options come from GET /lookups/milestone-type.

### Skills with evidence

`skills` · public

Every skill with what proves it: published systems that use it, roles and published study — strongest first.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /skills`

**Database**

- `SkillEvidence`
- `Skill`
- `SkillCategory`

**Rules:** BR-1.1

**Notes**

- Show evidence, not self-rating: "used in 3 systems, 2 roles" beats a bar chart.

### Certifications and awards

`achievements` · public

Published achievements; one about a system shows only while that system is published.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /achievements`

**Database**

- `PublicAchievement`

**Rules:** —

**Notes**

- systemSlug links an achievement to its case study when present.

### Curated numbers

`metrics` · public

The admin-approved statistics ("By the numbers"). A computed or entered value is never public until approved.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /metrics`

**Database**

- `PublicMetric`

**Rules:** BR-5.3

**Notes**

- Show approvedAt as "as of" — these are point-in-time figures.

### CV — the options, view and download

`cv` · public

Two clearly labelled CV options (#92): the CV generated from live data — as data for on-screen rendering and as identical ATS-safe PDF or Word files, optionally tailored to a target role — and the owner's uploaded CV file. Each is offered only while the admin shows it.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /cv/options`
- `GET /cv`
- `POST /cv/generate`
- `GET /cv/documents/{id}`
- `GET /cv/uploads/{id}`

**Database**

- `PublicCvOption`
- `PublicCvUpload`
- `PublicExperience`
- `PublicEducation`
- `PublicAchievement`
- `PublicProfile`
- `PublicProfileLink`
- `SkillEvidence`
- `DocumentGen`
- `rate_limit_hit`

**Rules:** BR-7.1, BR-7.2, BR-7.3, BR-7.4, BR-7.5, BR-7.6

**Notes**

- Start from GET /cv/options: show exactly those options, in that order, with their labels — never assume either exists.
- Never present one option as the other: the uploaded CV is the owner's file as uploaded; the generated one is live data (BR-7.1).
- Render GET /cv exactly — it's the same model the generated files come from. It, generate and document downloads are 404 while the generated option is hidden.
- POST /cv/generate returns a fileUrl; navigate to it to download. Uploaded files are plain links (files[].url). 429 = rate-limited.

### Contact — send an inquiry

`inquiries.submit` · public

The single visitor write path: validated, rate-limited, honeypot-protected, idempotent; reviewed within the admin-set deadline.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `POST /inquiries`

**Database**

- `Inquiry`
- `InquiryType`
- `rate_limit_hit`

**Rules:** BR-2.2, BR-2.3, BR-2.4, BR-2.5, BR-2.6, BR-2.7

**Notes**

- Types come from GET /lookups/inquiry-type; include the hidden honeypot field "website".
- Send an idempotencyKey (uuid) so a double-submit returns the original confirmation.
- The review promise comes from the inquiry.reviewSlaHours setting — don't hardcode "48 hours".

### Lookups — statuses, domains, types, categories, relationships

`lookups` · public

Every open list the platform uses, read publicly for filters and forms; created, edited and deprecated by the admin without code changes.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /lookups/{type}`
- `POST /lookups/{type}`
- `PATCH /lookups/{type}/{id}`
- `POST /lookups/{type}/{id}/deprecate`

**Database**

- `Status`
- `Domain`
- `InquiryType`
- `MilestoneType`
- `SkillCategory`
- `RepoRelationship`
- `TitleKind`
- `OrganizationKind`

**Rules:** EXT-1, BR-8.1, BR-8.2, BR-8.3, BR-1.11

**Notes**

- 409 LOOKUP_KEY_DEPRECATED means offer "reactivate" instead of creating again (BR-8.3).

## Admin

Every admin endpoint runs through `withAdmin` (session, then an attributed transaction); the database audits every change (F2.1).

### Admin sign-in (password + 2FA)

`admin.auth` · admin

Password then TOTP or recovery code; lockout, timing-safe, every attempt audited.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `POST /admin/auth/login`
- `POST /admin/auth/verify-2fa`
- `POST /admin/auth/logout`
- `POST /admin/auth/change-password`
- `GET /admin/auth/recovery-codes`
- `POST /admin/auth/recovery-codes`

**Database**

- `AdminUser`
- `LoginChallenge`
- `RateLimitEntry`
- `ActivityLog`
- `rate_limit_hit`

**Rules:** BR-3.1, BR-3.2, BR-3.4, BR-3.5, BR-3.6, BR-3.8, BR-3.9, BR-3.10, BR-3.11, BR-3.12, BR-3.14, BR-3.15

**Notes**

- Show neutral copy on expiry ("session ended"), not an error.
- Sign-out (POST /admin/auth/logout) ends every session, not just this browser's.
- Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in.
- Show ACCOUNT_LOCKED with its lockedUntil countdown — lockouts grow with repeated failures (BR-3.2).
- Regenerated recovery codes are in that one response only — make the admin save them before leaving (BR-3.12).
- Mutations must come from this site's own pages; a 403 CSRF_REJECTED means a cross-site request (BR-3.9).

### Admin dashboard

`admin.overview` · admin

What needs attention now — overdue inquiries, systems to curate, repo-owner permissions outstanding, journey drafts and number proposals awaiting a decision, CV gaps — plus pipeline, jobs and audit activity.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/overview`

**Database**

- `Inquiry`
- `System`
- `Timeline`
- `MetricSnapshot`
- `JobRun`
- `ActivityLog`
- `PublicLedger`

**Rules:** BR-2.2, BR-1.8, BR-1.11, BR-1.12, BR-5.3

**Notes**

- Each attention count links to its screen, filtered (e.g. /admin/inquiries?overdue=true).

### Systems — curate, publish, feature

`admin.systems` · admin

Every system unmasked: edit everything but the slug, publish under BR-1.1/1.11, feature on the homepage, include on the CV, set skills and impacts; see status history, pace and weekly GitHub activity.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/systems`
- `POST /admin/systems`
- `GET /admin/systems/{id}`
- `PATCH /admin/systems/{id}`
- `PUT /admin/systems/{id}/skills`
- `GET /admin/systems/{id}/impacts`
- `POST /admin/systems/{id}/impacts`
- `PATCH /admin/impacts/{id}`
- `DELETE /admin/impacts/{id}`
- `GET /admin/systems/{id}/revisions`
- `POST /admin/systems/{id}/revisions/{revisionId}/restore`
- `POST /admin/systems/{id}/writeup`

**Database**

- `System`
- `Impact`
- `SkillOnSystem`
- `SystemStatusChange`
- `SystemPace`
- `SystemActivityWeek`
- `RepoRelationship`
- `Testimonial`
- `SystemSlugHistory`
- `SystemContentRevision`

**Rules:** BR-1.1, BR-1.2, BR-1.8, BR-1.9, BR-1.10, BR-1.11, BR-1.12, BR-1.13, BR-1.14, BR-1.15, BR-4.5

**Notes**

- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.
- Renaming (PATCH slug) keeps the old URL as a permanent redirect; the detail lists previousSlugs. 409 SLUG_TAKEN / SLUG_RESERVED — show the message.
- Every case-study and description edit is kept (BR-1.15); restoring records a new version — nothing is ever overwritten.
- writeup.descriptionSource / caseStudySource (BR-4.5): sync, generated (AI from the repo) or owner. Saving an edit makes a field the owner's, and the database then refuses any generated write over it. POST …/writeup hands both back to the AI and rewrites them now — 409 WRITEUPS_OFF / NOT_ELIGIBLE, 502 WRITEUP_FAILED, 503 WRITEUPS_UNAVAILABLE: show the message.

### Organizations

`admin.organizations` · admin

The organizations systems belong to — ventures founded, clients, the owner's own — with their kind (a lookup) and GitHub logins for the sync.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/organizations`
- `POST /admin/organizations`
- `PATCH /admin/organizations/{id}`

**Database**

- `Organization`
- `OrganizationKind`

**Rules:** BR-1.2, BR-1.4

**Notes**

- isClient only affects systems created afterwards (BR-1.2) — say so next to the switch.

### Inquiries — triage

`admin.inquiries` · admin

The inbox: filter by status, type or overdue; move each through NEW → REVIEWED → RESPONDED/CLOSED; the review deadline is an admin setting.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/inquiries`
- `PATCH /admin/inquiries/{id}`

**Database**

- `Inquiry`

**Rules:** BR-2.1, BR-2.2, BR-5.5

**Notes**

- Only offer the transitions BR-2.1 allows; 409 INVALID_STATUS_TRANSITION otherwise.

### Journey — entries and approvals

`admin.journey` · admin

Write journey entries, and approve the ones the database drafts when a system first ships.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/timeline`
- `POST /admin/timeline`
- `PATCH /admin/timeline/{id}`
- `DELETE /admin/timeline/{id}`

**Database**

- `Timeline`

**Rules:** BR-1.12, BR-1.13

**Notes**

- Publishing an auto-drafted entry is the approval.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

### CV content, options, uploads, completeness and history

`admin.cv` · admin

Roles (with CV bullets, show/hide), education (expected graduation, coursework), skills; the owner's uploaded CV (versions, restore) and which CV options visitors see (#92); the completeness report with a suggested summary; every generated document.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/cv/experience`
- `POST /admin/cv/experience`
- `PATCH /admin/cv/experience/{id}`
- `DELETE /admin/cv/experience/{id}`
- `GET /admin/cv/education`
- `POST /admin/cv/education`
- `PATCH /admin/cv/education/{id}`
- `DELETE /admin/cv/education/{id}`
- `GET /admin/cv/skills`
- `POST /admin/cv/skills`
- `PATCH /admin/cv/skills/{id}`
- `DELETE /admin/cv/skills/{id}`
- `GET /admin/cv/check`
- `GET /admin/cv/documents`
- `GET /admin/cv/uploads`
- `POST /admin/cv/uploads`
- `GET /admin/cv/uploads/{id}`
- `POST /admin/cv/uploads/{id}/restore`
- `GET /admin/cv/options`
- `PATCH /admin/cv/options`

**Database**

- `Experience`
- `Education`
- `Skill`
- `SkillOnExperience`
- `SkillOnEducation`
- `DocumentGen`
- `CvUpload`
- `CvOptions`

**Rules:** BR-7.1, BR-7.2, BR-7.3, BR-7.4, BR-7.5, BR-7.6, BR-1.13

**Notes**

- Upload is multipart/form-data, field "file". 415 = not a PDF/Word file (or has macros), 413 = over cv.upload.maxMegabytes; show the message.
- CV options: show the database's BR-7.5 message on a 400 (e.g. hiding the generated CV before any upload).
- The suggested summary is an offer: save it only through PATCH /admin/profile when the owner accepts.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

### Profile, links and achievements

`admin.profile` · admin

The owner's details, social links (and which go on the CV), certifications and awards.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/profile`
- `PATCH /admin/profile`
- `GET /admin/profile/photos`
- `POST /admin/profile/photos`
- `GET /admin/profile/photos/{id}`
- `PATCH /admin/profile/photos/{id}`
- `POST /admin/profile/photos/{id}/restore`
- `GET /admin/profile/titles`
- `POST /admin/profile/titles`
- `PATCH /admin/profile/titles/{id}`
- `DELETE /admin/profile/titles/{id}`
- `POST /admin/profile/links`
- `PATCH /admin/profile/links/{id}`
- `DELETE /admin/profile/links/{id}`
- `GET /admin/achievements`
- `POST /admin/achievements`
- `PATCH /admin/achievements/{id}`
- `DELETE /admin/achievements/{id}`

**Database**

- `Profile`
- `ProfileLink`
- `Achievement`
- `ProfileTitle`
- `TitleKind`
- `ProfilePhoto`

**Rules:** BR-1.13

**Notes**

- Achievements start as drafts; publishing puts them on the site and the CV.
- Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400.

### Curated numbers — define, propose, decide

`admin.metrics` · admin

Define metrics, enter values by hand or compute them from public data, and approve or reject each proposal; history is kept.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/metrics`
- `POST /admin/metrics`
- `PATCH /admin/metrics/{key}`
- `POST /admin/metrics/{key}/proposals`
- `POST /admin/metrics/compute`
- `POST /admin/metrics/snapshots/{id}/approve`
- `POST /admin/metrics/snapshots/{id}/reject`

**Database**

- `Metric`
- `MetricSnapshot`
- `propose_metric_snapshot`
- `approve_metric_snapshot`
- `JobRun`

**Rules:** BR-5.3

**Notes**

- A proposal's value can't be edited — enter a new one (the database refuses changes).

### Platform settings, feature flags, visitor lenses

`admin.settings` · admin

Admin-editable tunables with safe bounds (rate limits, review deadline, retention), feature flags, visitor lenses.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/settings/platform`
- `PATCH /admin/settings/platform/{key}`
- `GET /admin/settings/flags`
- `PATCH /admin/settings/flags/{key}`
- `GET /admin/settings/lenses`
- `POST /admin/settings/lenses`
- `PATCH /admin/settings/lenses/{id}`

**Database**

- `PlatformSetting`
- `Flag`
- `VisitorLens`

**Rules:** BR-2.2, BR-2.4, BR-4.4, BR-5.2

**Notes**

- Show each setting's default and bounds; a reset is PATCHing the default value.

### Audit trail

`admin.audit` · admin

Every change the database logged — who (admin / visitor / system), what changed column by column, when — filterable.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/activity-log`

**Database**

- `ActivityLog`

**Rules:** BR-3.4

**Notes**

- "[redacted]" marks a secret or personal field that's never stored in the log.

### Page content blocks

`admin.content` · admin

Site copy that isn't tied to a system, role or the profile — the mission and principles, and whatever block comes next — as validated data the admin edits (#106).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/content`
- `GET /admin/content/{key}`
- `PUT /admin/content/{key}`

**Database**

- `SiteContent`

**Rules:** —

**Notes**

- Each key has a schema (lib/content/blocks.ts); a body that doesn't match is refused with the issues.
- An unknown key is 404 — a new block is one registry entry and one row, no migration.

### Freshness nudges

`admin.freshness` · admin

Live content — systems, roles, education, the profile — that nobody has edited or reviewed for the admin's threshold, oldest first, with a one-click "still accurate" (#89).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/freshness`
- `POST /admin/freshness/{kind}/{id}/reviewed`

**Database**

- `stale_content`
- `System`
- `Experience`
- `Education`
- `Profile`
- `PlatformSetting`

**Rules:** BR-1.16

**Notes**

- Only a real edit to what visitors see, or Mark reviewed, restarts the clock; GitHub sync updates don't (BR-1.16).
- The threshold is the setting content.freshnessDays (default 90).

### Scheduled jobs and their runs

`admin.jobs` · admin

The registered jobs — retention and pruning, number proposals, the GitHub sync — run daily by the scheduler and on demand; every run's status, duration, summary, error and what started it (#94–#96).

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/jobs`
- `POST /admin/jobs/{job}/run`

**Database**

- `JobRun`
- `apply_retention`
- `prune_expired`
- `SystemActivityWeek`
- `RateLimitEntry`
- `LoginChallenge`

**Rules:** BR-5.2, BR-2.4, BR-1.6, BR-1.7, BR-1.11, BR-5.3

**Notes**

- Run now answers 409 ALREADY_RUNNING while a run holds the lock; a failed run answers 500 with its recorded error.
- github.sync summaries list unmappedOwners (map them via an Organization's githubLogins), activityPending (GitHub still computing; retried next run) and accountErrors (an account that refused the token, with GitHub's reason — the other accounts still sync).

## Database objects → capabilities

| Object | Used by |
|---|---|
| `Achievement` | admin.profile |
| `ActivityLog` | platform.pulse, admin.auth, admin.overview, admin.audit |
| `AdminUser` | admin.auth |
| `apply_retention` | admin.jobs |
| `approve_metric_snapshot` | admin.metrics |
| `CvOptions` | admin.cv |
| `CvUpload` | admin.cv |
| `DocumentGen` | cv, admin.cv |
| `Domain` | systems.catalog, lookups |
| `Education` | admin.cv, admin.freshness |
| `Experience` | admin.cv, admin.freshness |
| `Flag` | admin.settings |
| `Impact` | admin.systems |
| `Inquiry` | inquiries.submit, admin.overview, admin.inquiries |
| `InquiryType` | inquiries.submit, lookups |
| `JobRun` | platform.pulse, admin.overview, admin.metrics, admin.jobs |
| `LoginChallenge` | admin.auth, admin.jobs |
| `Metric` | admin.metrics |
| `MetricSnapshot` | admin.overview, admin.metrics |
| `MilestoneType` | journey, lookups |
| `Organization` | admin.organizations |
| `OrganizationKind` | homes, lookups, admin.organizations |
| `PlatformSetting` | admin.settings, admin.freshness |
| `Profile` | admin.profile, admin.freshness |
| `ProfileLink` | admin.profile |
| `ProfilePhoto` | admin.profile |
| `ProfileTitle` | admin.profile |
| `propose_metric_snapshot` | admin.metrics |
| `prune_expired` | admin.jobs |
| `PublicAchievement` | achievements, cv |
| `PublicAffiliation` | profile |
| `PublicCvOption` | cv |
| `PublicCvUpload` | cv |
| `PublicEducation` | cv |
| `PublicExperience` | cv |
| `PublicFlag` | guide |
| `PublicGithubRepo` | github |
| `PublicHome` | homes |
| `PublicImpact` | systems.caseStudy |
| `PublicLedger` | home, admin.overview |
| `PublicMetric` | home, metrics |
| `PublicOrganization` | systems.catalog |
| `PublicPlatformPulse` | platform.pulse |
| `PublicProfile` | profile, cv |
| `PublicProfileLink` | profile, cv |
| `PublicProfilePhoto` | profile |
| `PublicProfileTitle` | profile |
| `PublicRepoCommit` | github |
| `PublicSiteContent` | content |
| `PublicSlugRedirect` | systems.caseStudy |
| `PublicSystem` | home, systems.catalog, systems.caseStudy |
| `PublicSystemActivity` | activity |
| `PublicSystemHome` | homes |
| `PublicTestimonial` | systems.caseStudy |
| `PublicTimeline` | journey |
| `PublicVisitorLens` | lenses |
| `rate_limit_hit` | search, cv, inquiries.submit, admin.auth |
| `RateLimitEntry` | admin.auth, admin.jobs |
| `RepoCommit` | github |
| `RepoRelationship` | lookups, admin.systems |
| `search_public` | search |
| `SiteContent` | admin.content |
| `Skill` | skills, admin.cv |
| `SkillCategory` | skills, lookups |
| `SkillEvidence` | skills, cv |
| `SkillOnEducation` | admin.cv |
| `SkillOnExperience` | admin.cv |
| `SkillOnSystem` | admin.systems |
| `stale_content` | admin.freshness |
| `Status` | systems.catalog, lookups |
| `System` | admin.overview, admin.systems, admin.freshness |
| `SystemActivityWeek` | admin.systems, admin.jobs |
| `SystemContentRevision` | admin.systems |
| `SystemPace` | admin.systems |
| `SystemSlugHistory` | admin.systems |
| `SystemStatusChange` | admin.systems |
| `Testimonial` | admin.systems |
| `Timeline` | admin.overview, admin.journey |
| `TitleKind` | lookups, admin.profile |
| `VisitorLens` | guide, admin.settings |

## Not exposed

| Object | Why |
|---|---|
| `Event` | Analytics events — collection starts with the consent banner (BR-5.1, F5). |
| `ContentChunk` | AI concierge index — V1.1 (CLAUDE.md scope). |
| `public_client_label` | Internal helper of the public views (BR-1.4 masking). |
| `public_name_disclosed` | Internal helper of the public views (BR-1.4 masking). |
| `is_live` | Internal helper of the public views: published and its publish time has come (BR-1.13). |
