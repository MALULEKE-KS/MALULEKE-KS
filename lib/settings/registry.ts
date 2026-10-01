// lib/settings/registry.ts
// Every admin-editable tunable on the platform (#67), in one typed registry.
// The owner's rule: nothing hardcoded unless that's the recommended practice —
// so values that may reasonably change live here as data, editable in admin,
// with the business-rule value as the default.
//
// Each entry declares its own schema (type + safe bounds), default and the rule
// it serves. A PlatformSetting row only *overrides* a default; a missing or
// invalid row falls back to it, so a bad write can never break the site.
//
// Deliberately NOT here — business-rule *laws*, enforced in the database or
// auth code, where changing them means changing the rule, not a setting:
//   BR-2.3 message bounds (20–5000), BR-3.5 challenge TTL (5 min),
//   BR-3.2 lockout policy, BR-3.3/3.7 session lifetimes.
// Security floors can't be loosened from a screen protected by those floors.

import { z } from "zod";

interface SettingDefinition<T> {
  schema: z.ZodType<T>;
  default: T;
  description: string;
  rule: string;
}

function define<T>(def: SettingDefinition<T>) {
  return def;
}

export const SETTINGS = {
  "inquiry.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(1).max(100),
    default: 5,
    description: "Inquiries one visitor can submit per window.",
    rule: "BR-2.4",
  }),
  "inquiry.rateLimit.windowHours": define({
    schema: z.number().int().min(1).max(168),
    default: 24,
    description: "Length of the inquiry rate-limit window, in hours.",
    rule: "BR-2.4",
  }),
  "inquiry.reviewSlaHours": define({
    schema: z.number().int().min(1).max(336),
    default: 48,
    description: "Every new inquiry is reviewed within this many hours (shown publicly).",
    rule: "BR-2.2",
  }),
  "cv.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(1).max(100),
    default: 10,
    description: "CV PDFs one visitor can generate per window.",
    rule: "BR-7.1",
  }),
  "cv.rateLimit.windowMinutes": define({
    schema: z.number().int().min(1).max(1440),
    default: 60,
    description: "Length of the CV-generation rate-limit window, in minutes.",
    rule: "BR-7.1",
  }),
  "cv.upload.maxMegabytes": define({
    // Capped at 4: Vercel refuses request bodies over 4.5 MB before the app sees them.
    schema: z.number().int().min(1).max(4),
    default: 4,
    description: "Largest CV file the admin can upload, in megabytes.",
    rule: "BR-7.6",
  }),
  "profile.photo.maxMegabytes": define({
    // Capped at 4: Vercel refuses request bodies over 4.5 MB before the app sees them.
    schema: z.number().int().min(1).max(4),
    default: 4,
    description: "Largest photo the admin can upload, in megabytes (it is re-encoded smaller).",
    rule: "BR-1.17",
  }),
  "profile.photo.maxEdgePixels": define({
    schema: z.number().int().min(400).max(4000),
    default: 1600,
    description: "Longest side a stored photo is resized to, in pixels.",
    rule: "BR-1.17",
  }),
  "cv.download.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(1).max(500),
    default: 30,
    description: "Uploaded-CV downloads one visitor can make per window.",
    rule: "BR-7.6",
  }),
  "cv.download.rateLimit.windowMinutes": define({
    schema: z.number().int().min(1).max(1440),
    default: 60,
    description: "Length of the uploaded-CV download rate-limit window, in minutes.",
    rule: "BR-7.6",
  }),
  "search.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(10).max(1000),
    default: 60,
    description: "Searches one visitor can run per window (instant search types as you go).",
    rule: "F2.2",
  }),
  "search.rateLimit.windowMinutes": define({
    schema: z.number().int().min(1).max(60),
    default: 1,
    description: "Length of the search rate-limit window, in minutes.",
    rule: "F2.2",
  }),
  "content.freshnessDays": define({
    schema: z.number().int().min(7).max(730),
    default: 90,
    description: "Content nobody has edited or marked reviewed for this many days is flagged for a look.",
    rule: "BR-1.16",
  }),
  "jobs.staleAfterMinutes": define({
    // Above the platform's longest function run (5 minutes), so a live run is
    // never mistaken for an abandoned one.
    schema: z.number().int().min(6).max(240),
    default: 15,
    description: "A job still marked running after this many minutes is closed as abandoned, so it can run again.",
    rule: "F4.1",
  }),
  "maintenance.challengeRetentionDays": define({
    schema: z.number().int().min(1).max(90),
    default: 7,
    description: "Finished or expired sign-in challenges are deleted after this many days.",
    rule: "BR-3.5",
  }),
  "data.retentionMonths": define({
    schema: z.number().int().min(6).max(120),
    default: 24,
    description: "Inquiries and analytics events are anonymised or purged after this many months.",
    rule: "BR-5.2",
  }),
  "github.sync.newRepoVisibility": define({
    // The owner's rule (2026-10-01): the catalog comes from GitHub — shown by default, hidden by choice.
    schema: z.enum(["public-and-private", "public-only", "hidden"]),
    // Public repos only to start (owner, 2026-10-01): private ones wait in the admin for review.
    default: "public-only" as "public-and-private" | "public-only" | "hidden",
    description: "Which new repos from your own GitHub homes appear on the site by default (public-and-private, public-only or hidden). Private ones show as private, never linked; client and collaborated work always waits for approval.",
    rule: "BR-1.6",
  }),
  // The AI guide (PUBLIC-REDESIGN-PLAN §3a). Every limit is the owner's to tune;
  // turning the guide off is the concierge.enabled flag, not a setting.
  "concierge.model": define({
    // An AI Gateway model id, "provider/model".
    schema: z.string().trim().regex(/^[a-z0-9-]+\/[a-z0-9.-]+$/),
    // Haiku keeps the guide inside the AI Gateway's free monthly credit (owner, 2026-09-30); Sonnet is one setting away.
    default: "anthropic/claude-haiku-4.5",
    description: "The model the AI guide answers with (an AI Gateway id, provider/model).",
    rule: "Constitution §6",
  }),
  "concierge.maxMessagesPerConversation": define({
    schema: z.number().int().min(2).max(100),
    default: 20,
    description: "Questions a visitor can ask in one conversation with the AI guide.",
    rule: "Constitution §6",
  }),
  "concierge.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(1).max(500),
    default: 40,
    description: "Questions one visitor can ask the AI guide per window.",
    rule: "BR-2.4",
  }),
  "concierge.rateLimit.windowHours": define({
    schema: z.number().int().min(1).max(168),
    default: 24,
    description: "Length of the AI guide's per-visitor window, in hours.",
    rule: "BR-2.4",
  }),
  "concierge.maxQuestionCharacters": define({
    schema: z.number().int().min(100).max(4000),
    default: 1000,
    description: "Longest question a visitor can send the AI guide, in characters.",
    rule: "Constitution §6",
  }),
  "concierge.dailyMessageCap": define({
    // The spend cap: past it the guide rests until tomorrow and offers the contact form.
    schema: z.number().int().min(10).max(20000),
    default: 30,
    description: "Questions the AI guide answers per day across every visitor — the spending cap.",
    rule: "Constitution §6",
  }),
  "concierge.maxAnswerTokens": define({
    schema: z.number().int().min(100).max(2000),
    default: 700,
    description: "Longest answer the AI guide gives, in tokens (about ¾ of a word each).",
    rule: "Constitution §6",
  }),
  "concierge.contextBudgetTokens": define({
    schema: z.number().int().min(5000).max(150000),
    default: 60000,
    description: "The site's content is given to the guide whole up to this many tokens; past it, the guide searches it instead.",
    rule: "Constitution §6",
  }),
  // Generated write-ups (BR-4.5): each system's description and case study, written
  // by AI from its public repo, kept current as the repo changes.
  "writeups.model": define({
    schema: z.string().trim().regex(/^[a-z0-9-]+\/[a-z0-9.-]+$/),
    default: "anthropic/claude-haiku-4.5",
    description: "The model that writes each system's description and case study from its repo (an AI Gateway id, provider/model).",
    rule: "BR-4.5",
  }),
  "writeups.maxPerRun": define({
    // A few per day keeps the job short and inside the AI Gateway's free credit.
    schema: z.number().int().min(1).max(25),
    default: 4,
    description: "Systems whose write-up the daily job (re)writes at most, per run.",
    rule: "BR-4.5",
  }),
  "writeups.refreshDays": define({
    schema: z.number().int().min(1).max(365),
    default: 14,
    description: "A generated write-up is rewritten after its repo changes, but no more often than every this many days.",
    rule: "BR-4.5",
  }),
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["default"];

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}
