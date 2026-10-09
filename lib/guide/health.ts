// lib/guide/health.ts
// What Admin → Guide health shows (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1): the
// guide's speed and reliability over a window, read from GuideTurn. One loader
// for the page and for GET /admin/guide/health, so they can't disagree.

import { db } from "@/lib/db";
import { summariseTurns, turnsPerDay, type HealthSummary, type TurnRow } from "@/lib/guide/telemetry";

/** The windows the page offers, in days. */
export const HEALTH_WINDOWS = [1, 7, 30] as const;
const MAX_ROWS = 20_000;
const RECENT = 30;
const CANARY_RUNS = 14;
const GAPS = 60;
const FEEDBACK = 40;

export interface RecentTurn {
  id: string;
  at: string;
  outcome: string;
  servedModel: string | null;
  fallbackUsed: boolean;
  firstTokenMs: number | null;
  totalMs: number | null;
  tools: string[];
  finishReason: string | null;
}

export interface CanaryRun {
  id: string;
  at: string;
  model: string | null;
  total: number;
  passed: number;
  failed: number;
  /** Questions the guide couldn't answer at all (busy, resting) — not counted against it. */
  unavailable: number;
  results: { id: string; category: string; pass: boolean | null; problems: string[] }[];
}

export interface GapRow {
  id: string;
  at: string;
  reason: string;
  question: string;
  page: string | null;
}

export interface FeedbackRow {
  id: string;
  at: string;
  rating: string;
  question: string;
  answer: string;
  page: string | null;
}

export interface GuideHealth {
  days: number;
  summary: HealthSummary;
  perDay: { day: string; turns: number; failed: number }[];
  recent: RecentTurn[];
  /** The daily canary's latest runs, newest first. */
  canary: CanaryRun[];
  /** Questions the site couldn't answer, newest first (scrubbed; empty while the owner keeps none). */
  gaps: GapRow[];
  /** What visitors said about answers: the counts, and the latest (scrubbed) with the question and the answer's opening. */
  feedback: { helpful: number; wrong: number; recent: FeedbackRow[] };
}

export function parseWindow(raw: string | null | undefined): number {
  const n = Number(raw);
  return (HEALTH_WINDOWS as readonly number[]).includes(n) ? n : 7;
}

export async function loadGuideHealth(days: number, now = new Date()): Promise<GuideHealth> {
  const since = new Date(now.getTime() - days * 86_400_000);
  const rows = await db.guideTurn.findMany({
    where: { createdAt: { gte: since }, source: "visitor" },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  });
  const runs = await db.guideEvalRun.findMany({ where: { kind: "canary" }, orderBy: { createdAt: "desc" }, take: CANARY_RUNS });
  const gaps = await db.guideGap.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: GAPS });
  const [helpful, wrong, feedbackRows] = await Promise.all([
    db.guideFeedback.count({ where: { createdAt: { gte: since }, rating: "helpful" } }),
    db.guideFeedback.count({ where: { createdAt: { gte: since }, rating: "wrong" } }),
    db.guideFeedback.findMany({ where: { createdAt: { gte: since } }, orderBy: [{ rating: "desc" }, { createdAt: "desc" }], take: FEEDBACK }),
  ]);
  const turns: TurnRow[] = rows;
  return {
    days,
    summary: summariseTurns(turns),
    perDay: turnsPerDay(turns, days, now),
    recent: rows.slice(0, RECENT).map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      outcome: r.outcome,
      servedModel: r.servedModel,
      fallbackUsed: r.fallbackUsed,
      firstTokenMs: r.firstTokenMs,
      totalMs: r.totalMs,
      tools: r.tools,
      finishReason: r.finishReason,
    })),
    feedback: {
      helpful,
      wrong,
      recent: feedbackRows.map((f) => ({ id: f.id, at: f.createdAt.toISOString(), rating: f.rating, question: f.question, answer: f.answer, page: f.page })),
    },
    gaps: gaps.map((g) => ({ id: g.id, at: g.createdAt.toISOString(), reason: g.reason, question: g.question, page: g.page })),
    canary: runs.map((r) => {
      const results = (Array.isArray(r.results) ? r.results : []) as CanaryRun["results"];
      return {
        id: r.id,
        at: r.createdAt.toISOString(),
        model: r.model,
        total: r.total,
        passed: r.passed,
        failed: r.failed,
        unavailable: results.filter((x) => x.pass === null).length,
        results,
      };
    }),
  };
}
