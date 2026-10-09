// @vitest-environment node
// tests/integration/guide-verifier.test.ts
// The answer verifier and the question log through the real route
// (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2–B3): a claim the data doesn't contain is
// flagged to the visitor and counted for the owner; a question the site couldn't
// answer is kept — scrubbed, and only if the owner allows it; nothing that
// identifies the visitor is ever stored.

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
import { guideModel } from "@/lib/guide/model";
import { loadGuideHealth } from "@/lib/guide/health";

let flagBefore: boolean | undefined;
let reply = "";

function sayingModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: reply },
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
          },
        ],
      }),
    }),
  });
}

let n = 0;
async function ask(text: string) {
  const res = await POST(
    new Request("http://localhost/api/v1/guide", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.44.${Math.floor(++n / 250)}.${n % 250}` },
      body: JSON.stringify({ messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
  expect(res.status).toBe(200);
  return res.text();
}

/** The `verification` the browser receives, from the stream's message metadata. */
function verificationOf(raw: string): { checked: number; flagged: { kind: string; text: string }[] } | undefined {
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const part = JSON.parse(line.slice(6)) as { type?: string; messageMetadata?: { verification?: { checked: number; flagged: { kind: string; text: string }[] } } };
      if (part.type === "finish" && part.messageMetadata?.verification) return part.messageMetadata.verification;
    } catch {
      // [DONE]
    }
  }
  return undefined;
}

async function waitFor<T>(find: () => Promise<T | null | undefined>): Promise<T | null> {
  for (let i = 0; i < 60; i++) {
    const found = await find();
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

const setRetention = (days: number | null) =>
  days === null
    ? db.platformSetting.deleteMany({ where: { key: "concierge.logRetentionDays" } })
    : db.platformSetting.upsert({ where: { key: "concierge.logRetentionDays" }, update: { value: days }, create: { key: "concierge.logRetentionDays", value: days } });

beforeAll(async () => {
  flagBefore = (await db.flag.findUnique({ where: { key: "concierge.enabled" } }))?.enabled;
  await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: true } });
  await db.flag.update({ where: { key: "concierge.instant_lane" }, data: { enabled: false } });
});

afterAll(async () => {
  await setRetention(null);
  await db.guideGap.deleteMany({ where: { createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (flagBefore !== undefined) await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: flagBefore } });
  await db.flag.update({ where: { key: "concierge.instant_lane" }, data: { enabled: true } });
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  await db.$disconnect();
});

beforeEach(async () => {
  reply = "";
  await setRetention(null);
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  vi.mocked(guideModel).mockImplementation(() => sayingModel());
});

describe("the answer verifier", () => {
  it("tells the visitor what it could not find in the site's data", async () => {
    reply = "He runs everything on Kubernetes, and there's more at /systems/not-a-real-system.";
    const v = verificationOf(await ask("What does his infrastructure look like?"));
    expect(v?.flagged.map((f) => f.text).sort()).toEqual(["/systems/not-a-real-system", "Kubernetes"]);
    expect(v?.checked).toBeGreaterThanOrEqual(2);
  });

  it("checks out an answer made of things the site says", async () => {
    reply = "Details are on /contact and /systems.";
    const v = verificationOf(await ask("Where can I read more?"));
    expect(v).toMatchObject({ flagged: [] });
    expect(v!.checked).toBe(2);
  });

  it("records only counts and kinds for the owner — never the claim's text", async () => {
    const since = new Date();
    reply = "He built it with Terraform and Ansible.";
    await ask("How is his infrastructure managed?");
    const turn = await waitFor(() => db.guideTurn.findFirst({ where: { createdAt: { gte: since }, outcome: "answered" }, orderBy: { createdAt: "desc" } }));
    expect(turn).toMatchObject({ verifierFlagged: 2, flaggedKinds: ["technology"] });
    expect(JSON.stringify(turn)).not.toMatch(/Terraform|Ansible/);
  });

  it("shows on Guide health", async () => {
    const health = await loadGuideHealth(1);
    expect(health.summary.claimsFlagged).toBeGreaterThanOrEqual(2);
    expect(health.summary.answersFlaggedShare).toBeGreaterThan(0);
  });
});

describe("the question log", () => {
  it("keeps a question the site couldn't answer, with contact details removed", async () => {
    await setRetention(30);
    reply = "That isn't on the site, so I won't guess — the contact form at /contact will reach him.";
    await ask("Does he have a certification in Fortran? Email me at jo.visitor@example.com or call +27 82 555 0100");
    const gap = await waitFor(() => db.guideGap.findFirst({ where: { reason: "unanswered", question: { contains: "Fortran" } } }));
    expect(gap).not.toBeNull();
    expect(gap!.question).toBe("Does he have a certification in Fortran? Email me at [email] or call [number]");
    expect(JSON.stringify(gap)).not.toMatch(/jo\.visitor|555/);
    // No address, cookie or identifier is a column at all.
    expect(Object.keys(gap!).sort()).toEqual(["createdAt", "id", "page", "question", "reason"]);
  });

  it("keeps a question the guide answered beyond the data, as 'unverified'", async () => {
    await setRetention(30);
    reply = "He has worked with Terraform for years.";
    await ask("Tell me about his devops experience, zebra-crossing-test");
    const gap = await waitFor(() => db.guideGap.findFirst({ where: { reason: "unverified", question: { contains: "zebra-crossing-test" } } }));
    expect(gap).not.toBeNull();
  });

  it("keeps nothing a visitor wrote when the owner has set retention to 0", async () => {
    await setRetention(0);
    reply = "That isn't listed on the site — try /contact.";
    await ask("Unlogged question about quokkas?");
    await new Promise((r) => setTimeout(r, 400));
    expect(await db.guideGap.count({ where: { question: { contains: "quokkas" } } })).toBe(0);
  });

  it("doesn't log an ordinary good answer", async () => {
    await setRetention(30);
    reply = "He built Xkimi Xa Mali — see /systems.";
    await ask("Ordinary-question-marker about his work");
    await new Promise((r) => setTimeout(r, 400));
    expect(await db.guideGap.count({ where: { question: { contains: "Ordinary-question-marker" } } })).toBe(0);
  });

  it("appears on Guide health for the owner", async () => {
    const health = await loadGuideHealth(1);
    expect(health.gaps.some((g) => g.question.includes("Fortran"))).toBe(true);
  });

  it("is pruned by the schedule: 0 days removes everything, a window keeps newer rows", async () => {
    await db.guideGap.create({ data: { reason: "unanswered", question: "very old question", createdAt: new Date(Date.now() - 40 * 86_400_000) } });
    await db.guideGap.create({ data: { reason: "unanswered", question: "fresh question" } });
    const [aged] = await db.$queryRaw<{ n: number }[]>`SELECT prune_guide_gaps(30) AS n`;
    expect(aged?.n).toBeGreaterThanOrEqual(1);
    expect(await db.guideGap.count({ where: { question: "very old question" } })).toBe(0);
    expect(await db.guideGap.count({ where: { question: "fresh question" } })).toBe(1);
    const [all] = await db.$queryRaw<{ n: number }[]>`SELECT prune_guide_gaps(0) AS n`;
    expect(all?.n).toBeGreaterThanOrEqual(1);
    expect(await db.guideGap.count({ where: { question: "fresh question" } })).toBe(0);
  });
});
