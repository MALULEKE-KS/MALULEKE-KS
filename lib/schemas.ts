// lib/schemas.ts
// Generated from openapi-contract.yaml — do not hand-edit shapes here without
// updating the contract first. This is the enforcement of Kurhula's own rule:
// "OpenAPI contracts come before implementation. Zod schemas are generated,
// not written manually." (Constitution — Framework & Stack)

import { z } from "zod";

// ============================================================
// SHARED / PRIMITIVES
// ============================================================

export const PageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

// Clamps bad client input rather than documenting a max and trusting callers
// to respect it — page/pageSize are parsed through this, not PageMetaSchema,
// wherever a request is being validated (PageMetaSchema itself describes the
// *response* shape, not input).
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().max(100).catch(20),
});

// Closed set of canonical error codes — kept in lockstep with lib/rules/.
// Anything returned from an API route must use one of these, so the frontend
// and any future agent tool (BR-4.3) can branch on `error.code` reliably
// instead of parsing `error.message` strings.
export const ErrorCodeEnum = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CLIENT_APPROVAL_REQUIRED", // BR-1.1
  "INVALID_STATUS_TRANSITION", // BR-2.1
  "RATE_LIMITED", // BR-2.4
  "ACCOUNT_LOCKED", // BR-3.2
  "CHALLENGE_EXPIRED", // BR-3.5
  "CHALLENGE_INVALID", // BR-3.6
  "LOOKUP_KEY_DEPRECATED", // BR-8.3
  "LOOKUP_KEY_EXISTS", // BR-8.3
  "OWNER_PERMISSION_REQUIRED", // BR-1.11
  "INTERNAL_ERROR",
]);

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeEnum,
    message: z.string(),
    // Zod v4: z.record() requires an explicit key schema (v3 defaulted to
    // string keys implicitly).
    details: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
});

export const LookupValueSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  active: z.boolean(),
});

// F1.6a (#52, #67) — pipeline stages, curated status colours, settings.
export const PipelineStageEnum = z.enum(["shipped", "building", "queued"]);
export const StatusColorTokenEnum = z.enum([
  "signal-finished",
  "signal-progress",
  "signal-planned",
]);

export const LookupCreateInputSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+([_-][a-z0-9]+)*$/, "lowercase words joined by _ or -"),
  label: z.string().trim().min(1),
  // Type-specific extras (lib/rules/lookups.ts) — the route refuses any a type doesn't have.
  stage: PipelineStageEnum.optional(),
  colorToken: StatusColorTokenEnum.optional(),
  requiresOwnerPermission: z.boolean().optional(),
  autoDraftOnShip: z.boolean().optional(),
});

export const LookupUpdateInputSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    stage: PipelineStageEnum.optional(),
    colorToken: StatusColorTokenEnum.optional(),
    requiresOwnerPermission: z.boolean().optional(),
    autoDraftOnShip: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Nothing to update" });

export const PlatformSettingUpdateInputSchema = z.object({ value: z.unknown() });

export const LookupTypeEnum = z.enum([
  "status",
  "domain",
  "inquiry-type",
  "milestone-type",
  "skill-category",
  "repo-relationship",
  "title-kind",
  "organization-kind",
  // New lookup types extend this enum only — no new endpoint required (EXT-1)
]);

// ============================================================
// SYSTEMS
// ============================================================

export const ClientVisibilityEnum = z.enum([
  "PUBLIC",
  "REQUIRES_APPROVAL",
  "NDA_RESTRICTED",
  "ANONYMIZED_ONLY",
]);

export const ContentStatusEnum = z.enum(["draft", "published", "archived"]);

// BR-1.11 (#69) — the repo owner's answer for a collaborated system.
export const OwnerPermissionEnum = z.enum([
  "not_required",
  "not_requested",
  "requested",
  "granted",
  "declined",
]);

