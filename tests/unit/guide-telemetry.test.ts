// tests/unit/guide-telemetry.test.ts
// The numbers the Guide health page shows (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1)
// are pure functions of the metrics rows — tested here without a database.

import { describe, expect, it } from "vitest";
import { percentile, sameModel, startTurnTimer, summariseTurns, turnsPerDay, type TurnRow } from "@/lib/guide/telemetry";

const row = (over: Partial<TurnRow> = {}): TurnRow => ({
  createdAt: new Date("2026-10-09T10:00:00Z"),
  outcome: "answered",
  servedModel: "vendor/model-a",
  fallbackUsed: false,
  firstTokenMs: 1000,
  totalMs: 4000,
  inputTokens: 1000,
  outputTokens: 200,
  cachedTokens: 0,
  verifierChecked: null,
  verifierFlagged: null,
  ...over,
});

describe("percentile", () => {
  it("is the nearest rank, and null when there is nothing", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([5], 95)).toBe(5);
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
    expect(percentile([40, 10, 30, 20], 25)).toBe(10); // order of input doesn't matter
  });
});

describe("summariseTurns", () => {
  it("is all zeros and nulls for no turns", () => {
    const s = summariseTurns([]);
    expect(s.turns).toBe(0);
    expect(s.failureRate).toBe(0);
    expect(s.firstTokenMs.p50).toBeNull();
    expect(s.cacheShare).toBeNull();
    expect(s.models).toEqual([]);
  });

  it("counts every outcome and measures only answered turns for speed", () => {
    const s = summariseTurns([
      row({ firstTokenMs: 800, totalMs: 3000 }),
      row({ firstTokenMs: 1200, totalMs: 5000 }),
      row({ firstTokenMs: 9000, totalMs: 9500, outcome: "busy" }), // a busy turn's timing is not an answer's
      row({ outcome: "instant", firstTokenMs: null, totalMs: 120, servedModel: null }),
      row({ outcome: "limited", firstTokenMs: null, totalMs: 5, servedModel: null }),
      row({ outcome: "resting", firstTokenMs: null, totalMs: 4, servedModel: null }),
    ]);
    expect(s).toMatchObject({ turns: 6, answered: 3, instant: 1, busy: 1, errors: 0, limited: 1, resting: 1 });
    expect(s.firstTokenMs).toEqual({ p50: 800, p95: 1200 });
    expect(s.totalMs).toEqual({ p50: 3000, p95: 5000 });
  });

  it("gives the failure rate over turns a model was asked, not limits or the instant lane", () => {
    const s = summariseTurns([row(), row(), row(), row({ outcome: "busy" }), row({ outcome: "limited" }), row({ outcome: "instant" })]);
    expect(s.failureRate).toBeCloseTo(1 / 4);
  });

  it("measures the fallback rate and the model mix among answers", () => {
    const s = summariseTurns([
      row({ servedModel: "vendor/model-a" }),
      row({ servedModel: "vendor/model-b", fallbackUsed: true }),
      row({ servedModel: "vendor/model-b", fallbackUsed: true }),
      row({ servedModel: "vendor/model-a" }),
      row({ servedModel: "vendor/model-a" }),
    ]);
    expect(s.fallbackRate).toBeCloseTo(2 / 5);
    expect(s.models).toEqual([
      { model: "vendor/model-a", turns: 3 },
      { model: "vendor/model-b", turns: 2 },
    ]);
  });

  it("reports tokens and the share of input served from a cache", () => {
    const s = summariseTurns([row({ inputTokens: 1000, cachedTokens: 750, outputTokens: 100 }), row({ inputTokens: 1000, cachedTokens: 250, outputTokens: 300 })]);
    expect(s.avgInputTokens).toBe(1000);
    expect(s.avgOutputTokens).toBe(200);
    expect(s.cacheShare).toBeCloseTo(0.5);
  });
});

describe("summariseTurns — the verifier's findings", () => {
  it("totals the claims checked and flagged, and the share of answers with a claim the data lacks", () => {
    const s = summariseTurns([
      row({ verifierChecked: 4, verifierFlagged: 0 }),
      row({ verifierChecked: 5, verifierFlagged: 2 }),
      row({ verifierChecked: 1, verifierFlagged: 1 }),
      row({ verifierChecked: null, verifierFlagged: null }), // an answer from before the verifier existed
      row({ outcome: "busy", verifierChecked: 9, verifierFlagged: 9 }), // not an answer: not counted
    ]);
    expect(s.claimsChecked).toBe(10);
    expect(s.claimsFlagged).toBe(3);
    expect(s.answersFlaggedShare).toBeCloseTo(2 / 4);
  });
});

describe("turnsPerDay", () => {
  it("fills empty days, oldest first, and counts failures separately", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const days = turnsPerDay(
      [
        row({ createdAt: new Date("2026-10-09T01:00:00Z") }),
        row({ createdAt: new Date("2026-10-09T02:00:00Z"), outcome: "busy" }),
        row({ createdAt: new Date("2026-10-07T23:59:00Z") }),
        row({ createdAt: new Date("2026-09-01T00:00:00Z") }), // outside the window
      ],
      3,
      now,
    );
    expect(days).toEqual([
      { day: "2026-10-07", turns: 1, failed: 0 },
      { day: "2026-10-08", turns: 0, failed: 0 },
      { day: "2026-10-09", turns: 2, failed: 1 },
    ]);
  });
});

describe("startTurnTimer", () => {
  it("records the first word once and measures from the start", () => {
    let t = 1000;
    const timer = startTurnTimer(() => t);
    expect(timer.firstTokenMs).toBeNull();
    t = 1450;
    timer.firstToken();
    t = 2000;
    timer.firstToken(); // a second call must not move it
    expect(timer.firstTokenMs).toBe(450);
    expect(timer.elapsed()).toBe(1000);
  });
});

describe("sameModel — a free primary is not its own fallback", () => {
  it("matches a model by its plain name, whichever tier suffix it was asked for under", () => {
    expect(sameModel("inclusionai/ling-3.1-flash", "inclusionai/ling-3.1-flash-free")).toBe(true);
    expect(sameModel("vendor/model", "vendor/model:free")).toBe(true);
    expect(sameModel("Vendor/Model", "vendor/model")).toBe(true);
    expect(sameModel("anthropic/claude-haiku-4.5", "anthropic/claude-haiku-4.5")).toBe(true);
  });
  it("tells different models apart, and never matches nothing", () => {
    expect(sameModel("poolside/laguna-s-2.1", "inclusionai/ling-3.1-flash-free")).toBe(false);
    expect(sameModel("vendor/model-a", "vendor/model-b-free")).toBe(false);
    expect(sameModel(null, "vendor/model")).toBe(false);
    expect(sameModel("vendor/model", undefined)).toBe(false);
  });
});
