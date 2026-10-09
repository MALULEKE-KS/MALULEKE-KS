// lib/guide/telemetry.ts
// How the AI guide measures itself (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1): one
// GuideTurn row per question — outcome, timings, serving model, tokens — so
// speed and reliability are numbers on the Guide health page, not feelings.
// Metrics only: no IP, no identifiers, no visitor text. Recording never
// affects an answer: a failed write is swallowed.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const GUIDE_OUTCOMES = ["answered", "instant", "busy", "error", "aborted", "limited", "resting"] as const;
export type GuideOutcome = (typeof GUIDE_OUTCOMES)[number];

export interface GuideTurnRecord {
  outcome: GuideOutcome;
  /** Who asked: a visitor, or the daily canary (kept out of the visitors' numbers). */
  source?: "visitor" | "canary";
  configuredModel?: string | null;
  servedModel?: string | null;
  firstTokenMs?: number | null;
  totalMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  reasoningTokens?: number | null;
  cachedTokens?: number | null;
  steps?: number;
  tools?: string[];
  finishReason?: string | null;
  /** The humor level the governor allowed for this reply. */
  humor?: "off" | "dry" | "playful" | null;
  /** What the answer verifier looked up in the site's data, and what it could not find. */
  verifierChecked?: number | null;
  verifierFlagged?: number | null;
  flaggedKinds?: string[];
  route?: unknown;
}

/**
 * The gateway reports a model by its plain name ("vendor/model") even when it was asked for under a
 * tier suffix ("vendor/model-free", "vendor/model:free"), so two ids name the same model when they
 * match once the suffix is gone — otherwise every answer from a free primary would count as a fallback.
 */
export function sameModel(a: string | null | undefined, b: string | null | undefined): boolean {
  const plain = (id: string) => id.trim().toLowerCase().replace(/(?:[-:]free)$/, "");
  return Boolean(a && b && plain(a) === plain(b));
}

const whole = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : null);

/** A bounded, JSON-safe copy of what the gateway said about routing — or null. */
function boundedRoute(route: unknown): Prisma.InputJsonValue | undefined {
  if (route === undefined || route === null) return undefined;
  try {
    const text = JSON.stringify(route);
    return text.length <= 4000 ? (JSON.parse(text) as Prisma.InputJsonValue) : undefined;
  } catch {
    return undefined;
  }
}

/** Write one turn. Never throws and never blocks an answer's failure path. */
export async function recordGuideTurn(rec: GuideTurnRecord): Promise<void> {
  try {
    const served = rec.servedModel ?? null;
    await db.guideTurn.create({
      data: {
        outcome: rec.outcome,
        source: rec.source ?? "visitor",
        configuredModel: rec.configuredModel ?? null,
        servedModel: served,
        fallbackUsed: Boolean(served && rec.configuredModel && !sameModel(served, rec.configuredModel)),
        firstTokenMs: whole(rec.firstTokenMs),
        totalMs: whole(rec.totalMs),
        inputTokens: whole(rec.inputTokens),
        outputTokens: whole(rec.outputTokens),
        reasoningTokens: whole(rec.reasoningTokens),
        cachedTokens: whole(rec.cachedTokens),
        steps: Math.max(0, rec.steps ?? 0),
        tools: (rec.tools ?? []).slice(0, 12),
        finishReason: rec.finishReason ?? null,
        humor: rec.humor ?? null,
        verifierChecked: whole(rec.verifierChecked),
        verifierFlagged: whole(rec.verifierFlagged),
        flaggedKinds: (rec.flaggedKinds ?? []).slice(0, 8),
        route: boundedRoute(rec.route),
      },
    });
  } catch {
    // Telemetry is never allowed to hurt a visitor's answer.
  }
}

/**
 * The turn's stopwatch. `firstToken()` is called on the first word of the answer
 * (idempotent); `elapsed()` is milliseconds since the request arrived.
 */
export function startTurnTimer(now: () => number = Date.now) {
  const t0 = now();
  let first: number | null = null;
  return {
    elapsed: () => now() - t0,
    firstToken() {
      if (first === null) first = now() - t0;
    },
    get firstTokenMs() {
      return first;
    },
  };
}

// ---- the numbers the Guide health page shows -------------------------------------------------