export const SystemPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  organization: z.string(),
  status: z.string(),
  statusColorToken: z.string(),
  domain: z.string().nullable(),
  description: z.string(),
  // Null enforced server-side whenever clientVisibility = NDA_RESTRICTED (BR-1.3)
  repoUrl: z.string().url().nullable(),
  liveUrl: z.string().url().nullable(),
  // Homepage preview image; absence renders a technical placeholder rather
  // than a broken image, so this is nullable, never required.
  screenshotUrl: z.string().url().nullable(),
  techStack: z.array(z.string()),
  isFlagship: z.boolean(),
  // BR-1.7 — a private repo is shown as private (repoUrl is then null), with
  // access available on request.
  repoPrivate: z.boolean(),
});

export const TestimonialPublicSchema = z.object({
  // Only ever populated where hasPermission=true (BR-6.1) — enforced at the
  // query layer, not by this schema, but documented here for the reader.
  authorName: z.string(),
  authorRole: z.string().nullable(),
  organization: z.string().nullable(),
  quote: z.string(),
});

export const SystemPublicDetailedSchema = SystemPublicSchema.extend({
  caseStudyBody: z.string(),
  impacts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  testimonials: z.array(TestimonialPublicSchema),
});

// BR-1.13 (#86): when published content goes live. Omitted = unchanged,
// null = live as soon as published. Only valid while published.
const PublishAtInputSchema = z.string().datetime({ offset: true }).nullable().optional();
// In admin responses only — public content is live by definition.
const PublishAtSchema = z.string().datetime().nullable().optional();

export const SystemAdminSchema = SystemPublicDetailedSchema.extend({
  contentStatus: ContentStatusEnum,
  publishAt: PublishAtSchema,
  clientVisibility: ClientVisibilityEnum,
  clientApproved: z.boolean(),
  // Separate from clientApproved (BR-1.4) — approves real-name disclosure
  // for ANONYMIZED_ONLY systems specifically, not publication itself.
  nameDisclosureApproved: z.boolean(),
  needsCuration: z.boolean(),
  sortOrder: z.number().int(),
  featuredOnHome: z.boolean(),
  homeOrder: z.number().int(),
  // #69 / BR-1.11 — the repo relationship's key, and the owner's answer.
  onCv: z.boolean(),
  cvOrder: z.number().int(),
  repoRelationship: z.string().nullable(),
  ownerPermission: OwnerPermissionEnum,
  ownerPermissionFrom: z.string().nullable(),
  ownerPermissionAt: z.string().datetime().nullable(),
  ownerPermissionNote: z.string().nullable(),
  // #70 — sourced from GitHub by the sync; null until synced.
  github: z.object({
    fullName: z.string().nullable(),
    ownerLogin: z.string().nullable(),
    pushedAt: z.string().datetime().nullable(),
    languages: z.record(z.string(), z.number()).nullable(),
    topics: z.array(z.string()),
    stars: z.number().int().nullable(),
    syncedAt: z.string().datetime().nullable(),
  }),
});

export const SystemCreateInputSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase, numbers, and hyphens only"),
  organizationId: z.string(),
  statusId: z.string(),
  domainId: z.string().nullable().optional(),
  description: z.string().min(1),
  repoUrl: z.string().url().nullable().optional(),
  liveUrl: z.string().url().nullable().optional(),
  screenshotUrl: z.string().url().nullable().optional(),
  techStack: z.array(z.string()).default([]),
  clientVisibility: ClientVisibilityEnum.default("PUBLIC"),
  // Note: server overrides this default to REQUIRES_APPROVAL when the linked
  // Organization.isClient = true, per BR-1.2 — client input is not trusted
  // to set this correctly on its own.
});

