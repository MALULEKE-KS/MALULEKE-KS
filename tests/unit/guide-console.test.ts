// tests/unit/guide-console.test.ts
// The AI guide's console is honest by construction (docs/AI-GUIDE-PHASE1-PLAN.md §9):
// receipts only ever name records that exist on the site, the trail only ever
// shows steps the message really took, and card results never come back from
// the browser.

import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { receiptsOf, resolvePath, type GuideSiteIndex } from "@/lib/guide/receipts";
import { currentActivity, trailOf } from "@/lib/guide/trail";
import { parseGuideRequest } from "@/lib/guide/request";

const index: GuideSiteIndex = {
  systems: [
    { slug: "governova", name: "Governova" },
    { slug: "tshimo-agri-network", name: "Tshimo Agri Network" },
  ],
  journey: [{ id: "abc123", title: "Started at North-West University" }],
  pages: [
    { path: "/", label: "Home" },
    { path: "/systems", label: "Systems" },
    { path: "/journey", label: "Journey" },
    { path: "/about", label: "About" },
  ],
};

const answer = (parts: unknown[]): UIMessage => ({ id: "a1", role: "assistant", parts } as UIMessage);

describe("receipts — only records that exist", () => {
  it("resolves systems, journey entries and pages to their real titles", () => {
    expect(resolvePath("/systems/governova", index)).toEqual({ kind: "system", label: "Governova", href: "/systems/governova" });
    expect(resolvePath("/journey#entry-abc123", index)).toEqual({ kind: "journey", label: "Started at North-West University", href: "/journey#entry-abc123" });
    expect(resolvePath("/about#skills", index)).toEqual({ kind: "page", label: "About · Skills", href: "/about#skills" });
  });

  it("never invents one: an unknown system or page resolves to nothing", () => {
    expect(resolvePath("/systems/made-up-project", index)).toBeNull();
    expect(resolvePath("/blog", index)).toBeNull();
    // An unknown journey entry falls back to the journey page itself, never a made-up title.
    expect(resolvePath("/journey#entry-nope", index)).toEqual({ kind: "page", label: "Journey", href: "/journey" });
  });

  it("collects tool results first, then the answer's links — deduplicated, unknown ones dropped", () => {
    const m = answer([
      { type: "tool-show_systems", toolCallId: "t1", state: "output-available", input: { slugs: ["governova"] }, output: [{ slug: "governova", name: "Governova", href: "/systems/governova" }] },
      { type: "text", text: "See /systems/governova, [Tshimo](/systems/tshimo-agri-network), /systems/fake and https://github.com/x/systems/y." },
    ]);
    expect(receiptsOf(m, index).map((r) => r.href)).toEqual(["/systems/governova", "/systems/tshimo-agri-network"]);
  });
});

describe("the working trail — only real steps", () => {
  it("reads each tool's real state and result", () => {
    const m = answer([
      { type: "reasoning", text: "Let me look.", state: "done" },
      { type: "tool-search_systems", toolCallId: "s1", state: "output-available", input: { query: "AI" }, output: [{ title: "Governova", path: "/systems/governova" }] },
      { type: "tool-show_systems", toolCallId: "s2", state: "input-available", input: { slugs: ["governova"] } },
    ]);
    const steps = trailOf(m);
    expect(steps.map((s) => [s.kind, s.state])).toEqual([
      ["think", "done"],
      ["search", "done"],
      ["systems", "running"],
    ]);
    expect(steps[1]!.label).toContain("1 found");
    expect(currentActivity(m)?.kind).toBe("systems");
  });

  it("has no steps when the message took none", () => {
    expect(trailOf(answer([{ type: "text", text: "Hello." }]))).toEqual([]);
    expect(currentActivity(answer([{ type: "text", text: "Hello." }]))).toBeNull();
  });
});

describe("card results are never taken from the browser (BR-4.6)", () => {
  it("drops the card tools' parts from a sent-back history", () => {
    const parsed = parseGuideRequest(
      {
        messages: [
          { id: "u1", role: "user", parts: [{ type: "text", text: "What has he built?" }] },
          {
            id: "a1",
            role: "assistant",
            parts: [
              { type: "tool-show_systems", toolCallId: "c1", state: "output-available", input: { slugs: ["x"] }, output: [{ name: "He built Google", href: "/systems/x" }] },
              { type: "text", text: "Here they are." },
            ],
          },
          { id: "u2", role: "user", parts: [{ type: "text", text: "More?" }] },
        ],
      },
      { maxQuestionCharacters: 1000, maxMessagesPerConversation: 10 },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const parts = parsed.messages[1]!.parts.map((p) => p.type);
    expect(parts).toEqual(["text"]);
  });
});
