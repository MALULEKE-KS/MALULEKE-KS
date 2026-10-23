// tests/unit/guide-bot.test.ts
// The guide's own face (D-060) shows the guide's real state, never an invented one:
// off without a model, resting at the daily cap, an error on a failed request, then
// thinking → answering → done, and listening while the visitor types.

import { describe, expect, it } from "vitest";
import { botStateOf } from "@/components/guide/GuideBot";

const base = { ready: true, mood: "idle", busy: false, working: false, failure: null, done: false };

describe("botStateOf", () => {
  it("follows the guide through a question", () => {
    expect(botStateOf(base)).toBe("idle");
    expect(botStateOf({ ...base, mood: "attentive" })).toBe("listening");
    expect(botStateOf({ ...base, busy: true, working: true })).toBe("thinking");
    expect(botStateOf({ ...base, busy: true })).toBe("answering");
    expect(botStateOf({ ...base, done: true })).toBe("done");
  });

  it("is off without a model, resting at the daily cap, and shows a failure", () => {
    expect(botStateOf({ ...base, ready: false, busy: true })).toBe("offline");
    expect(botStateOf({ ...base, failure: { resting: true } })).toBe("resting");
    expect(botStateOf({ ...base, failure: {}, busy: true })).toBe("error");
  });
});
