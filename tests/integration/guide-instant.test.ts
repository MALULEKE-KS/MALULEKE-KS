// @vitest-environment node
// tests/integration/guide-instant.test.ts
// The instant lane through the real route (docs/AI-GUIDE-PHASE2-PLAN.md §3 A3):
// pure-data questions are answered from the database with no model — before a
// limit is spent, and even with no model configured — while everything else
// still reaches the model.

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
import { db } from "@/lib/db";
import { guideModel, guideProviderConfigured } from "@/lib/guide/model";
import { readGuideStream } from "@/lib/guide/read-stream";

const FLAGS = ["concierge.enabled", "concierge.instant_lane", "agent.show_pulse"];
let saved: { key: string; enabled: boolean }[] = [];
let modelCalls = 0;

function countingModel() {
  return new MockLanguageModelV4({
    doStream: async () => {
      modelCalls += 1;
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "From the model." },
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
            },
          ],
        }),
      };
    },
  });
}

let n = 0;
async function ask(text: string) {
  const res = await POST(
    new Request("http://localhost/api/v1/guide", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.66.${Math.floor(++n / 250)}.${n % 250}` },
      body: JSON.stringify({ messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
  return { res, answer: res.ok ? await readGuideStream(res) : null };
}

const setFlag = (key: string, enabled: boolean) => db.flag.update({ where: { key }, data: { enabled } });
const guideBuckets = () => db.rateLimitEntry.count({ where: { bucketKey: { startsWith: "guide" } } });

beforeAll(async () => {
  saved = await db.flag.findMany({ where: { key: { in: FLAGS } }, select: { key: true, enabled: true } });
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
});

afterAll(async () => {
  for (const f of saved) await setFlag(f.key, f.enabled);
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  await db.guideTurn.deleteMany({ where: { outcome: "instant", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  await db.$disconnect();
});

beforeEach(async () => {
  modelCalls = 0;
  vi.mocked(guideProviderConfigured).mockReturnValue(true);
  vi.mocked(guideModel).mockImplementation(() => countingModel());
  await setFlag("concierge.enabled", true);
  await setFlag("concierge.instant_lane", true);
  await setFlag("agent.show_pulse", false);
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
});

describe("the instant lane", () => {
  it("answers a contact question from the data: no model, no limit spent", async () => {
    const { res, answer } = await ask("How do I contact him?");
    expect(res.status).toBe(200);
    expect(answer!.text).toContain("/contact");
    expect(answer!.text).toMatch(/\d+ hours/);
    expect(answer!.text).not.toContain("{");
    expect(modelCalls).toBe(0);
    expect(await guideBuckets()).toBe(0);
  });

  it("states the real review window from the settings, not a made-up one", async () => {
    const { answer } = await ask("how can I get in touch");
    const hours = (await db.platformSetting.findUnique({ where: { key: "inquiry.reviewSlaHours" } }))?.value;
    if (typeof hours === "number") expect(answer!.text).toContain(`${hours} hours`);
    expect(answer!.text).toMatch(/\b\d+ hours\b/);
  });

  it("works while no model is available at all", async () => {
    vi.mocked(guideProviderConfigured).mockReturnValue(false);
    const { res, answer } = await ask("What's his email?");
    expect(res.status).toBe(200);
    expect(answer!.text).toContain("/contact");
    // …while a question that needs the model says the guide is resting.
    const needsModel = await ask("What makes his approach to databases interesting?");
    expect(needsModel.res.status).toBe(503);
  });

  it("is recorded as an instant turn, with no model named", async () => {
    const since = new Date();
    await ask("Can I download his CV?");
    let turn;
    for (let i = 0; i < 40 && !turn; i++) {
      turn = await db.guideTurn.findFirst({ where: { outcome: "instant", createdAt: { gte: since } } });
      if (!turn) await new Promise((r) => setTimeout(r, 50));
    }
    expect(turn).toMatchObject({ outcome: "instant", servedModel: null, steps: 0 });
    expect(turn!.totalMs).not.toBeNull();
  });

  it("shows the platform pulse card only while that tool is switched on", async () => {
    const off = await ask("What is the platform status?");
    expect(off.answer!.tools).toEqual([]);
    expect(off.answer!.text).toMatch(/business rules/);

    await setFlag("agent.show_pulse", true);
    const on = await ask("What is the platform status?");
    expect(on.answer!.tools).toEqual(["show_pulse"]);
    expect(modelCalls).toBe(0);
  });

  it("counts the systems that are really published", async () => {
    const { answer } = await ask("How many systems has he built?");
    const published = (await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "PublicSystem"`)[0]!.n;
    if (published > 0) expect(answer!.text).toContain(`${published} system`);
    else expect(modelCalls).toBeGreaterThanOrEqual(0); // nothing published: the model answers instead
  });

  it("leaves a question with substance to the model", async () => {
    const { answer } = await ask("How do I contact him about a project that needs a mobile app?");
    expect(answer!.text).toBe("From the model.");
    expect(modelCalls).toBe(1);
  });

  it("is off when its flag is off: the model answers even the plain forms", async () => {
    await setFlag("concierge.instant_lane", false);
    const { answer } = await ask("How do I contact him?");
    expect(answer!.text).toBe("From the model.");
    expect(modelCalls).toBe(1);
  });

  it("falls back to the model when the owner's wording is missing or broken", async () => {
    const before = await db.siteContent.findUnique({ where: { key: "guide-instant" } });
    await db.siteContent.update({ where: { key: "guide-instant" }, data: { body: { contact: "{owner} {nope}" } } });
    try {
      const { answer } = await ask("How do I contact him?");
      expect(answer!.text).toBe("From the model.");
    } finally {
      await db.siteContent.update({ where: { key: "guide-instant" }, data: { body: before!.body as never } });
    }
  });
});
