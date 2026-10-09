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
    // Every repo, public and private (owner, 2026-10-08); private ones show as private, never linked.
    default: "public-and-private" as "public-and-private" | "public-only" | "hidden",
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
    default: 40,
    description: "Questions a visitor can ask in one conversation with the AI guide.",
    rule: "Constitution §6",
  }),
  "concierge.rateLimit.maxPerWindow": define({
    schema: z.number().int().min(1).max(500),
    default: 60,
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
    default: 500,
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
  "concierge.maxReasoningTokens": define({
    schema: z.number().int().min(0).max(8000),
    default: 1500,
    description: "Tokens a reasoning model may think with before it answers, on top of the answer itself (0 for models that don't reason). Too low and answers get cut short.",
    rule: "Constitution §6",
  }),
  "concierge.corpusCacheSeconds": define({
    schema: z.number().int().min(0).max(3600),
    default: 60,
    description: "How long the guide reuses what it knows before reading the site's data again (0 = every question). Lower is fresher; higher answers faster.",
    rule: "Constitution §6",
  }),
  "concierge.fallbackModels": define({
    // A comma-separated list, so the settings screen edits it as text.
    schema: z
      .string()
      .trim()
      .max(400)
      .regex(/^([a-z0-9-]+\/[a-z0-9.-]+(\s*,\s*[a-z0-9-]+\/[a-z0-9.-]+){0,3})?$/, "provider/model ids separated by commas — at most 4"),
    // The gateway's free models each allow about 5 requests a minute for the whole team
    // (measured 2026-10-02) — a list of them multiplies what the guide can take at once.
    // ling-3.0-flash-sante's free tier ended 2026-10-08; the route also skips any model the gateway has retired.
    default: "inclusionai/ling-3.1-flash-free, poolside/laguna-s-2.1-free",
    description: "Models to try, in order, when the guide's model is busy or down — AI Gateway ids (provider/model) separated by commas. Empty = no fallback.",
    rule: "Constitution §6",
  }),
  "concierge.humor": define({
    schema: z.enum(["off", "dry", "playful"]),
    // dry: a touch of wit, one turn in three at most, never when the moment is serious (lib/guide/tone.ts).
    default: "dry" as "off" | "dry" | "playful",
    description: "The most wit the AI guide may use: off (always steady), dry (an occasional dry line — the default) or playful (plays along when the visitor does). Whatever you choose, it is never funny when someone is stressed, hurting or asking about money, law or health.",
    rule: "Constitution §6",
  }),
  "concierge.firstTokenDeadlineMs": define({
    schema: z.number().int().min(0).max(30000),
    default: 0,
    description: "How long a model has to start answering before the guide gives up on it and asks the next model on the fallback list, in milliseconds (0 = wait; the default). Set it from Guide health's p95 first-word time — too low drops a model that was about to answer.",
    rule: "Constitution §6",
  }),
  "concierge.logRetentionDays": define({
    schema: z.number().int().min(0).max(365),
    default: 30,
    description: "How many days the AI guide keeps a question it couldn't answer from the site's data — with emails, phone numbers and links removed, and nothing that says who asked — so you can see what visitors want that the site doesn't say. 0 = keep no question text at all.",
    rule: "Constitution §6",
  }),
  "concierge.humor.everyNthTurn": define({
    schema: z.number().int().min(0).max(10),
    default: 3,
    description: "How often the AI guide's dry wit may appear when nobody invited it: on the second answer and then every Nth (3 = one answer in three; 0 = only when the visitor is playful or under pressure). The first answer is always substance.",
    rule: "Constitution §6",
  }),
  "concierge.humor.coolDownTurns": define({
    schema: z.number().int().min(0).max(6),
    default: 2,
    description: "How many of a visitor's next questions stay serious after they mention something hard (distress, loss, a failure) — the guide won't pivot to a joke straight away.",
    rule: "Constitution §6",
  }),
  "concierge.instant.maxQuestionCharacters": define({
    schema: z.number().int().min(20).max(300),
    default: 90,
    description: "The longest question the AI guide will answer instantly from the site's data (contact, CV, counts, the platform's numbers). Longer ones have more to them and go to the model.",
    rule: "Constitution §6",
  }),
  "concierge.canary.timeBudgetSeconds": define({
    schema: z.number().int().min(30).max(280),
    default: 230,
    description: "How long the guide's nightly self-check may keep starting new questions before it stops and reports the rest as not run (the scheduled job has 300 seconds in all).",
    rule: "Constitution §6",
  }),
  "concierge.verifier.maxFlagged": define({
    schema: z.number().int().min(1).max(12),
    default: 6,
    description: "The most claims the answer check will list under one answer as 'couldn't find in the site's data'.",
    rule: "Constitution §6",
  }),
  "concierge.fit.maxRequirements": define({
    schema: z.number().int().min(1).max(12),
    default: 8,
    description: "The most needs one Fit Check will map against the site's evidence (a pasted job description is read down to this many).",
    rule: "Constitution §6",
  }),
  "concierge.fit.maxEvidence": define({
    schema: z.number().int().min(1).max(6),
    default: 3,
    description: "The most pieces of evidence (systems, roles, studies) shown under each need in a Fit Check.",
    rule: "Constitution §6",
  }),
  "concierge.logMaxCharacters": define({
    schema: z.number().int().min(50).max(320),
    default: 300,
    description: "The longest part of a question the AI guide keeps when it logs one it couldn't answer (after contact details are removed).",
    rule: "Constitution §6",
  }),
  "concierge.feedback.maxPerWindow": define({
    schema: z.number().int().min(1).max(200),
    default: 20,
    description: "How many times one visitor can mark an AI guide answer 'helpful' or 'wrong' per window (the same window as their questions).",
    rule: "BR-2.4",
  }),
  "concierge.feedback.maxAnswerCharacters": define({
    schema: z.number().int().min(100).max(2000),
    default: 800,
    description: "How much of an answer the AI guide keeps when a visitor marks it 'wrong' or 'helpful' — its opening, with contact details removed.",
    rule: "Constitution §6",
  }),
  "concierge.metricsRetentionDays": define({
    schema: z.number().int().min(7).max(730),
    default: 180,
    description: "How long the guide keeps its speed and reliability numbers (one row per question: timings, model, tokens — never what a visitor typed or who they are).",
    rule: "Constitution §6",
  }),
  "concierge.canary.paceSeconds": define({
    schema: z.number().int().min(0).max(60),
    default: 13,
    description: "Seconds the guide's daily self-check waits between its questions — the free models allow about five requests a minute for the whole site, so it must not hurry (0 for a paid model).",
    rule: "Constitution §6",
  }),
  // System screenshots (BR-1.18): captured from live sites, or uploaded by the owner.
  "inquiry.minFillSeconds": define({
    schema: z.number().int().min(0).max(60),
    default: 3,
    description: "Seconds a form must have been open before it can be sent — faster is treated as a bot (shown the same thank-you, nothing stored).",
    rule: "LT spec §2",
  }),
  "inquiry.rateLimit.perEmailPerDay": define({
    schema: z.number().int().min(1).max(50),
    default: 3,
    description: "Messages one email address can send in 24 hours, whatever connection it uses.",
    rule: "LT spec §2",
  }),
  "inquiry.documents.maxFiles": define({
    schema: z.number().int().min(0).max(5),
    default: 3,
    description: "PDFs a visitor can attach to one message (0 turns attachments off).",
    rule: "LT-8",
  }),
  "inquiry.documents.maxMegabytes": define({
    // The platform refuses requests over 4.5 MB, so 4 is the ceiling.
    schema: z.number().int().min(1).max(4),
    default: 4,
    description: "Megabytes all of one message's attachments can total.",
    rule: "LT-8",
  }),
  "inquiry.duplicateWindowDays": define({
    schema: z.number().int().min(1).max(365),
    default: 30,
    description: "A message from the same email in the same category within this many days is flagged as a possible duplicate — never removed.",
    rule: "LT-12",
  }),
  "notifications.fromAddress": define({
    // Resend's shared sender works without a domain, but only delivers to the account owner.
    schema: z.string().trim().min(3).max(200),
    default: "MALULEKE-KS <onboarding@resend.dev>",
    description: "The sender on the site's emails. Use an address on a domain verified in Resend before turning on applicant emails.",
    rule: "LT-10",
  }),
  "notifications.ownerAddress": define({
    schema: z.union([z.literal(""), z.string().trim().email()]),
    default: "",
    description: "Where new-message alerts go. Empty: the profile's contact email.",
    rule: "LT-10",
  }),
  "notifications.recipientDailyCap": define({
    schema: z.number().int().min(1).max(10),
    default: 2,
    description: "Automatic emails one address can receive in 24 hours — so a stranger's address typed into the form can't be flooded.",
    rule: "LT-9",
  }),
  "evidence.reviewDays": define({
    schema: z.number().int().min(7).max(365),
    default: 90,
    description: "Days a claim's evidence stays \"Verified\" after its last review; after that the site shows \"Review due\" on its own.",
    rule: "EV-4",
  }),
  "evidence.repository": define({
    // Vercel's own VERCEL_GIT_REPO_OWNER/SLUG win when present; this is the fallback (local, previews without git).
    schema: z.string().trim().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/),
    default: "MALULEKE-KS/MALULEKE-KS",
    description: "The public GitHub repository evidence links point into (owner/name).",
    rule: "EV-2",
  }),
  "screenshots.maxPerRun": define({
    // The screenshot service's free tier allows a few captures a day.
    schema: z.number().int().min(1).max(10),
    default: 3,
    description: "Live sites the daily job captures at most, per run.",
    rule: "BR-1.18",
  }),
  "screenshots.refreshDays": define({
    schema: z.number().int().min(1).max(365),
    default: 30,
    description: "An automatic screenshot is retaken after this many days (and whenever the system's live address changes).",
    rule: "BR-1.18",
  }),
  "screenshots.maxEdgePixels": define({
    schema: z.number().int().min(640).max(2880),
    default: 1600,
    description: "Longest side a stored screenshot is resized to, in pixels.",
    rule: "BR-1.18",
  }),
  "screenshots.upload.maxMegabytes": define({
    schema: z.number().int().min(1).max(15),
    default: 6,
    description: "Largest screenshot the admin can upload, in megabytes (it is re-encoded smaller).",
    rule: "BR-1.18",
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
  // Home — the system map (PUBLIC-REDESIGN-PLAN §3.4). How much of the real
  // data the graph draws; nothing past these limits is dropped — the rest of
  // the technologies are listed under the graph, the rest of the repos counted.
  "home.map.techInGraph": define({
    schema: z.number().int().min(4).max(30),
    default: 12,
    description: "Technologies set larger in the home page's system map (the most used first); every other one is still drawn and joined to its work, smaller.",
    rule: "PUBLIC-REDESIGN-PLAN §3.4",
  }),
  "home.map.reposPerHome": define({
    schema: z.number().int().min(0).max(12),
    default: 4,
    description: "Public repos not yet written up that the system map draws per GitHub home; the rest are counted (+N more).",
    rule: "PUBLIC-REDESIGN-PLAN §3.4",
  }),
  "github.languagesPerRepo": define({
    schema: z.number().int().min(1).max(12),
    default: 6,
    description: "GitHub languages taken from each repo, largest first, beside its curated stack — on the system map and the systems catalog.",
    rule: "PUBLIC-REDESIGN-PLAN §3.4",
  }),
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["default"];

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}
