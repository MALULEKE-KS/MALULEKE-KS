// lib/inquiries/fields.ts
// Let's Talk — what each category's form shows, as data (LT-1, LT-2). The
// rules live in forms.ts; this is their face: every field a category asks, in
// order, with its label, its kind and when it appears. One renderer draws any
// category from it, and the payload is built from the same list, so a field
// can't be shown without being sent or sent without being shown. Option
// labels are typed against the enums they label — a new enum value without a
// label fails the build.
//
// Pure — no React — so it runs in the browser, on the server and in tests.

import {
  CATEGORY_FORMS,
  CHANNELS,
  COMMITMENTS,
  COMPENSATION_STRUCTURES,
  Contact,
  MEETING_KINDS,
  REPRESENTATIONS,
  STAGES,
  TIMELINES,
  WORK_ARRANGEMENTS,
  type CategoryKey,
} from "@/lib/inquiries/forms";

type Labels<T extends readonly string[]> = Record<T[number], string>;
const options = <T extends readonly string[]>(values: T, labels: Labels<T>) => values.map((v) => ({ value: v as string, label: labels[v as T[number]] }));

export const REPRESENTATION_LABEL: Labels<typeof REPRESENTATIONS> = { own: "My own organisation", client: "A client", agency: "As a recruitment agency", other: "Other" };
export const WORK_ARRANGEMENT_LABEL: Labels<typeof WORK_ARRANGEMENTS> = { remote: "Remote", hybrid: "Hybrid", "on-site": "On-site", flexible: "Flexible", other: "Other" };
export const TIMELINE_LABEL: Labels<typeof TIMELINES> = { asap: "As soon as possible", "1-3-months": "1–3 months", "3-6-months": "3–6 months", "6-plus-months": "6 months or more", flexible: "Flexible" };
export const STAGE_LABEL: Labels<typeof STAGES> = { idea: "An idea", prototype: "A prototype", building: "Being built", live: "Live", other: "Other" };
export const COMMITMENT_LABEL: Labels<typeof COMMITMENTS> = { "a-few-hours": "A few hours", "part-time": "Part-time", "full-time": "Full-time", unsure: "Not sure yet" };
export const STRUCTURE_LABEL: Labels<typeof COMPENSATION_STRUCTURES> = {
  annual: "Annual salary",
  monthly: "Monthly salary",
  hourly: "Hourly rate",
  daily: "Daily rate",
  project: "Project fee",
  commission: "Commission",
  equity: "Equity",
  "revenue-share": "Revenue share",
  other: "Other",
};
export const MEETING_KIND_LABEL: Labels<typeof MEETING_KINDS> = {
  hr: "HR interview",
  technical: "Technical interview",
  manager: "Manager interview",
  panel: "Panel interview",
  discovery: "Discovery call",
  client: "Client meeting",
  general: "General meeting",
  other: "Other",
};
export const CHANNEL_LABEL: Labels<typeof CHANNELS> = { email: "Email", phone: "Phone call", whatsapp: "WhatsApp", sms: "SMS", other: "Other" };

/** Structures paid in money carry a currency (forms.ts MONEY_STRUCTURES). */
export const MONEY_STRUCTURES: readonly string[] = ["annual", "monthly", "hourly", "daily", "project"];
export const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"] as const;

// ─── The category fields ────────────────────────────────────────────────
export type FieldSpec = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "date" | "url";
  max?: number;
  optional?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Spans both columns on wider screens. */
  wide?: boolean;
  /** Shown only when this returns true, given the category's current values. */
  when?: (v: (key: string) => string) => boolean;
  /** Optional only in some states (e.g. "on behalf of" is optional for an agency). */
  optionalWhen?: (v: (key: string) => string) => boolean;
};

const TIMELINE: FieldSpec = { key: "timeline", label: "Timeline", kind: "select", options: options(TIMELINES, TIMELINE_LABEL) };

