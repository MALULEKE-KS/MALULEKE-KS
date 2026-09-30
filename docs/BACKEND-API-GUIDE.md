<!-- Generated from lib/capabilities/map.ts by `npm run docs:capabilities`. Don't edit by hand — edit the map. -->

# Backend API guide

Every capability the platform has: the database objects behind it, the endpoints that serve it, and the business rules it enforces. Nothing in the database is left without an endpoint unless it's listed under *Not exposed*, with the reason. The frontend view of the same map is `docs/FRONTEND-DATA-GUIDE.md`.

**24 capabilities · 80 endpoints.**

## Public

### Owner profile and links

`profile` · public

Who the owner is — name, headline, role, location, contact, summary, bio, availability, building-since year, social links. All admin-edited data.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /profile`

**Database**

- `PublicProfile`
- `PublicProfileLink`

**Rules:** —

**Notes**

- Never hardcode owner details — read them here (owner's rule).
- phone, bio, availability and summary may be null: render nothing, not a placeholder.
- links[].kind names the brand icon (github, linkedin, whatsapp, …).

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

**Rules:** BR-1.1, BR-1.3, BR-1.4, BR-1.7, BR-6.1, BR-6.2

**Notes**

- An unknown or unpublished slug is a plain 404 — never a "private" message (BR-1.3/1.4).
- liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.

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

### CV — view and download

`cv` · public

The CV as data (for on-screen rendering) and as generated PDF or Word files, identical in content, ATS-safe, optionally tailored to a target role.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /cv`
- `POST /cv/generate`
- `GET /cv/documents/{id}`

**Database**

- `PublicExperience`
- `PublicEducation`
- `PublicAchievement`
- `PublicProfile`
- `PublicProfileLink`
- `SkillEvidence`
- `DocumentGen`
- `rate_limit_hit`

**Rules:** BR-7.1, BR-7.2, BR-7.3, BR-7.4

**Notes**

- Render GET /cv exactly — it's the same model the files come from.
- POST /cv/generate returns a fileUrl; navigate to it to download. 429 = rate-limited.

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
- `POST /admin/auth/change-password`

**Database**

- `AdminUser`
- `LoginChallenge`
- `RateLimitEntry`
- `ActivityLog`
- `rate_limit_hit`

**Rules:** BR-3.1, BR-3.2, BR-3.4, BR-3.5, BR-3.6, BR-3.8, BR-3.10, BR-3.11, BR-3.14, BR-3.15

**Notes**

- Show neutral copy on expiry ("session ended"), not an error.
- Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in.

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

**Database**

- `System`
- `Impact`
- `SkillOnSystem`
- `SystemStatusChange`
- `SystemPace`
- `SystemActivityWeek`
- `RepoRelationship`
- `Testimonial`

**Rules:** BR-1.1, BR-1.2, BR-1.8, BR-1.9, BR-1.10, BR-1.11, BR-1.12

**Notes**

- 409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.
- Systems are never deleted — offer Archive (BR-1.9).
- Testimonials are read-only here until V1.1.

### Organizations

`admin.organizations` · admin

The organizations systems belong to — ventures founded, clients, the owner's own — with GitHub logins for the sync.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/organizations`
- `POST /admin/organizations`
- `PATCH /admin/organizations/{id}`

**Database**

- `Organization`

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

**Rules:** BR-1.12

**Notes**

- Publishing an auto-drafted entry is the approval.

### CV content, completeness and history

`admin.cv` · admin

Roles (with CV bullets, show/hide), education (expected graduation, coursework), skills; the completeness report with a suggested summary; every generated document.

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

**Database**

- `Experience`
- `Education`
- `Skill`
- `SkillOnExperience`
- `SkillOnEducation`
- `DocumentGen`

**Rules:** BR-7.1, BR-7.2, BR-7.3, BR-7.4

**Notes**

- The suggested summary is an offer: save it only through PATCH /admin/profile when the owner accepts.

### Profile, links and achievements

`admin.profile` · admin

The owner's details, social links (and which go on the CV), certifications and awards.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/profile`
- `PATCH /admin/profile`
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

**Rules:** —

**Notes**

- Achievements start as drafts; publishing puts them on the site and the CV.

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

### Job runs

`admin.jobs` · admin

Every scheduled or on-demand job run — status, duration, summary, error.

**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)

- `GET /admin/jobs`

**Database**

- `JobRun`

**Rules:** —

## Database objects → capabilities

| Object | Used by |
|---|---|
| `Achievement` | admin.profile |
| `ActivityLog` | admin.auth, admin.overview, admin.audit |
| `AdminUser` | admin.auth |
| `approve_metric_snapshot` | admin.metrics |
| `DocumentGen` | cv, admin.cv |
| `Domain` | systems.catalog, lookups |
| `Education` | admin.cv |
| `Experience` | admin.cv |
| `Flag` | admin.settings |
| `Impact` | admin.systems |
| `Inquiry` | inquiries.submit, admin.overview, admin.inquiries |
| `InquiryType` | inquiries.submit, lookups |
| `JobRun` | admin.overview, admin.metrics, admin.jobs |
| `LoginChallenge` | admin.auth |
| `Metric` | admin.metrics |
| `MetricSnapshot` | admin.overview, admin.metrics |
| `MilestoneType` | journey, lookups |
| `Organization` | admin.organizations |
| `PlatformSetting` | admin.settings |
| `Profile` | admin.profile |
| `ProfileLink` | admin.profile |
| `propose_metric_snapshot` | admin.metrics |
| `PublicAchievement` | achievements, cv |
| `PublicEducation` | cv |
| `PublicExperience` | cv |
| `PublicImpact` | systems.caseStudy |
| `PublicLedger` | home, admin.overview |
| `PublicMetric` | home, metrics |
| `PublicOrganization` | systems.catalog |
| `PublicProfile` | profile, cv |
| `PublicProfileLink` | profile, cv |
| `PublicSystem` | home, systems.catalog, systems.caseStudy |
| `PublicTestimonial` | systems.caseStudy |
| `PublicTimeline` | journey |
| `rate_limit_hit` | search, cv, inquiries.submit, admin.auth |
| `RateLimitEntry` | admin.auth |
| `RepoRelationship` | lookups, admin.systems |
| `search_public` | search |
| `Skill` | skills, admin.cv |
| `SkillCategory` | skills, lookups |
| `SkillEvidence` | skills, cv |
| `SkillOnEducation` | admin.cv |
| `SkillOnExperience` | admin.cv |
| `SkillOnSystem` | admin.systems |
| `Status` | systems.catalog, lookups |
| `System` | admin.overview, admin.systems |
| `SystemActivityWeek` | admin.systems |
| `SystemPace` | admin.systems |
| `SystemStatusChange` | admin.systems |
| `Testimonial` | admin.systems |
| `Timeline` | admin.overview, admin.journey |
| `VisitorLens` | admin.settings |

## Not exposed

| Object | Why |
|---|---|
| `Event` | Analytics events — collection starts with the consent banner (BR-5.1, F5). |
| `ContentChunk` | AI concierge index — V1.1 (CLAUDE.md scope). |
| `public_client_label` | Internal helper of the public views (BR-1.4 masking). |
| `public_name_disclosed` | Internal helper of the public views (BR-1.4 masking). |