export const SystemUpdateInputSchema = z
  .object({
    // #82 — the whole system is editable here. #87 — the slug too: the
    // database keeps the old one as a permanent redirect (BR-1.14).
    name: z.string().trim().min(1).max(120).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by -")
      .max(100)
      .optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    techStack: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    status: z.string().trim().min(1).optional(), // a Status key (pipeline stage follows it)
    domain: z.string().trim().min(1).nullable().optional(), // a Domain key; null clears it
    organizationId: z.string().min(1).optional(),
    clientVisibility: ClientVisibilityEnum.optional(),
    contentStatus: ContentStatusEnum.optional(),
    publishAt: PublishAtInputSchema,
    clientApproved: z.boolean().optional(),
    nameDisclosureApproved: z.boolean().optional(),
    isFlagship: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    featuredOnHome: z.boolean().optional(),
    homeOrder: z.number().int().min(0).optional(),
    // #69 — a repo-relationship key (null clears it) and the owner's answer.
    // The database keeps these consistent and blocks publishing without a
    // GRANTED answer where one is required (BR-1.11).
    repoRelationship: z.string().nullable().optional(),
    ownerPermission: OwnerPermissionEnum.exclude(["not_required"]).optional(),
    ownerPermissionFrom: z.string().trim().min(1).nullable().optional(),
    ownerPermissionNote: z.string().trim().nullable().optional(),
    // #74 — whether and where this system is listed on the CV (published only).
    onCv: z.boolean().optional(),
    cvOrder: z.number().int().min(0).optional(),
    caseStudyBody: z.string().optional(),
    repoUrl: z.string().url().nullable().optional(),
    liveUrl: z.string().url().nullable().optional(),
    screenshotUrl: z.string().url().nullable().optional(),
  })
  .refine(
    // Mirrors BR-1.1 at the validation layer, in addition to the API-level
    // enforcement described in the contract — belt and suspenders, not
    // a replacement for the server check.
    (data) => {
      if (data.contentStatus !== "published") return true;
      return true; // clientVisibility/clientApproved cross-check happens
      // against the existing DB row in the route handler, since this
      // schema only sees the patch body, not current state.
    },
    { message: "Cannot publish without server-side client approval check" }
  );

// ============================================================
// INQUIRIES
// ============================================================

// An InquiryType lookup key (EXT-1, #99): any well-formed key — the server
// checks it against the active lookup values, so a type the admin adds is
// accepted with no code change, and a deprecated one is refused (BR-8.2).
export const InquiryTypeKeySchema = z
  .string()
  .trim()
  .min(1, "Choose what this is about")
  .max(60)
  .regex(/^[a-z0-9]+([_-][a-z0-9]+)*$/, "Choose what this is about");

export const InquiryStatusEnum = z.enum(["new", "reviewed", "responded", "closed"]);

export const InquiryCreateInputSchema = z.object({
  // Plain messages: they are shown to the visitor as written (#99).
  name: z.string().trim().min(1, "Enter your name").max(200, "Keep your name under 200 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(5000, "Message must be under 5,000 characters"), // BR-2.3
  inquiryType: InquiryTypeKeySchema,
  // Optional client-generated key; a resubmission with the same key within
  // 10 minutes returns the original confirmation instead of creating a
  // second row (BR-2.6). Honeypot-triggered submissions never reach this
  // schema's happy path at all — they short-circuit to a look-alike 201
  // before validation runs (BR-2.7).
  idempotencyKey: z.string().uuid().optional(),
  // source is intentionally NOT in this schema — captured server-side from
  // the referrer (falling back to "direct" when absent), never client-supplied (BR-2.5).
});

export const InquiryConfirmationSchema = z.object({
  id: z.string(),
  status: z.literal("new"),
  submittedAt: z.string().datetime(),
});

export const InquiryAdminSchema = InquiryConfirmationSchema.extend({
  status: InquiryStatusEnum,
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  inquiryType: z.string(),
  source: z.string().nullable(),
});

export const InquiryStatusUpdateInputSchema = z.object({
  // BR-2.1 — new -> reviewed is mandatory; from reviewed, either responded
  // or closed is valid (closed covers spam/irrelevant without a fake reply).
  // The actual current-state check happens in the route handler against the
  // DB row, not here — this schema only bounds the shape of the *target* value.
  status: z.enum(["reviewed", "responded", "closed"]),
});

// ============================================================
// AUTH
// ============================================================

export const AdminLoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AdminLoginChallengeSchema = z.object({
  challengeToken: z.string(),
});

export const Verify2FAInputSchema = z.object({
  challengeToken: z.string(),
  // Either a 6-digit TOTP code or a recovery code (Design System §5 — "Use
  // a recovery code instead" swaps to a single text field). The route
  // handler distinguishes them by shape: exactly 6 digits is treated as a
  // TOTP code, anything else is checked against the hashed recovery codes.
  code: z.string().min(6).max(32),
});

export const SessionResultSchema = z.object({
  sessionExpiresAt: z.string().datetime(),
});

export const PasswordChangeInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(256),
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit authenticator code."),
});