export const CATEGORY_FIELDS: Record<CategoryKey, FieldSpec[]> = {
  recruitment: [
    { key: "jobTitle", label: "Role title", kind: "text", max: 160 },
    { key: "seniority", label: "Seniority", kind: "text", max: 80, optional: true, placeholder: "Graduate, junior, mid…" },
    { key: "representation", label: "Hiring for", kind: "select", options: options(REPRESENTATIONS, REPRESENTATION_LABEL) },
    { key: "representationNote", label: "On behalf of", kind: "text", max: 200, when: (v) => v("representation") !== "" && v("representation") !== "own", optionalWhen: (v) => v("representation") === "agency" },
    { key: "workArrangement", label: "Arrangement", kind: "select", options: options(WORK_ARRANGEMENTS, WORK_ARRANGEMENT_LABEL) },
    { key: "workArrangementNote", label: "Describe the arrangement", kind: "text", max: 200, when: (v) => v("workArrangement") === "other" },
    { key: "location", label: "Location", kind: "text", max: 160, optional: true, placeholder: "City, country" },
    { key: "startDate", label: "Start date", kind: "date", optional: true },
    { key: "applicationDeadline", label: "Apply by", kind: "date", optional: true },
  ],
  service: [
    { key: "projectName", label: "Project name", kind: "text", max: 160, optional: true },
    TIMELINE,
    { key: "desiredOutcome", label: "What should it achieve?", kind: "textarea", max: 1000, wide: true },
    { key: "existingSystem", label: "Anything that already exists", kind: "text", max: 300, optional: true, hint: "A site, an app, a spreadsheet — a link or a line.", wide: true },
  ],
  collaboration: [
    { key: "projectName", label: "Project name", kind: "text", max: 160, wide: true },
    { key: "stage", label: "Where it stands", kind: "select", options: options(STAGES, STAGE_LABEL) },
    { key: "commitment", label: "Time it needs", kind: "select", options: options(COMMITMENTS, COMMITMENT_LABEL) },
    { key: "expectedContribution", label: "What you'd want from {owner}", kind: "textarea", max: 1000, wide: true },
  ],
  growth: [
    { key: "objective", label: "What you want to achieve", kind: "textarea", max: 1000, wide: true },
    { key: "targetAudience", label: "Who it's for", kind: "text", max: 300, optional: true },
    { key: "currentPresence", label: "Where you are now", kind: "url", optional: true, placeholder: "https://", hint: "A website or social link" },
    TIMELINE,
  ],
  general: [],
};

// ─── What else each form asks ───────────────────────────────────────────
export type CompensationMode = "range" | "discuss" | "unpaid" | "not-applicable";

export const FORM_SHAPE: Record<CategoryKey, { message: { label: string; hint: string }; compensation: { title: string; modes: CompensationMode[] } | null; meeting: string | null; documentsHint: string; organisation: boolean }> = {
  recruitment: {
    message: { label: "About the role", hint: "Responsibilities, requirements, the team — paste the job description if you have it." },
    compensation: { title: "Compensation", modes: ["range", "discuss", "unpaid"] },
    meeting: "Is an interview already arranged?",
    documentsHint: "a job description",
    organisation: true,
  },
  service: {
    message: { label: "About the project", hint: "The problem, what it should do, and anything that already exists." },
    compensation: { title: "Budget", modes: ["range", "discuss", "unpaid"] },
    meeting: "Is a meeting already arranged?",
    documentsHint: "a brief or proposal",
    organisation: true,
  },
  collaboration: {
    message: { label: "About the idea", hint: "What you're building, why, and where it stands." },
    compensation: { title: "Compensation, if any", modes: ["range", "discuss", "unpaid", "not-applicable"] },
    meeting: "Is a meeting already arranged?",
    documentsHint: "a brief or proposal",
    organisation: true,
  },
  growth: {
    message: { label: "About the business", hint: "What you do, who for, and where you want to grow." },
    compensation: { title: "Budget", modes: ["range", "discuss", "unpaid"] },
    meeting: null,
    documentsHint: "a brief or proposal",
    organisation: true,
  },
  general: {
    message: { label: "Your message", hint: "Whatever you'd like to say or ask." },
    compensation: null,
    meeting: null,
    documentsHint: "anything useful",
    organisation: false,
  },
};

export const COMPENSATION_MODE_LABEL: Record<CompensationMode, string> = { range: "Give a range", discuss: "Prefer to discuss", unpaid: "Unpaid", "not-applicable": "Not applicable" };

// ─── The draft: everything the visitor has typed ────────────────────────
export type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  organizationWebsite: string;
  profileUrl: string;
  preferredChannel: (typeof CHANNELS)[number];
  preferredChannelOther: string;
};
export type CompensationDraft = { mode: CompensationMode | ""; structure: string; currency: string; min: string; max: string; negotiable: boolean; note: string };
export type MeetingDraft = { status: "none" | "scheduled" | "tbd"; kind: string; startsAtLocal: string; timeZone: string; durationMinutes: string; location: string; link: string; contactPerson: string; instructions: string };

export const EMPTY_CONTACT: ContactDraft = { name: "", email: "", phone: "", organization: "", role: "", organizationWebsite: "", profileUrl: "", preferredChannel: "email", preferredChannelOther: "" };
export const EMPTY_COMPENSATION: CompensationDraft = { mode: "", structure: "annual", currency: "ZAR", min: "", max: "", negotiable: false, note: "" };
export const EMPTY_MEETING: MeetingDraft = { status: "none", kind: "hr", startsAtLocal: "", timeZone: "", durationMinutes: "", location: "", link: "", contactPerson: "", instructions: "" };

