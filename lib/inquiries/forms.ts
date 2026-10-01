// lib/inquiries/forms.ts
// Let's Talk — the per-category forms (docs/LETS-TALK-SPEC.md LT-1, LT-2,
// LT-4, LT-5). One definition, run in the browser for guidance and on the
// server as the authority: a field another category uses is refused, not
// stored (LT-2); compensation is a choice, never inferred from a blank
// (LT-4); a meeting carries its own time zone (LT-5). A category key with no
// form of its own gets the general form, so a new category is a lookup row.

import { z } from "zod";

const Text = (max: number) => z.string().trim().min(1).max(max);
const Opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const Url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^https?:\/\/[^\s<>"]+$/i.test(v), "Enter a full link starting with https://")
  .optional()
  .or(z.literal("").transform(() => undefined));

// ─── Compensation (LT-4) ────────────────────────────────────────────────
export const COMPENSATION_STRUCTURES = ["annual", "monthly", "hourly", "daily", "project", "commission", "equity", "revenue-share", "other"] as const;
const MONEY_STRUCTURES = new Set(["annual", "monthly", "hourly", "daily", "project"]);
const MAX_AMOUNT = 1_000_000_000;

export const Compensation = z
  .object({
    mode: z.enum(["range", "discuss", "unpaid", "not-applicable"], { message: "Choose how this is paid" }),
    structure: z.enum(COMPENSATION_STRUCTURES).optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, "Use a three-letter currency code, e.g. ZAR")
      .optional(),
    min: z.number().finite().min(0).max(MAX_AMOUNT).optional(),
    max: z.number().finite().min(0).max(MAX_AMOUNT).optional(),
    negotiable: z.boolean().optional(),
    note: Opt(300),
  })
  .superRefine((c, ctx) => {
    if (c.mode !== "range") {
      // A choice that isn't a range carries no numbers — nothing half-filled is stored.
      if (c.structure || c.currency || c.min !== undefined || c.max !== undefined) {
        ctx.addIssue({ code: "custom", message: "Amounts only go with a range", path: ["mode"] });
      }
      return;
    }
    if (!c.structure) ctx.addIssue({ code: "custom", message: "Choose how it's paid", path: ["structure"] });
    if (c.structure && MONEY_STRUCTURES.has(c.structure) && !c.currency) ctx.addIssue({ code: "custom", message: "Choose a currency", path: ["currency"] });
    if (c.min === undefined) ctx.addIssue({ code: "custom", message: "Enter at least the lowest amount", path: ["min"] });
    if (c.min !== undefined && c.max !== undefined && c.min > c.max) {
      ctx.addIssue({ code: "custom", message: "The lowest amount can't be more than the highest", path: ["max"] });
    }
  });
export type CompensationT = z.infer<typeof Compensation>;

// ─── Meetings (LT-5) ────────────────────────────────────────────────────
export const MEETING_KINDS = ["hr", "technical", "manager", "panel", "discovery", "client", "general", "other"] as const;

/** IANA names the runtime knows — never a guessed default. */
export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$|^UTC$/.test(tz);
  } catch {
    return false;
  }
}

/** A wall-clock time in a zone ("2026-10-14T10:00" in "Europe/London") → the instant. */
export function zonedToUtc(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(asUtc)) return null;
  // The zone's offset at that moment, read back through Intl (two passes settle DST edges).
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess);
  return new Date(guess);
}

export const Meeting = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("none") }),
    z.object({ status: z.literal("tbd") }),
    z.object({
      status: z.literal("scheduled"),
      kind: z.enum(MEETING_KINDS),
      startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time"),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      timeZone: z.string().trim().refine(isTimeZone, "Choose the time zone the meeting is in"),
      location: Opt(200),
      link: Url,
      contactPerson: Opt(120),
      instructions: Opt(2000),
    }),
  ])
  .superRefine((m, ctx) => {
    if (m.status !== "scheduled") return;
    const at = zonedToUtc(m.startsAtLocal, m.timeZone);
    if (!at) return ctx.addIssue({ code: "custom", message: "That date and time doesn't exist", path: ["startsAtLocal"] });
    const now = Date.now();
    if (at.getTime() < now - 24 * 3600 * 1000) ctx.addIssue({ code: "custom", message: "That date has already passed", path: ["startsAtLocal"] });
    if (at.getTime() > now + 366 * 24 * 3600 * 1000) ctx.addIssue({ code: "custom", message: "That's more than a year away", path: ["startsAtLocal"] });
  });
export type MeetingT = z.infer<typeof Meeting>;

// ─── The categories' own fields ─────────────────────────────────────────
const WORK_ARRANGEMENTS = ["remote", "hybrid", "on-site", "flexible", "other"] as const;
const TIMELINES = ["asap", "1-3-months", "3-6-months", "6-plus-months", "flexible"] as const;