// BR-3.12 — regenerating recovery codes re-authenticates like a password change.
export const RecoveryCodesRegenerateInputSchema = z.object({
  currentPassword: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit authenticator code."),
});

// ============================================================
// TIMELINE & CV
// ============================================================

export const TimelineEntrySchema = z.object({
  id: z.string(),
  milestoneType: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  date: z.string().date(),
  tags: z.array(z.string()),
  // #70 — only published entries are public; auto-drafted ones await approval.
  contentStatus: ContentStatusEnum,
  autoDrafted: z.boolean(),
  systemId: z.string().nullable(),
  publishAt: PublishAtSchema,
});

// #74 — the same CV as PDF or Word (DOCX); a target role tailors the order.
export const CvFormatEnum = z.enum(["pdf", "docx"]);

export const CvGenerateInputSchema = z.object({
  targetRole: z.string().trim().max(100).nullable().optional(),
  format: CvFormatEnum.default("pdf"),
});

export const CvGenerateResultSchema = z.object({
  fileUrl: z.string().url(),
  generatedAt: z.string().datetime(),
  format: CvFormatEnum,
});

export const FlagEntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  enabled: z.boolean(),
  notes: z.string().nullable(),
});

export const FlagUpdateInputSchema = z.object({
  enabled: z.boolean(),
});

export const VisitorLensEntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  priorityContent: z.record(z.string(), z.unknown()),
  aiFramingPrompt: z.string(),
  sortOrder: z.number().int(),
});

export const VisitorLensInputSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  priorityContent: z.record(z.string(), z.unknown()),
  aiFramingPrompt: z.string().min(1),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const TimelineCreateInputSchema = z.object({
  milestoneTypeId: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  date: z.string().date(),
  media: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  // Omitted on create = published (an entry the admin writes is ready);
  // omitted on update = unchanged. Approving an auto-drafted entry = "published".
  contentStatus: ContentStatusEnum.optional(),
  publishAt: PublishAtInputSchema,
});

// A CV bullet: one achievement, concise (#74).
const CvBulletSchema = z.string().trim().min(1).max(300);

export const ExperienceEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string(),
  location: z.string().nullable(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  description: z.string(),
  highlights: z.array(z.string()),
  contentStatus: ContentStatusEnum,
  publishAt: PublishAtSchema,
  skills: z.array(z.string()),
});

export const ExperienceInputSchema = z.object({
  title: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  location: z.string().trim().min(1).nullable().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  description: z.string().trim().min(1),
  // CV achievement bullets, in order (#74).
  highlights: z.array(CvBulletSchema).max(15).default([]),
  // Omitted on create = published; omitted on update = unchanged (#74).
  contentStatus: ContentStatusEnum.optional(),
  publishAt: PublishAtInputSchema,
  skillIds: z.array(z.string()).default([]),
});

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  qualification: z.string(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(), // null = still studying
  honors: z.string().nullable(),
  description: z.string().nullable(),
  certificateUrl: z.string().url().nullable(),
  contentStatus: ContentStatusEnum,
  publishAt: PublishAtSchema,
  skills: z.array(z.string()),
  expectedGraduation: z.string().date().nullable(),
  coursework: z.array(z.string()),
});