export type Draft = {
  form: CategoryKey;
  /** The category's own values, by field key. */
  values: Record<string, string>;
  compensation: CompensationDraft;
  meeting: MeetingDraft;
  /** The visitor's zone — a scheduled meeting with none typed uses it. */
  browserZone: string;
};

const trimmed = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ""));

/** The `details` object the server's category schema expects, from the fields actually shown. */
export function buildDetails({ form, values, compensation: c, meeting: m, browserZone }: Draft): Record<string, unknown> {
  const v = (k: string) => values[k] ?? "";
  const shown = CATEGORY_FIELDS[form].filter((f) => !f.when || f.when(v));
  const out: Record<string, unknown> = trimmed(Object.fromEntries(shown.map((f) => [f.key, v(f.key)])));
  const shape = FORM_SHAPE[form];
  if (shape.compensation) {
    out.compensation =
      c.mode === "range"
        ? {
            mode: "range",
            structure: c.structure,
            ...(MONEY_STRUCTURES.includes(c.structure) && { currency: c.currency }),
            ...(c.min !== "" && { min: Number(c.min) }),
            ...(c.max !== "" && { max: Number(c.max) }),
            ...(c.negotiable && { negotiable: true }),
            ...(c.note.trim() && { note: c.note.trim() }),
          }
        : c.mode
          ? { mode: c.mode, ...(c.note.trim() && { note: c.note.trim() }) }
          : {};
  }
  if (shape.meeting) {
    out.meeting =
      m.status === "scheduled"
        ? {
            status: "scheduled",
            kind: m.kind,
            startsAtLocal: m.startsAtLocal,
            timeZone: m.timeZone || browserZone,
            ...(m.durationMinutes && { durationMinutes: Number(m.durationMinutes) }),
            ...trimmed({ location: m.location, link: m.link, contactPerson: m.contactPerson, instructions: m.instructions }),
          }
        : { status: m.status };
  }
  return out;
}

export type Errors = Record<string, string>;

/** Issues as field → first message, keyed by their dotted path. */
export function collectIssues(issues: readonly { path: readonly PropertyKey[]; message: string }[], prefix = ""): Errors {
  const out: Errors = {};
  for (const i of issues) {
    const key = prefix + i.path.map(String).join(".");
    out[key] ??= i.message;
  }
  return out;
}

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 5000;

/**
 * Everything the browser can check before sending — the same schemas the
 * server runs (lib/inquiries/forms.ts), plus the message, the kind and the
 * attachments' size. The server's answer still decides.
 */
export function validateDraft(input: {
  draft: Draft;
  contact: ContactDraft;
  message: string;
  needsSubtype: boolean;
  subtype: string;
  subtypeOther: string;
  fileBytes: number;
  maxMegabytes: number;
}): Errors {
  const errors: Errors = {};
  const c = Contact.safeParse(input.contact);
  if (!c.success) Object.assign(errors, collectIssues(c.error.issues));
  const d = CATEGORY_FORMS[input.draft.form].safeParse(buildDetails(input.draft));
  if (!d.success) Object.assign(errors, collectIssues(d.error.issues, "details."));
  if (input.message.trim().length < MESSAGE_MIN) errors.message = `Write at least ${MESSAGE_MIN} characters`;
  if (input.message.length > MESSAGE_MAX) errors.message = "Keep it under 5,000 characters";
  if (input.needsSubtype && !input.subtype) errors.subtype = "Choose one";
  if (input.subtype === "other" && !input.subtypeOther.trim()) errors.subtypeOther = "Describe what it is";
  if (input.fileBytes > input.maxMegabytes * 1024 * 1024) errors.documents = `Attachments can total at most ${input.maxMegabytes} MB`;
  return errors;
}

/** Which parts of the form a visitor has filled — the progress rail. */
export function progressOf(input: { draft: Draft; contact: ContactDraft; message: string }): { key: string; label: string; done: boolean }[] {
  const { draft, contact, message } = input;
  const shape = FORM_SHAPE[draft.form];
  const v = (k: string) => draft.values[k] ?? "";
  const required = CATEGORY_FIELDS[draft.form].filter((f) => !f.optional && (!f.when || f.when(v)) && !(f.optionalWhen?.(v) ?? false));
  return [
    { key: "what", label: "What it is", done: required.every((f) => v(f.key).trim() !== "") && message.trim().length >= MESSAGE_MIN },
    ...(shape.compensation ? [{ key: "pay", label: shape.compensation.title, done: draft.compensation.mode !== "" }] : []),
    ...(shape.meeting ? [{ key: "meeting", label: "Meeting", done: draft.meeting.status !== "scheduled" || draft.meeting.startsAtLocal !== "" }] : []),
    { key: "you", label: "You", done: contact.name.trim() !== "" && /.+@.+\..+/.test(contact.email) },
  ];
}
