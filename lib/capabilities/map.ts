// lib/capabilities/map.ts
// The capability map (#82) — the single source for what the platform can do.
// Owner rule: nothing may live in the database without being callable, and
// both sides must be documented. From this one list:
//   docs/BACKEND-API-GUIDE.md   capability → database objects → endpoints → rules
//   docs/FRONTEND-DATA-GUIDE.md page → section → the data and actions it can use
// are generated (npm run docs:capabilities), and tests/integration/
// capability-coverage.test.ts fails if a table, view, function or route is
// missing here, if the contract and the routes disagree, or if the guides are
// stale. Not imported by the running app.

export type Audience = "public" | "admin";

export interface Capability {
  id: string;
  title: string;
  audience: Audience;
  /** What it is and why it exists, in a sentence or two. */
  summary: string;
  /** Tables, views and functions it reads or writes. */
  db: string[];
  /** "METHOD /path" as in openapi-contract.yaml (paths relative to /api/v1). */
  endpoints: string[];
  /** Business rules it enforces or depends on. */
  rules: string[];
  /** Where it belongs in the UI: page path → section. "(proposed)" = no page yet. */
  frontend: { page: string; section: string }[];
  /** What a frontend must get right when using it. */
  notes: string[];
}

export const CAPABILITIES: Capability[] = [
  // ============================ PUBLIC ============================
  {
    id: "profile",
    title: "Owner profile and links",
    audience: "public",
    summary: "Who the owner is — name, headline, role, location, contact, summary, bio, availability, building-since year, social links. All admin-edited data.",
    db: ["PublicProfile", "PublicProfileLink"],
    endpoints: ["GET /profile"],
    rules: [],
    frontend: [
      { page: "(every page)", section: "Header name, footer contact and social links" },
      { page: "/", section: "Hero: name, headline" },
      { page: "/about", section: "Bio, availability, location, building since" },
      { page: "/contact", section: "Email, phone (only when set), links" },
    ],
    notes: [
      "Never hardcode owner details — read them here (owner's rule).",
      "phone, bio, availability and summary may be null: render nothing, not a placeholder.",
      "links[].kind names the brand icon (github, linkedin, whatsapp, …).",
    ],
  },
  {
    id: "home",
    title: "Homepage",
    audience: "public",
    summary: "Everything the homepage shows in one call: the live ledger, the admin's homepage picks, the published-systems count and the admin-approved numbers.",
    db: ["PublicLedger", "PublicSystem", "PublicMetric"],
    endpoints: ["GET /home"],
    rules: ["BR-1.1", "BR-5.3"],
    frontend: [
      { page: "/", section: "Hero ledger (years building, organizations founded, shipped / in progress / queued)" },
      { page: "/", section: "Featured work (the admin's picks, in order)" },
      { page: "/", section: "Numbers band (approved metrics only)" },
    ],
    notes: [
      "Ledger counts are live content facts; metrics are curated snapshots — label them differently (BR-5.3).",
      "featured falls back to flagship-first until the admin picks some; never empty while anything is published.",
    ],
  },
  {
    id: "systems.catalog",
    title: "Systems catalog",
    audience: "public",
    summary: "Published systems with filters by organization, domain, status and flagship; the organizations list for the filter shows only names that are disclosed.",
    db: ["PublicSystem", "PublicOrganization", "Status", "Domain"],
    endpoints: ["GET /systems", "GET /organizations"],
    rules: ["BR-1.1", "BR-1.3", "BR-1.4", "BR-1.7"],
    frontend: [{ page: "/systems", section: "Grid, filters, pagination" }],
    notes: [
      "organization may be a masked label (\"a fintech client\") — show it as text, never link it.",
      "repoPrivate = true means repoUrl is null: show a private-repository lock and a Request access action (to /contact).",
      "Status colour comes from statusColorToken — never map status keys to colours in code (EXT-1).",
    ],
  },
  {
    id: "systems.caseStudy",
    title: "Case study",
    audience: "public",
    summary: "One published system in full — case study body, measured impacts, permitted testimonials — and related systems in the same domain.",
    db: ["PublicSystem", "PublicImpact", "PublicTestimonial"],
    endpoints: ["GET /systems/{slug}", "GET /systems/{slug}/related"],
    rules: ["BR-1.1", "BR-1.3", "BR-1.4", "BR-1.7", "BR-6.1", "BR-6.2"],
    frontend: [
      { page: "/systems/[slug]", section: "Header, case study body, impacts, testimonials" },
      { page: "/systems/[slug]", section: "Related systems" },
    ],
    notes: [
      "An unknown or unpublished slug is a plain 404 — never a \"private\" message (BR-1.3/1.4).",
      "liveUrl/screenshotUrl are null for NDA work: render a neutral placeholder.",
    ],
  },
  {
    id: "search",
    title: "Instant search",
    audience: "public",
    summary: "Full-text and typo-tolerant search over published systems, journey entries and skills — never hidden work, because it reads the public views only.",
    db: ["search_public", "rate_limit_hit"],
    endpoints: ["GET /search"],
    rules: ["BR-1.1", "BR-1.4"],
    frontend: [{ page: "(every page)", section: "⌘K search palette" }],
    notes: [
      "Results: kind (system → /systems/{key}, journey → /journey#{key}, skill), title, subtitle.",
      "Debounce typing; 429 means slow down (limits are admin settings search.rateLimit.*).",
      "Queries under 2 characters are refused — don't send them.",
    ],
  },
  {
    id: "journey",
    title: "Journey",
    audience: "public",
    summary: "The published timeline — education, roles, launches, achievements — filterable by milestone type. Entries about a system appear only while it's published.",
    db: ["PublicTimeline", "MilestoneType"],
    endpoints: ["GET /timeline"],
    rules: ["BR-1.12"],
    frontend: [{ page: "/journey", section: "Timeline and type filter" }],
    notes: ["Filter options come from GET /lookups/milestone-type."],
  },
  {
    id: "skills",
    title: "Skills with evidence",
    audience: "public",
    summary: "Every skill with what proves it: published systems that use it, roles and published study — strongest first.",
    db: ["SkillEvidence", "Skill", "SkillCategory"],
    endpoints: ["GET /skills"],
    rules: ["BR-1.1"],
    frontend: [
      { page: "/cv", section: "Skills" },
      { page: "/about", section: "What I work with" },
      { page: "/systems/[slug]", section: "Skills this system proves (match systemSlugs)" },
    ],
    notes: ["Show evidence, not self-rating: \"used in 3 systems, 2 roles\" beats a bar chart."],
  },
  {
    id: "achievements",
    title: "Certifications and awards",
    audience: "public",
    summary: "Published achievements; one about a system shows only while that system is published.",
    db: ["PublicAchievement"],
    endpoints: ["GET /achievements"],
    rules: [],
    frontend: [
      { page: "/about", section: "Certifications and awards" },
      { page: "/cv", section: "Certifications" },
    ],
    notes: ["systemSlug links an achievement to its case study when present."],
  },
  {
    id: "metrics",
    title: "Curated numbers",
    audience: "public",
    summary: "The admin-approved statistics (\"By the numbers\"). A computed or entered value is never public until approved.",
    db: ["PublicMetric"],
    endpoints: ["GET /metrics"],
    rules: ["BR-5.3"],
    frontend: [
      { page: "/", section: "Numbers band" },
      { page: "/about", section: "By the numbers" },
    ],
    notes: ["Show approvedAt as \"as of\" — these are point-in-time figures."],
  },
  {
    id: "cv",
    title: "CV — the options, view and download",
    audience: "public",
    summary:
      "Two clearly labelled CV options (#92): the CV generated from live data — as data for on-screen rendering and as identical ATS-safe PDF or Word files, optionally tailored to a target role — and the owner's uploaded CV file. Each is offered only while the admin shows it.",
    db: [
      "PublicCvOption",
      "PublicCvUpload",
      "PublicExperience",
      "PublicEducation",
      "PublicAchievement",
      "PublicProfile",
      "PublicProfileLink",
      "SkillEvidence",
      "DocumentGen",
      "rate_limit_hit",
    ],
    endpoints: ["GET /cv/options", "GET /cv", "POST /cv/generate", "GET /cv/documents/{id}", "GET /cv/uploads/{id}"],
    rules: ["BR-7.1", "BR-7.2", "BR-7.3", "BR-7.4", "BR-7.5", "BR-7.6"],
    frontend: [
      { page: "/cv", section: "CV options (GET /cv/options), in the order given, each with its label and note; the uploaded one shows its upload date" },
      { page: "/cv", section: "On-screen CV, target-role box, Download PDF / Word — only while the generated option is listed" },
    ],
    notes: [
      "Start from GET /cv/options: show exactly those options, in that order, with their labels — never assume either exists.",
      "Never present one option as the other: the uploaded CV is the owner's file as uploaded; the generated one is live data (BR-7.1).",
      "Render GET /cv exactly — it's the same model the generated files come from. It, generate and document downloads are 404 while the generated option is hidden.",
      "POST /cv/generate returns a fileUrl; navigate to it to download. Uploaded files are plain links (files[].url). 429 = rate-limited.",
    ],
  },
  {
    id: "inquiries.submit",
    title: "Contact — send an inquiry",
    audience: "public",
    summary: "The single visitor write path: validated, rate-limited, honeypot-protected, idempotent; reviewed within the admin-set deadline.",
    db: ["Inquiry", "InquiryType", "rate_limit_hit"],
    endpoints: ["POST /inquiries"],
    rules: ["BR-2.2", "BR-2.3", "BR-2.4", "BR-2.5", "BR-2.6", "BR-2.7"],
    frontend: [{ page: "/contact", section: "Inquiry form and confirmation" }],
    notes: [
      "Types come from GET /lookups/inquiry-type; include the hidden honeypot field \"website\".",
      "Send an idempotencyKey (uuid) so a double-submit returns the original confirmation.",
      "The review promise comes from the inquiry.reviewSlaHours setting — don't hardcode \"48 hours\".",
    ],
  },
  {
    id: "lookups",
    title: "Lookups — statuses, domains, types, categories, relationships",
    audience: "public",
    summary: "Every open list the platform uses, read publicly for filters and forms; created, edited and deprecated by the admin without code changes.",
    db: ["Status", "Domain", "InquiryType", "MilestoneType", "SkillCategory", "RepoRelationship"],
    endpoints: [
      "GET /lookups/{type}",
      "POST /lookups/{type}",
      "PATCH /lookups/{type}/{id}",
      "POST /lookups/{type}/{id}/deprecate",
    ],
    rules: ["EXT-1", "BR-8.1", "BR-8.2", "BR-8.3", "BR-1.11"],
    frontend: [
      { page: "/systems", section: "Status and domain filters" },
      { page: "/contact", section: "Inquiry type select" },
      { page: "/admin/settings", section: "Lookups: add, rename, re-stage, recolour, deprecate" },
    ],
    notes: ["409 LOOKUP_KEY_DEPRECATED means offer \"reactivate\" instead of creating again (BR-8.3)."],
  },

  // ============================ ADMIN ============================
  {
    id: "admin.auth",
    title: "Admin sign-in (password + 2FA)",
    audience: "admin",
    summary: "Password then TOTP or recovery code; lockout, timing-safe, every attempt audited.",
    db: ["AdminUser", "LoginChallenge", "RateLimitEntry", "ActivityLog", "rate_limit_hit"],
    endpoints: ["POST /admin/auth/login", "POST /admin/auth/verify-2fa", "POST /admin/auth/change-password"],
    rules: ["BR-3.1", "BR-3.2", "BR-3.4", "BR-3.5", "BR-3.6", "BR-3.8", "BR-3.10", "BR-3.11", "BR-3.14", "BR-3.15"],
    frontend: [{ page: "/admin/login", section: "Password step, 2FA step, recovery-code option" }],
    notes: ["Show neutral copy on expiry (\"session ended\"), not an error.", "Password rotation (BR-3.15) needs the current password and a live TOTP code; it ends every prior session. On `SESSION_REVOKED` send the admin back to sign in."],
  },
  {
    id: "admin.overview",
    title: "Admin dashboard",
    audience: "admin",
    summary: "What needs attention now — overdue inquiries, systems to curate, repo-owner permissions outstanding, journey drafts and number proposals awaiting a decision, CV gaps — plus pipeline, jobs and audit activity.",
    db: ["Inquiry", "System", "Timeline", "MetricSnapshot", "JobRun", "ActivityLog", "PublicLedger"],
    endpoints: ["GET /admin/overview"],
    rules: ["BR-2.2", "BR-1.8", "BR-1.11", "BR-1.12", "BR-5.3"],
    frontend: [{ page: "/admin", section: "Attention list, pipeline, CV score, jobs, recent activity" }],
    notes: ["Each attention count links to its screen, filtered (e.g. /admin/inquiries?overdue=true)."],
  },
  {
    id: "admin.systems",
    title: "Systems — curate, publish, feature",
    audience: "admin",
    summary: "Every system unmasked: edit everything but the slug, publish under BR-1.1/1.11, feature on the homepage, include on the CV, set skills and impacts; see status history, pace and weekly GitHub activity.",
    db: ["System", "Impact", "SkillOnSystem", "SystemStatusChange", "SystemPace", "SystemActivityWeek", "RepoRelationship", "Testimonial"],
    endpoints: [
      "GET /admin/systems",
      "POST /admin/systems",
      "GET /admin/systems/{id}",
      "PATCH /admin/systems/{id}",
      "PUT /admin/systems/{id}/skills",
      "GET /admin/systems/{id}/impacts",
      "POST /admin/systems/{id}/impacts",
      "PATCH /admin/impacts/{id}",
      "DELETE /admin/impacts/{id}",
    ],
    rules: ["BR-1.1", "BR-1.2", "BR-1.8", "BR-1.9", "BR-1.10", "BR-1.11", "BR-1.12", "BR-1.13"],
    frontend: [
      { page: "/admin/systems", section: "List with curation queue, filters" },
      { page: "/admin/systems/[id]", section: "Editor, publish controls, homepage + CV placement, repo ownership" },
      { page: "/admin/systems/[id]", section: "Skills, impacts, status history, pace, activity chart" },
    ],
    notes: [
      "409 CLIENT_APPROVAL_REQUIRED / OWNER_PERMISSION_REQUIRED: show the reason and the switch that fixes it.",
      "Systems are never deleted — offer Archive (BR-1.9).",
      "Testimonials are read-only here until V1.1.", "Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400."],
  },
  {
    id: "admin.organizations",
    title: "Organizations",
    audience: "admin",
    summary: "The organizations systems belong to — ventures founded, clients, the owner's own — with GitHub logins for the sync.",
    db: ["Organization"],
    endpoints: ["GET /admin/organizations", "POST /admin/organizations", "PATCH /admin/organizations/{id}"],
    rules: ["BR-1.2", "BR-1.4"],
    frontend: [{ page: "/admin/organizations (proposed)", section: "List and editor" }],
    notes: ["isClient only affects systems created afterwards (BR-1.2) — say so next to the switch."],
  },
  {
    id: "admin.inquiries",
    title: "Inquiries — triage",
    audience: "admin",
    summary: "The inbox: filter by status, type or overdue; move each through NEW → REVIEWED → RESPONDED/CLOSED; the review deadline is an admin setting.",
    db: ["Inquiry"],
    endpoints: ["GET /admin/inquiries", "PATCH /admin/inquiries/{id}"],
    rules: ["BR-2.1", "BR-2.2", "BR-5.5"],
    frontend: [{ page: "/admin/inquiries", section: "Inbox, overdue badge (reviewDueAt / overdue), status actions" }],
    notes: ["Only offer the transitions BR-2.1 allows; 409 INVALID_STATUS_TRANSITION otherwise."],
  },
  {
    id: "admin.journey",
    title: "Journey — entries and approvals",
    audience: "admin",
    summary: "Write journey entries, and approve the ones the database drafts when a system first ships.",
    db: ["Timeline"],
    endpoints: ["GET /admin/timeline", "POST /admin/timeline", "PATCH /admin/timeline/{id}", "DELETE /admin/timeline/{id}"],
    rules: ["BR-1.12", "BR-1.13"],
    frontend: [{ page: "/admin/timeline", section: "Entries, auto-drafted queue (autoDrafted + draft), publish" }],
    notes: ["Publishing an auto-drafted entry is the approval.", "Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400."],
  },
  {
    id: "admin.cv",
    title: "CV content, options, uploads, completeness and history",
    audience: "admin",
    summary:
      "Roles (with CV bullets, show/hide), education (expected graduation, coursework), skills; the owner's uploaded CV (versions, restore) and which CV options visitors see (#92); the completeness report with a suggested summary; every generated document.",
    db: ["Experience", "Education", "Skill", "SkillOnExperience", "SkillOnEducation", "DocumentGen", "CvUpload", "CvOptions"],
    endpoints: [
      "GET /admin/cv/experience",
      "POST /admin/cv/experience",
      "PATCH /admin/cv/experience/{id}",
      "DELETE /admin/cv/experience/{id}",
      "GET /admin/cv/education",
      "POST /admin/cv/education",
      "PATCH /admin/cv/education/{id}",
      "DELETE /admin/cv/education/{id}",
      "GET /admin/cv/skills",
      "POST /admin/cv/skills",
      "PATCH /admin/cv/skills/{id}",
      "DELETE /admin/cv/skills/{id}",
      "GET /admin/cv/check",
      "GET /admin/cv/documents",
      "GET /admin/cv/uploads",
      "POST /admin/cv/uploads",
      "GET /admin/cv/uploads/{id}",
      "POST /admin/cv/uploads/{id}/restore",
      "GET /admin/cv/options",
      "PATCH /admin/cv/options",
    ],
    rules: ["BR-7.1", "BR-7.2", "BR-7.3", "BR-7.4", "BR-7.5", "BR-7.6", "BR-1.13"],
    frontend: [
      { page: "/admin/cv", section: "Experience, Education, Skills tabs" },
      { page: "/admin/cv", section: "Completeness panel (score, issues, suggested summary, preview by target role)" },
      { page: "/admin/cv", section: "Generated documents" },
      { page: "/admin/cv", section: "Uploaded CV: upload (PDF/Word), versions with download and make-current" },
      { page: "/admin/cv", section: "What visitors can download: show/hide each option, which is first, labels and notes" },
    ],
    notes: [
      "Upload is multipart/form-data, field \"file\". 415 = not a PDF/Word file (or has macros), 413 = over cv.upload.maxMegabytes; show the message.",
      "CV options: show the database's BR-7.5 message on a 400 (e.g. hiding the generated CV before any upload).","The suggested summary is an offer: save it only through PATCH /admin/profile when the owner accepts.", "Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400."],
  },
  {
    id: "admin.profile",
    title: "Profile, links and achievements",
    audience: "admin",
    summary: "The owner's details, social links (and which go on the CV), certifications and awards.",
    db: ["Profile", "ProfileLink", "Achievement"],
    endpoints: [
      "GET /admin/profile",
      "PATCH /admin/profile",
      "POST /admin/profile/links",
      "PATCH /admin/profile/links/{id}",
      "DELETE /admin/profile/links/{id}",
      "GET /admin/achievements",
      "POST /admin/achievements",
      "PATCH /admin/achievements/{id}",
      "DELETE /admin/achievements/{id}",
    ],
    rules: ["BR-1.13"],
    frontend: [{ page: "/admin/profile (proposed)", section: "Profile form, links, achievements" }],
    notes: ["Achievements start as drafts; publishing puts them on the site and the CV.", "Scheduling (BR-1.13): send contentStatus published with a future publishAt — every publish gate is checked now, and it goes live at that time on its own. Show scheduled items with their time; a publishAt on unpublished content is a 400."],
  },
  {
    id: "admin.metrics",
    title: "Curated numbers — define, propose, decide",
    audience: "admin",
    summary: "Define metrics, enter values by hand or compute them from public data, and approve or reject each proposal; history is kept.",
    db: ["Metric", "MetricSnapshot", "propose_metric_snapshot", "approve_metric_snapshot", "JobRun"],
    endpoints: [
      "GET /admin/metrics",
      "POST /admin/metrics",
      "PATCH /admin/metrics/{key}",
      "POST /admin/metrics/{key}/proposals",
      "POST /admin/metrics/compute",
      "POST /admin/metrics/snapshots/{id}/approve",
      "POST /admin/metrics/snapshots/{id}/reject",
    ],
    rules: ["BR-5.3"],
    frontend: [{ page: "/admin/numbers (proposed)", section: "Metrics, pending proposals with approve / reject, history" }],
    notes: ["A proposal's value can't be edited — enter a new one (the database refuses changes)."],
  },
  {
    id: "admin.settings",
    title: "Platform settings, feature flags, visitor lenses",
    audience: "admin",
    summary: "Admin-editable tunables with safe bounds (rate limits, review deadline, retention), feature flags, visitor lenses.",
    db: ["PlatformSetting", "Flag", "VisitorLens"],
    endpoints: [
      "GET /admin/settings/platform",
      "PATCH /admin/settings/platform/{key}",
      "GET /admin/settings/flags",
      "PATCH /admin/settings/flags/{key}",
      "GET /admin/settings/lenses",
      "POST /admin/settings/lenses",
      "PATCH /admin/settings/lenses/{id}",
    ],
    rules: ["BR-2.2", "BR-2.4", "BR-4.4", "BR-5.2"],
    frontend: [{ page: "/admin/settings", section: "Settings (with each one's rule and default), flags, lenses" }],
    notes: ["Show each setting's default and bounds; a reset is PATCHing the default value."],
  },
  {
    id: "admin.audit",
    title: "Audit trail",
    audience: "admin",
    summary: "Every change the database logged — who (admin / visitor / system), what changed column by column, when — filterable.",
    db: ["ActivityLog"],
    endpoints: ["GET /admin/activity-log"],
    rules: ["BR-3.4"],
    frontend: [{ page: "/admin/activity-log", section: "Log with filters (entity, action, actor, date range), before/after diff" }],
    notes: ["\"[redacted]\" marks a secret or personal field that's never stored in the log."],
  },
  {
    id: "admin.jobs",
    title: "Job runs",
    audience: "admin",
    summary: "Every scheduled or on-demand job run — status, duration, summary, error.",
    db: ["JobRun"],
    endpoints: ["GET /admin/jobs"],
    rules: [],
    frontend: [{ page: "/admin/jobs (proposed)", section: "Runs by job, failures first" }],
    notes: [],
  },
];

/** Database objects deliberately without an endpoint — each with the reason. */
export const NOT_EXPOSED: Record<string, string> = {
  Event: "Analytics events — collection starts with the consent banner (BR-5.1, F5).",
  ContentChunk: "AI concierge index — V1.1 (CLAUDE.md scope).",
  public_client_label: "Internal helper of the public views (BR-1.4 masking).",
  public_name_disclosed: "Internal helper of the public views (BR-1.4 masking).",
  is_live: "Internal helper of the public views: published and its publish time has come (BR-1.13).",
};