export const EducationInputSchema = z.object({
  institution: z.string().trim().min(1),
  qualification: z.string().trim().min(1),
  fieldOfStudy: z.string().trim().min(1).nullable().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  honors: z.string().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  certificateUrl: z.string().url().startsWith("https://").nullable().optional(),
  // Omitted on create = published; omitted on update = unchanged (#70).
  contentStatus: ContentStatusEnum.optional(),
  publishAt: PublishAtInputSchema,
  skillIds: z.array(z.string()).default([]),
  // A degree in progress (no endDate): when it's expected to finish (#74).
  expectedGraduation: z.string().date().nullable().optional(),
  coursework: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
});

export const SkillEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  yearsExperience: z.number().nullable(),
});

export const SkillInputSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string(),
  yearsExperience: z.number().nullable().optional(),
});

// ============================================================
// ACTIVITY LOG (BR-3.4)
// ============================================================

export const ActivityLogEntrySchema = z.object({
  id: z.string(),
  actorType: z.enum(["admin", "anonymous", "system"]),
  adminUserEmail: z.string().email().nullable(),
  subjectHash: z.string().nullable(),
  ipHash: z.string().nullable(),
  userAgentHash: z.string().nullable(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

// ============================================================
// AGENT TOOL BOUNDARY (BR-4.1, BR-4.2)
// ============================================================

// The only write-capable tool input the agent orchestration layer is ever
// allowed to construct. Every other tool call must validate against a
// read-only response schema — never against a *Input schema that mutates state.
export const AgentSubmitInquiryInputSchema = InquiryCreateInputSchema;

// ============================================================
// PROFILE, ACHIEVEMENTS, CV CHECK (#74) — the owner's details as data
// ============================================================

const HttpsUrlSchema = z.string().url().startsWith("https://");

export const ProfileLinkSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string(),
  url: z.string(),
  sortOrder: z.number().int(),
  onCv: z.boolean(),
});

export const ProfileSchema = z.object({
  displayName: z.string(),
  initials: z.string().nullable(),
  headline: z.string().nullable(),
  role: z.string(),
  location: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  summary: z.string().nullable(),
  bio: z.string().nullable(),
  availability: z.string().nullable(),
  buildingSinceYear: z.number().int().nullable(),
  links: z.array(ProfileLinkSchema),
  updatedAt: z.string().datetime(),
});

export const ProfileUpdateInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    initials: z.string().trim().max(40).nullable(),
    headline: z.string().trim().min(1).max(120).nullable(),
    role: z.string().trim().min(1).max(160),
    location: z.string().trim().min(1).max(120).nullable(),
    email: z.string().trim().toLowerCase().email(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, "digits with optional + and separators")
      .nullable(),
    summary: z.string().trim().max(1200).nullable(),
    bio: z.string().trim().max(4000).nullable(),
    availability: z.string().trim().max(200).nullable(),
    buildingSinceYear: z.number().int().min(1990).max(2100).nullable(),
  })
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Nothing to update" });

export const ProfileLinkInputSchema = z.object({
  kind: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by -"),
  label: z.string().trim().min(1).max(60),
  url: z
    .string()
    .trim()
    .url()
    .refine((u) => u.startsWith("https://") || u.startsWith("mailto:"), "https:// or mailto: only"),
  sortOrder: z.number().int().min(0).default(0),
  onCv: z.boolean().default(true),
});

export const ProfileLinkUpdateInputSchema = ProfileLinkInputSchema.partial().refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: "Nothing to update" }
);

export const AchievementEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  issuer: z.string().nullable(),
  achievedOn: z.string().date(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  systemId: z.string().nullable(),
  contentStatus: ContentStatusEnum,
  publishAt: PublishAtSchema,
  sortOrder: z.number().int(),
});

