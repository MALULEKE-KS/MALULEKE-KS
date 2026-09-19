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
  "data.retentionMonths": define({
    schema: z.number().int().min(1).max(120),
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
