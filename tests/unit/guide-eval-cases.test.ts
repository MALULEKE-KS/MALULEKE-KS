// tests/unit/guide-eval-cases.test.ts
// The eval suite itself must stay honest even when no model is available
// (docs/AI-GUIDE-PHASE2-PLAN.md §4 B4): unique ids, every category present, a
// gate tier broad enough to guard the guide in CI, rules that compile and can
// fail, and no case that quietly checks nothing.

import { describe, expect, it } from "vitest";
import { CASES } from "../ai-evals/cases";
import { CANARY_CASES } from "@/lib/guide/canary-cases";

const GATE = CASES.filter((c) => c.tier === "gate");

describe("the guide's eval cases", () => {
  it("number at least a hundred, with unique kebab-case ids", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(100);
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("each ask something, say what a good answer is, and have a category and tier", () => {
    for (const c of CASES) {
      expect(c.turns.length, c.id).toBeGreaterThan(0);
      for (const t of c.turns) expect(t.trim().length, c.id).toBeGreaterThan(3);
      expect(c.criteria.trim().length, c.id).toBeGreaterThan(10);
      expect(c.category, c.id).toBeTruthy();
      expect(["gate", "content"]).toContain(c.tier);
    }
  });

  it("cover every kind of failure that matters", () => {
    const categories = new Set(CASES.map((c) => c.category));
    for (const needed of ["grounding", "hallucination", "commitments", "privacy", "injection", "safety", "care", "scope", "general", "reasoning", "honesty", "language", "context", "humor", "tools"]) {
      expect(categories.has(needed), `no case for ${needed}`).toBe(true);
    }
  });

  it("keep a gate tier that needs no site content and still covers the guide's laws", () => {
    expect(GATE.length).toBeGreaterThanOrEqual(60);
    const gateCategories = new Set(GATE.map((c) => c.category));
    for (const needed of ["hallucination", "commitments", "privacy", "injection", "safety", "care", "honesty", "humor"]) {
      expect(gateCategories.has(needed), `the gate tier has no ${needed} case`).toBe(true);
    }
    // Tool cases need real content (a system to show), so they can't be in the content-free tier.
    expect(GATE.filter((c) => c.category === "tools")).toEqual([]);
  });

  it("don't depend on site content in the gate tier by naming a specific system", () => {
    // A gate case that needs "Governova" to exist would fail on an empty database for the wrong reason.
    for (const c of GATE) expect(c.turns.join(" "), c.id).not.toMatch(/Governova|FundsLink|Tshimo/);
  });

  it("have patterns that compile and plain checks that can actually fail", () => {
    for (const c of CASES) {
      const r = c.rules;
      if (!r) continue;
      const count = (r.include?.length ?? 0) + (r.includeAny?.length ?? 0) + (r.exclude?.length ?? 0);
      expect(count, `${c.id} has an empty rules object`).toBeGreaterThan(0);
    }
  });

  it("never rely on neither a judge nor a check", () => {
    for (const c of CASES) {
      const checked = c.judge !== false || Boolean(c.rules) || Boolean(c.expectTools?.length);
      expect(checked, `${c.id} checks nothing`).toBe(true);
    }
  });

  it("expect only tools the guide actually has", () => {
    const real = new Set(["open_page", "search_systems", "draft_inquiry", "show_systems", "show_journey", "show_skills", "show_pulse"]);
    for (const c of CASES) for (const t of [...(c.expectTools ?? []), ...(c.forbidTools ?? [])]) expect(real.has(t), `${c.id}: ${t}`).toBe(true);
  });

  it("include the canary's definition of the guide being itself", () => {
    // The canary's fixed questions are the minimum bar; the suite must ask at least the same things.
    const asked = new Set(CASES.flatMap((c) => c.turns.map((t) => t.toLowerCase())));
    const same = CANARY_CASES.filter((c) => asked.has(c.question.toLowerCase()));
    expect(same.length).toBeGreaterThanOrEqual(3);
  });
});
