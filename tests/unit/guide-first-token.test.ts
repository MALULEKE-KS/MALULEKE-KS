// tests/unit/guide-first-token.test.ts
// The first-word deadline (docs/AI-GUIDE-PHASE2-PLAN.md §3 A4): a silent model is
// dropped for the next one, in sequence; a model that speaks in time is left
// alone, with nothing lost or reordered.

import { describe, expect, it } from "vitest";
import { generateText, simulateReadableStream, streamText, wrapLanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { firstTokenDeadline, isSpeaking } from "@/lib/guide/first-token";

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const finish = { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, usage };

/** A model that opens its stream, then says `text` after `delayMs`. */
function modelSaying(text: string, delayMs: number, calls: { n: number } = { n: 0 }) {
  return new MockLanguageModelV4({
    doStream: async () => {
      calls.n += 1;
      return {
        stream: simulateReadableStream({
          chunks: [{ type: "stream-start", warnings: [] }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: text }, { type: "text-end", id: "t" }, finish],
          // simulateReadableStream delays every chunk after the first; the first is the (silent) stream start.
          initialDelayInMs: 0,
          chunkDelayInMs: delayMs,
        }),
      };
    },
  });
}

async function answer(model: ReturnType<typeof wrapLanguageModel>) {
  const result = streamText({ model, prompt: "hi" });
  return result.text;
}

describe("isSpeaking", () => {
  it("is false for the stream merely opening or an empty throat-clear, true for real output", () => {
    expect(isSpeaking({ type: "stream-start" })).toBe(false);
    expect(isSpeaking({ type: "text-start" })).toBe(false);
    expect(isSpeaking({ type: "response-metadata" })).toBe(false);
    expect(isSpeaking({ type: "text-delta", delta: "" })).toBe(false);
    expect(isSpeaking({ type: "text-delta", delta: "Hi" })).toBe(true);
    expect(isSpeaking({ type: "reasoning-delta", delta: "Let me think" })).toBe(true);
    expect(isSpeaking({ type: "tool-call" })).toBe(true);
    expect(isSpeaking({ type: "error" })).toBe(true);
    expect(isSpeaking({ type: "finish" })).toBe(true);
  });
});

describe("firstTokenDeadline", () => {
  it("leaves a model that speaks in time alone, and never asks the fallback", async () => {
    const fallbackCalls = { n: 0 };
    const primaryCalls = { n: 0 };
    const model = wrapLanguageModel({
      model: modelSaying("from the primary", 0, primaryCalls),
      middleware: firstTokenDeadline({ deadlineMs: 500, fallbacks: [modelSaying("from the fallback", 0, fallbackCalls)] }),
    });
    expect(await answer(model)).toBe("from the primary");
    expect(primaryCalls.n).toBe(1);
    expect(fallbackCalls.n).toBe(0);
  });

  it("drops a silent model after the deadline and takes the next one's answer", async () => {
    const fallbackCalls = { n: 0 };
    const model = wrapLanguageModel({
      model: modelSaying("from the slow primary", 400),
      middleware: firstTokenDeadline({ deadlineMs: 60, fallbacks: [modelSaying("from the fallback", 0, fallbackCalls)] }),
    });
    const started = Date.now();
    expect(await answer(model)).toBe("from the fallback");
    expect(fallbackCalls.n).toBe(1);
    expect(Date.now() - started).toBeLessThan(380); // it did not wait the slow model out
  });

  it("tries fallbacks one after another, never together", async () => {
    const order: string[] = [];
    const slow = (name: string) =>
      new MockLanguageModelV4({
        doStream: async () => {
          order.push(`${name}:asked`);
          return { stream: simulateReadableStream({ chunks: [{ type: "stream-start", warnings: [] }, { type: "text-delta", id: "t", delta: name }, finish], chunkDelayInMs: 300 }) };
        },
      });
    const model = wrapLanguageModel({
      model: slow("primary"),
      middleware: firstTokenDeadline({ deadlineMs: 50, fallbacks: [slow("second"), modelSaying("third", 0)] }),
    });
    expect(await answer(model)).toBe("third");
    expect(order).toEqual(["primary:asked", "second:asked"]); // the second was asked only after the primary was dropped
  });

  it("returns the last model's answer however slow — there is nothing left to try", async () => {
    const model = wrapLanguageModel({
      model: modelSaying("slow primary", 200),
      middleware: firstTokenDeadline({ deadlineMs: 30, fallbacks: [modelSaying("slow last", 120)] }),
    });
    expect(await answer(model)).toBe("slow last");
  });

  it("is a no-op with a deadline of 0 or no fallbacks", async () => {
    const calls = { n: 0 };
    const off = wrapLanguageModel({ model: modelSaying("only", 100), middleware: firstTokenDeadline({ deadlineMs: 0, fallbacks: [modelSaying("never", 0, calls)] }) });
    expect(await answer(off)).toBe("only");
    const alone = wrapLanguageModel({ model: modelSaying("alone", 100), middleware: firstTokenDeadline({ deadlineMs: 10, fallbacks: [] }) });
    expect(await answer(alone)).toBe("alone");
    expect(calls.n).toBe(0);
  });

  it("passes an error through as the model's first word instead of waiting on it", async () => {
    const broken = new MockLanguageModelV4({
      doStream: async () => ({ stream: simulateReadableStream({ chunks: [{ type: "stream-start", warnings: [] }, { type: "error", error: new Error("boom") }] }) }),
    });
    const calls = { n: 0 };
    const model = wrapLanguageModel({ model: broken, middleware: firstTokenDeadline({ deadlineMs: 500, fallbacks: [modelSaying("fallback", 0, calls)] }) });
    await expect(generateText({ model, prompt: "hi" })).rejects.toBeDefined();
    expect(calls.n).toBe(0);
  });
});
