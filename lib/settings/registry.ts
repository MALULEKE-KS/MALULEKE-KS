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
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["default"];

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}
