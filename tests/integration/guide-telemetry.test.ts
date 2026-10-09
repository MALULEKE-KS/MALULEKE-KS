// @vitest-environment node
// tests/integration/guide-telemetry.test.ts
// The guide measures itself (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1): every question
// leaves one GuideTurn row — answered, busy, failed or stopped by a limit —
// with timings and the serving model, and never any visitor text. Real route,
// real database, mock model.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

vi.mock("@/lib/guide/gateway-models", () => ({
  liveGatewayModels: vi.fn(async () => null),
  pickModels: (model: string, fallbacks: string[]) => ({ model, fallbacks }),
}));
vi.mock("@/lib/guide/model", () => ({
  guideProviderConfigured: vi.fn(() => true),
  guideModel: vi.fn(),
}));

import { POST } from "@/app/api/v1/guide/route";
import { guideModel } from "@/lib/guide/model";
import { db } from "@/lib/db";
import { loadGuideHealth } from "@/lib/guide/health";

const RUN = `gt${Date.now().toString(36)}`;
const SECRET = `needle-${RUN}-never-stored`;
let flagBefore: boolean | undefined;

function replyModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "Kurhula built this platform." },
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: { inputTokens: { total: 120, noCache: 100, cacheRead: 20, cacheWrite: undefined }, outputTokens: { total: 30, text: 30, reasoning: undefined } },
          },
        ],
      }),
    }),
  });
}

function busyModel() {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw Object.assign(new Error("rate limited"), { statusCode: 429 });
    },
  });
}

let n = 0;
async function ask(text: string, ip = `10.88.${Math.floor(++n / 250)}.${n % 250}`) {
  const res = await POST(
    new Request("http://localhost/api/v1/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
  await res.text(); // the metrics row is written when the stream ends
  return res;
}

/** Turns written since the test began (metrics are written just after the stream closes). */
async function turnsSince(since: Date, expected: number) {
  for (let i = 0; i < 40; i++) {
    const rows = await db.guideTurn.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
    if (rows.length >= expected) return rows;
    await new Promise((r) => setTimeout(r, 50));
  }
  return db.guideTurn.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
}

beforeAll(async () => {
  flagBefore = (await db.flag.findUnique({ where: { key: "concierge.enabled" } }))?.enabled;
  await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: true } });
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
});

afterAll(async () => {
  if (flagBefore !== undefined) await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: flagBefore } });
  await db.platformSetting.deleteMany({ where: { key: "concierge.rateLimit.maxPerWindow" } });
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  await db.guideTurn.deleteMany({ where: { servedModel: { startsWith: "test/" } } });
});

beforeEach(() => {
  vi.mocked(guideModel).mockImplementation(() => replyModel());
});

describe("GuideTurn — one row per question", () => {
  it("records an answered turn with timings, tokens and no visitor text", async () => {
    const since = new Date();
    const res = await ask(`Tell me about his work ${SECRET}`);
    expect(res.status).toBe(200);
    const [turn] = await turnsSince(since, 1);
    expect(turn).toBeDefined();
    expect(turn).toMatchObject({ outcome: "answered", steps: 1, inputTokens: 120, outputTokens: 30, cachedTokens: 20, finishReason: "stop" });
    expect(turn!.firstTokenMs).not.toBeNull();
    expect(turn!.totalMs).toBeGreaterThanOrEqual(turn!.firstTokenMs ?? 0);
    // Metrics only: nothing the visitor typed, and no address, is in the row.
    expect(JSON.stringify(turn)).not.toContain(SECRET);
    expect(JSON.stringify(turn)).not.toMatch(/10\.88\./);
  });

  it("records a busy model as busy, not as an answer", async () => {
    vi.mocked(guideModel).mockImplementation(() => busyModel());
    const since = new Date();
    await ask("hello there, are you busy?");
    const rows = await turnsSince(since, 1);
    expect(rows.map((r) => r.outcome)).toEqual(["busy"]);
  });

  it("records a visitor stopped by their limit as limited, and no model is asked", async () => {
    await db.platformSetting.upsert({
      where: { key: "concierge.rateLimit.maxPerWindow" },
      update: { value: 1 },
      create: { key: "concierge.rateLimit.maxPerWindow", value: 1 },
    });
    const ip = `10.99.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const before = new Date();
    await ask("first question, please", ip);
    await turnsSince(before, 1); // the first question's own row is written before the next begins
    const since = new Date();
    const second = await ask("second question, please", ip);
    expect(second.status).toBe(429);
    const rows = await turnsSince(since, 1);
    expect(rows.map((r) => r.outcome)).toEqual(["limited"]);
  });
});

describe("Guide health and pruning", () => {
  it("summarises what was recorded", async () => {
    const health = await loadGuideHealth(1);
    expect(health.summary.turns).toBeGreaterThanOrEqual(3);
    expect(health.summary.answered).toBeGreaterThanOrEqual(1);
    expect(health.perDay.at(-1)?.turns).toBeGreaterThanOrEqual(3);
    expect(health.recent.length).toBeGreaterThan(0);
  });

  it("prune_guide_logs removes rows past the window and keeps newer ones", async () => {
    const old = await db.guideTurn.create({ data: { outcome: "answered", servedModel: "test/old", tools: [], createdAt: new Date(Date.now() - 400 * 86_400_000) } });
    const fresh = await db.guideTurn.create({ data: { outcome: "answered", servedModel: "test/fresh", tools: [] } });
    const [pruned] = await db.$queryRaw<{ n: number }[]>`SELECT prune_guide_logs(180) AS n`;
    expect(pruned?.n).toBeGreaterThanOrEqual(1);
    expect(await db.guideTurn.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await db.guideTurn.findUnique({ where: { id: fresh.id } })).not.toBeNull();
  });

  it("refuses an outcome that isn't one of the fixed control states", async () => {
    await expect(db.guideTurn.create({ data: { outcome: "made-up", tools: [] } })).rejects.toThrow();
  });
});
