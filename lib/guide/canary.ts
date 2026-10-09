// lib/guide/canary.ts
// The guide's daily canary (docs/AI-GUIDE-PHASE2-PLAN.md §4 B4): a few fixed
// questions put through the live pipeline — the same handler a visitor reaches,
// the real model — and checked by plain rules, never a model. A failure here
// is the earliest sign that a prompt, a model, the grounding or a limit broke
// the guide's character; it shows on Admin → Guide health the next morning.
//
// The model path is rate-limited on the free tier, so the canary paces itself,
// retries a busy answer once, and tells "the guide couldn't answer" (unavailable,
// not counted against it) from "the guide answered wrongly" (a failure).

import type { Prisma } from "@prisma/client";
import { db, dbPublic } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { checkAnswer, type AnswerRules } from "@/lib/guide/answer-rules";
import { CANARY_CASES, type CanaryCase } from "@/lib/guide/canary-cases";
import { handleGuideRequest } from "@/lib/guide/handler";
import { readGuideStream } from "@/lib/guide/read-stream";

const CANARY_ADDRESS = "198.18.0.7"; // benchmark address space: never a real visitor

export interface CanaryResult {
  id: string;
  category: string;
  /** true = answered correctly, false = answered wrongly, null = the guide couldn't answer. */
  pass: boolean | null;
  problems: string[];
}

export interface CanarySummary {
  [key: string]: Prisma.InputJsonValue | null;
  skipped: string | null;
  total: number;
  passed: number;
  failed: number;
  unavailable: number;
  failedIds: string[];
}

type Ask = (question: string) => Promise<{ status: number; text: string; error: string | null }>;

/** Ask the real pipeline as the canary. */
const askLive: Ask = async (question) => {
  const res = await handleGuideRequest(
    new Request("http://canary.local/api/v1/guide", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": CANARY_ADDRESS },
      body: JSON.stringify({ messages: [{ id: "c1", role: "user", parts: [{ type: "text", text: question }] }] }),
    }),
    "canary",
  );
  if (!res.ok) return { status: res.status, text: "", error: null };
  const answer = await readGuideStream(res);
  return { status: res.status, text: answer.text, error: answer.error };
};

/** Resolve a case's data-dependent rules from the live public data. */
function rulesFor(c: CanaryCase, systemNames: string[]): AnswerRules | null {
  if (c.needs === "systemNames") return systemNames.length ? { includeAny: systemNames } : null;
  return c.rules;
}

export interface RunCanaryOptions {
  ask?: Ask;
  cases?: CanaryCase[];
  paceMs?: number;
  /** Don't start a new question past this many ms (concierge.canary.timeBudgetSeconds). */
  timeBudgetMs?: number;
  /** Case ids to ask first — the ones the last run couldn't ask, so every question gets its turn across nights. */
  priority?: string[];
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** The cases with the priority ids first; everything else keeps its order. */
export function orderCases(cases: CanaryCase[], priority: string[] = []): CanaryCase[] {
  const first = cases.filter((c) => priority.includes(c.id));
  return [...first, ...cases.filter((c) => !priority.includes(c.id))];
}

/** Run the canary cases and return one result each. Pure of the database except the system names it reads. */
export async function runCanaryCases(options: RunCanaryOptions = {}): Promise<{ results: CanaryResult[]; ranOutOfTime: boolean }> {
  const ask = options.ask ?? askLive;
  const cases = orderCases(options.cases ?? CANARY_CASES, options.priority);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const paceMs = options.paceMs ?? (await getSetting("concierge.canary.paceSeconds")) * 1000;
  const timeBudgetMs = options.timeBudgetMs ?? (await getSetting("concierge.canary.timeBudgetSeconds")) * 1000;
  const systemNames = cases.some((c) => c.needs === "systemNames") ? (await dbPublic.publicSystem.findMany({ select: { name: true } })).map((s) => s.name) : [];

  const started = now();
  const results: CanaryResult[] = [];
  let ranOutOfTime = false;
  for (const [i, c] of cases.entries()) {
    if (now() - started > timeBudgetMs) {
      ranOutOfTime = true;
      results.push({ id: c.id, category: c.category, pass: null, problems: ["not run: out of time"] });
      continue;
    }
    if (i > 0) await sleep(paceMs);
    const rules = rulesFor(c, systemNames);
    if (!rules) {
      results.push({ id: c.id, category: c.category, pass: null, problems: ["not run: the site has no published systems to check against"] });
      continue;
    }
    let reply = await ask(c.question);
    if (reply.status === 200 && (reply.error || !reply.text.trim())) {
      // Busy or empty: say nothing about the guide's judgement — wait and try once more.
      await sleep(paceMs);
      reply = await ask(c.question);
    }
    if (reply.status !== 200 || reply.error || !reply.text.trim()) {
      const why = reply.status !== 200 ? `the guide answered HTTP ${reply.status}` : (reply.error ?? "no answer");
      results.push({ id: c.id, category: c.category, pass: null, problems: [why] });
      continue;
    }
    const problems = checkAnswer(reply.text, rules);
    results.push({ id: c.id, category: c.category, pass: problems.length === 0, problems });
  }
  return { results, ranOutOfTime };
}

export function summariseCanary(results: CanaryResult[]): { total: number; passed: number; failed: number; unavailable: number } {
  const passed = results.filter((r) => r.pass === true).length;
  const failed = results.filter((r) => r.pass === false).length;
  return { total: passed + failed, passed, failed, unavailable: results.length - passed - failed };
}

/** The ids the latest canary run couldn't ask (out of time, busy) — asked first next time. */
async function unaskedLastTime(): Promise<string[]> {
  const last = await db.guideEvalRun.findFirst({ where: { kind: "canary" }, orderBy: { createdAt: "desc" }, select: { results: true } });
  if (!Array.isArray(last?.results)) return [];
  return (last.results as unknown as CanaryResult[]).filter((r) => r && r.pass === null && typeof r.id === "string").map((r) => r.id);
}

/** The job: run the canary against the live guide and record the run. */
export async function runGuideCanary(trigger: "schedule" | "admin" | "script" = "schedule", options: RunCanaryOptions = {}): Promise<CanarySummary> {
  const flag = await db.flag.findUnique({ where: { key: "concierge.enabled" }, select: { enabled: true } });
  if (!flag?.enabled) return { skipped: "the guide is switched off", total: 0, passed: 0, failed: 0, unavailable: 0, failedIds: [] };

  const t0 = Date.now();
  const model = await getSetting("concierge.model");
  const priority = options.priority ?? (await unaskedLastTime());
  const { results } = await runCanaryCases({ ...options, priority });
  const counts = summariseCanary(results);
  const { unavailable, ...stored } = counts;
  await db.guideEvalRun.create({
    data: { kind: "canary", model, ...stored, durationMs: Date.now() - t0, results: results as unknown as Prisma.InputJsonValue, trigger },
  });
  return { skipped: null, ...counts, unavailable, failedIds: results.filter((r) => r.pass === false).map((r) => r.id) };
}