const recruitment = z
  .object({
    jobTitle: Text(160),
    seniority: Opt(80),
    representation: z.enum(["own", "client", "agency", "other"]),
    representationNote: Opt(200),
    workArrangement: z.enum(WORK_ARRANGEMENTS),
    workArrangementNote: Opt(200),
    location: Opt(160),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    compensation: Compensation,
    meeting: Meeting,
  })
  .strict()
  .superRefine((d, ctx) => {
    if ((d.representation === "client" || d.representation === "other") && !d.representationNote)
      ctx.addIssue({ code: "custom", message: "Say who you're hiring for", path: ["representationNote"] });
    if (d.workArrangement === "other" && !d.workArrangementNote) ctx.addIssue({ code: "custom", message: "Describe the arrangement", path: ["workArrangementNote"] });
    if (d.compensation.mode === "not-applicable") ctx.addIssue({ code: "custom", message: "A role is paid, unpaid, or to be discussed", path: ["compensation", "mode"] });
  });

const service = z
  .object({
    projectName: Opt(160),
    desiredOutcome: Text(1000),
    existingSystem: Opt(300),
    timeline: z.enum(TIMELINES),
    compensation: Compensation,
    meeting: Meeting,
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.compensation.mode === "not-applicable") ctx.addIssue({ code: "custom", message: "A project has a budget, or it's to be discussed", path: ["compensation", "mode"] });
  });

const collaboration = z
  .object({
    projectName: Text(160),
    stage: z.enum(["idea", "prototype", "building", "live", "other"]),
    expectedContribution: Text(1000),
    commitment: z.enum(["a-few-hours", "part-time", "full-time", "unsure"]),
    compensation: Compensation,
    meeting: Meeting,
  })
  .strict();

const growth = z
  .object({
    objective: Text(1000),
    targetAudience: Opt(300),
    currentPresence: Url,
    timeline: z.enum(TIMELINES),
    compensation: Compensation,
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.compensation.mode === "not-applicable") ctx.addIssue({ code: "custom", message: "Growth work has a budget, or it's to be discussed", path: ["compensation", "mode"] });
  });

const general = z.object({}).strict();

export const CATEGORY_FORMS = { recruitment, service, collaboration, growth, general } as const;
export type CategoryKey = keyof typeof CATEGORY_FORMS;

/** The form a category uses — its own, or the general one (EXT-1: a new category needs no code). */
export function formFor(categoryKey: string): CategoryKey {
  return (Object.prototype.hasOwnProperty.call(CATEGORY_FORMS, categoryKey) ? categoryKey : "general") as CategoryKey;
}

/** Which categories accept supporting documents (LT-8): those where a brief or a job spec is normal. */
export const DOCUMENTS_ALLOWED: Record<CategoryKey, boolean> = { recruitment: true, service: true, collaboration: true, growth: true, general: true };

// ─── The person and how to reach them ───────────────────────────────────
export const CHANNELS = ["email", "phone", "whatsapp", "sms", "other"] as const;
const Phone = z
  .string()
  .trim()
  .max(40)
  .refine((v) => /^\+?[0-9 ()-]{7,40}$/.test(v), "Enter a phone number, e.g. +27 82 123 4567")
  .optional()
  .or(z.literal("").transform(() => undefined));

// Bidi overrides and zero-width characters can disguise a name in the admin (LT-13).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
export const clean = (s: string) => s.replace(CONTROL_CHARS, "");

export const Contact = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(200, "Keep your name under 200 characters").transform(clean),
    email: z.string().trim().email("Enter a valid email address").max(254),
    phone: Phone,
    organization: Opt(160).transform((v) => (v ? clean(v) : v)),
    role: Opt(120).transform((v) => (v ? clean(v) : v)),
    website: Url,
    profileUrl: Url,
    preferredChannel: z.enum(CHANNELS).default("email"),
    preferredChannelOther: Opt(120),
  })
  .superRefine((c, ctx) => {
    if ((c.preferredChannel === "phone" || c.preferredChannel === "whatsapp" || c.preferredChannel === "sms") && !c.phone) {
      ctx.addIssue({ code: "custom", message: c.preferredChannel === "whatsapp" ? "Add a WhatsApp number" : "Add a phone number", path: ["phone"] });
    }
    if (c.preferredChannel === "other" && !c.preferredChannelOther) ctx.addIssue({ code: "custom", message: "Say how to reach you", path: ["preferredChannelOther"] });
  });

/** The category's details, validated by its own form; anything another category uses is refused (LT-2). */
export function parseDetails(categoryKey: string, details: unknown) {
  return CATEGORY_FORMS[formFor(categoryKey)].safeParse(details ?? {});
}