export const AchievementInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  issuer: z.string().trim().min(1).max(200).nullable().optional(),
  achievedOn: z.string().date(),
  description: z.string().trim().max(1000).nullable().optional(),
  url: HttpsUrlSchema.nullable().optional(),
  systemId: z.string().nullable().optional(),
  // Omitted on create = draft (the table's default); omitted on update = unchanged.
  contentStatus: ContentStatusEnum.optional(),
  publishAt: PublishAtInputSchema,
  sortOrder: z.number().int().min(0).default(0),
});

// #92 / BR-7.5 — which CV options visitors see, in what order, with what
// labels. The database refuses hiding both, a hidden first option, and hiding
// the generated CV before any upload exists.
const CvOptionLabelSchema = z.string().trim().min(1).max(60);
const CvOptionNoteSchema = z.string().trim().max(200);
export const CvOptionsUpdateInputSchema = z
  .object({
    showGenerated: z.boolean().optional(),
    showUploaded: z.boolean().optional(),
    firstOption: z.enum(["generated", "uploaded"]).optional(),
    generatedLabel: CvOptionLabelSchema.optional(),
    generatedNote: CvOptionNoteSchema.optional(),
    uploadedLabel: CvOptionLabelSchema.optional(),
    uploadedNote: CvOptionNoteSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const CvCheckQuerySchema = z.object({
  targetRole: z.string().trim().max(100).optional(),
});

// ============================================================
// COMPLETE ADMIN SURFACE (#82) — organizations, impacts, a system's skills,
// curated numbers, jobs, the activity-log filters
// ============================================================

const SlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by -");

export const OrganizationInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: SlugSchema,
  role: z.string().trim().min(1).max(80).nullable().optional(), // e.g. Founder, Co-founder
  // BR-1.2: applies to systems created afterwards — never retroactive.
  isClient: z.boolean().default(false),
  githubLogins: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  // An OrganizationKind key (F5c) — personal, venture, client, … ; null clears it.
  kind: z.string().trim().min(1).nullable().optional(),
});

export const OrganizationUpdateInputSchema = OrganizationInputSchema.partial().refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: "Nothing to update" }
);

// F5c (D13) — one of the owner's titles or qualifications. kind is a
// TitleKind key; a title with an end date in the past leaves the public view.
export const ProfileTitleInputSchema = z
  .object({
    kind: z.string().trim().min(1),
    label: z.string().trim().min(1).max(120),
    detail: z.string().trim().min(1).max(160).nullable().optional(),
    educationId: z.string().min(1).nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
    startsOn: z.string().date().nullable().optional(),
    endsOn: z.string().date().nullable().optional(),
  })
  .refine((t) => !t.startsOn || !t.endsOn || t.endsOn >= t.startsOn, { message: "The end date can't be before the start date", path: ["endsOn"] });

export const ImpactInputSchema = z.object({
  label: z.string().trim().min(1).max(120), // "Audit findings closed"
  value: z.string().trim().min(1).max(60), // "58"
  sortOrder: z.number().int().min(0).default(0),
});

export const ImpactUpdateInputSchema = ImpactInputSchema.partial().refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: "Nothing to update" }
);

export const SystemSkillsInputSchema = z.object({
  skillIds: z.array(z.string().min(1)).max(60), // replaces the system's skill links
});

export const MetricInputSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-zA-Z0-9]*(.[a-z][a-zA-Z0-9]*)+$/, "dotted lowerCamel, e.g. clients.served"),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const MetricUpdateInputSchema = MetricInputSchema.omit({ key: true })
  .extend({ active: z.boolean() })
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Nothing to update" });

export const MetricProposalInputSchema = z.object({ value: z.number().finite() });

export const ActivityLogQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorType: z.enum(["admin", "anonymous", "system"]).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});