/** Nearest-rank percentile of a list (p in 0–100); null for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1]!;
}

export interface TurnRow {
  createdAt: Date;
  outcome: string;
  servedModel: string | null;
  fallbackUsed: boolean;
  firstTokenMs: number | null;
  totalMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  verifierChecked: number | null;
  verifierFlagged: number | null;
}

export interface HealthSummary {
  turns: number;
  /** Answered by a model or by the instant lane. */
  answered: number;
  instant: number;
  busy: number;
  errors: number;
  aborted: number;
  /** Turns the visitor or daily limit stopped before a model was asked. */
  limited: number;
  resting: number;
  /** Share (0–1) of turns a model answered where a fallback model had to. */
  fallbackRate: number;
  /** Share (0–1) of model turns that ended busy or failed. */
  failureRate: number;
  firstTokenMs: { p50: number | null; p95: number | null };
  totalMs: { p50: number | null; p95: number | null };
  avgInputTokens: number | null;
  avgOutputTokens: number | null;
  /** Share (0–1) of input tokens served from a prompt cache. */
  cacheShare: number | null;
  models: { model: string; turns: number }[];
  /** Claims the verifier looked up across all answers, and how many it could not find in the data. */
  claimsChecked: number;
  claimsFlagged: number;
  /** Share (0–1) of answers that had at least one claim the data does not contain. */
  answersFlaggedShare: number;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Fold a window of turns into the Guide health numbers. Pure. */
export function summariseTurns(rows: TurnRow[]): HealthSummary {
  const count = (o: string) => rows.filter((r) => r.outcome === o).length;
  const modelTurns = rows.filter((r) => ["answered", "busy", "error", "aborted"].includes(r.outcome));
  const answeredByModel = rows.filter((r) => r.outcome === "answered");
  const nums = (pick: (r: TurnRow) => number | null, from: TurnRow[]) => from.map(pick).filter((n): n is number => n !== null);
  const input = nums((r) => r.inputTokens, answeredByModel);
  const cached = nums((r) => r.cachedTokens, answeredByModel);
  const byModel = new Map<string, number>();
  for (const r of answeredByModel) if (r.servedModel) byModel.set(r.servedModel, (byModel.get(r.servedModel) ?? 0) + 1);
  const failures = count("busy") + count("error");
  return {
    turns: rows.length,
    answered: count("answered") + count("instant"),
    instant: count("instant"),
    busy: count("busy"),
    errors: count("error"),
    aborted: count("aborted"),
    limited: count("limited"),
    resting: count("resting"),
    fallbackRate: answeredByModel.length ? answeredByModel.filter((r) => r.fallbackUsed).length / answeredByModel.length : 0,
    failureRate: modelTurns.length ? failures / modelTurns.length : 0,
    firstTokenMs: { p50: percentile(nums((r) => r.firstTokenMs, answeredByModel), 50), p95: percentile(nums((r) => r.firstTokenMs, answeredByModel), 95) },
    totalMs: { p50: percentile(nums((r) => r.totalMs, answeredByModel), 50), p95: percentile(nums((r) => r.totalMs, answeredByModel), 95) },
    avgInputTokens: avg(input),
    avgOutputTokens: avg(nums((r) => r.outputTokens, answeredByModel)),
    cacheShare: input.length && input.reduce((a, b) => a + b, 0) > 0 ? cached.reduce((a, b) => a + b, 0) / input.reduce((a, b) => a + b, 0) : null,
    models: [...byModel].map(([model, turns]) => ({ model, turns })).sort((a, b) => b.turns - a.turns),
    claimsChecked: answeredByModel.reduce((n, r) => n + (r.verifierChecked ?? 0), 0),
    claimsFlagged: answeredByModel.reduce((n, r) => n + (r.verifierFlagged ?? 0), 0),
    answersFlaggedShare: answeredByModel.length ? answeredByModel.filter((r) => (r.verifierFlagged ?? 0) > 0).length / answeredByModel.length : 0,
  };
}

/** Per-day counts (UTC) for the page's small chart, oldest first, with empty days filled in. */
export function turnsPerDay(rows: TurnRow[], days: number, now = new Date()): { day: string; turns: number; failed: number }[] {
  const out = new Map<string, { turns: number; failed: number }>();
  for (let i = days - 1; i >= 0; i--) out.set(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10), { turns: 0, failed: 0 });
  for (const r of rows) {
    const bucket = out.get(r.createdAt.toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.turns += 1;
    if (r.outcome === "busy" || r.outcome === "error") bucket.failed += 1;
  }
  return [...out].map(([day, v]) => ({ day, ...v }));
}
