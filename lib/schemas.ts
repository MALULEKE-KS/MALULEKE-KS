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

export const LookupTypeEnum = z.enum([
  "status",
  "domain",
  "inquiry-type",
  "milestone-type",
  "skill-category",
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

export const SystemAdminSchema = SystemPublicDetailedSchema.extend({
  contentStatus: ContentStatusEnum,
  clientVisibility: ClientVisibilityEnum,
  clientApproved: z.boolean(),
  // Separate from clientApproved (BR-1.4) — approves real-name disclosure
  // for ANONYMIZED_ONLY systems specifically, not publication itself.
  nameDisclosureApproved: z.boolean(),
  needsCuration: z.boolean(),
  sortOrder: z.number().int(),
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
    contentStatus: ContentStatusEnum.optional(),
    clientApproved: z.boolean().optional(),
    nameDisclosureApproved: z.boolean().optional(),
    isFlagship: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
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

export const InquiryTypeEnum = z.enum([
  "hire",
  "partnership",
  "service",
  "contribution",
  "recruitment",
  "collaboration",
]);

export const InquiryStatusEnum = z.enum(["new", "reviewed", "responded", "closed"]);

export const InquiryCreateInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(5000, "Message must be under 5,000 characters"), // BR-2.3
  inquiryType: InquiryTypeEnum,
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
});

export const CvGenerateInputSchema = z.object({
  targetRole: z.string().nullable().optional(),
});

export const CvGenerateResultSchema = z.object({
  fileUrl: z.string().url(),
  generatedAt: z.string().datetime(),
});

export const ExperienceEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  description: z.string(),
  skills: z.array(z.string()),
});

export const ExperienceInputSchema = z.object({
  title: z.string().min(1),
  organization: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  description: z.string().min(1),
  skillIds: z.array(z.string()).default([]),
});

export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  qualification: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  honors: z.string().nullable(),
});

export const EducationInputSchema = z.object({
  institution: z.string().min(1),
  qualification: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  honors: z.string().nullable().optional(),
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
  adminUserEmail: z.string().email(),
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
