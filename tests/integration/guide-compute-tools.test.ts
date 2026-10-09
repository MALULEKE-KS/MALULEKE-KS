// @vitest-environment node
// tests/integration/guide-compute-tools.test.ts
// The guide's computing tools (docs/AI-GUIDE-PHASE2-PLAN.md §5, §7) against the real
// database: they read only what a visitor could see, shipped switched off, offered to
// the model only while their flag is on, drive their limits from the owner's settings,
// and never let a card say more than the data does.

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
import { compareSystems } from "@/lib/guide/show-tools";
import { fitCheck, loadFitData, type FitOptions } from "@/lib/guide/fit";

const RUN = `ct-${Date.now().toString(36)}`;
const A = `${RUN}-alpha`;
const B = `${RUN}-beta`;
const D = `${RUN}-draft`;
const FLAGS = ["concierge.enabled", "concierge.instant_lane", "agent.compare_systems", "agent.fit_check"];
let savedFlags: { key: string; enabled: boolean }[] = [];
let toolsOffered: string[][] = [];
let promptsSeen: string[] = [];

function modelThatListsTools() {
  return new MockLanguageModelV4({
    doStream: async (options) => {
      toolsOffered.push(((options.tools ?? []) as { name: string }[]).map((t) => t.name));
      promptsSeen.push((options.prompt as { role: string; content: unknown }[]).filter((m) => m.role === "system").map((m) => String(m.content)).join("\n"));
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "ok" },
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
      headers: { "content-type": "application/json", "x-forwarded-for": `10.33.${Math.floor(++n / 250)}.${n % 250}` },
      body: JSON.stringify({ messages: [{ id: "u1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
  expect(res.status).toBe(200);
  await res.text();
}

const setFlag = (key: string, enabled: boolean) => db.flag.update({ where: { key }, data: { enabled } });

beforeAll(async () => {
  savedFlags = await db.flag.findMany({ where: { key: { in: FLAGS } }, select: { key: true, enabled: true } });
  const [org, status] = await Promise.all([db.organization.findFirstOrThrow(), db.status.findFirstOrThrow({ where: { key: "in_progress" } })]);
  const base = { organizationId: org.id, statusId: status.id, description: "A system for the compute-tool tests.", clientVisibility: "PUBLIC" as const, updatedAt: new Date() };
  await db.system.createMany({
    data: [
      { ...base, name: "Alpha compare system", slug: A, contentStatus: "PUBLISHED", techStack: ["TypeScript", "PostgreSQL", "Prisma"] },
      { ...base, name: "Beta compare system", slug: B, contentStatus: "PUBLISHED", techStack: ["typescript", "Python"], repoPrivate: true },
      { ...base, name: "Draft compare system", slug: D, contentStatus: "DRAFT", techStack: ["TypeScript"] },
    ],
  });
  await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: true } });
  await db.flag.update({ where: { key: "concierge.instant_lane" }, data: { enabled: false } });
});

afterAll(async () => {
  for (const f of savedFlags) await setFlag(f.key, f.enabled);
  // Systems are never deleted (BR-1.9) — the test's own rows are hidden instead.
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "DRAFT" } }).catch(() => {});
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  await db.$disconnect();
});

beforeEach(async () => {
  toolsOffered = [];
  promptsSeen = [];
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  vi.mocked(guideModel).mockImplementation(() => modelThatListsTools());
});

describe("shipped off, offered only while the flag is on (BR-4.4)", () => {
  it("both tools are off by default in the database", async () => {
    const fresh = await db.flag.findMany({ where: { key: { in: ["agent.compare_systems", "agent.fit_check"] } } });
    expect(fresh).toHaveLength(2);
    // The migration ships them off; only a test run that flipped them may differ, and afterAll restores.
    expect(savedFlags.filter((f) => f.key.startsWith("agent.")).every((f) => f.enabled === false)).toBe(true);
  });

  it("neither tool reaches the model while their flags are off", async () => {
    await setFlag("agent.compare_systems", false);
    await setFlag("agent.fit_check", false);
    await ask("Is he a good fit for a backend role?");
    expect(toolsOffered[0]).not.toContain("compare_systems");
    expect(toolsOffered[0]).not.toContain("fit_check");
    expect(promptsSeen[0]).not.toContain("fit_check");
  });

  it("each is offered, and described to the model, only when its own flag is on", async () => {
    await setFlag("agent.compare_systems", true);
    await setFlag("agent.fit_check", false);
    await ask("Is he a good fit for a backend role?");
    expect(toolsOffered[0]).toContain("compare_systems");
    expect(toolsOffered[0]).not.toContain("fit_check");

    await setFlag("agent.compare_systems", false);
    await setFlag("agent.fit_check", true);
    await ask("Is he a good fit for a backend role?");
    expect(toolsOffered[1]).toContain("fit_check");
    expect(toolsOffered[1]).not.toContain("compare_systems");
    expect(promptsSeen[1]).toContain("fit_check");
  });

  it("a fit question gets the fit playbook, pointing at the tool only while it is on", async () => {
    await setFlag("agent.fit_check", true);
    await ask("Is he a good fit for a backend role?");
    expect(promptsSeen[0]).toContain("This is a fit question");
    expect(promptsSeen[0]).toContain("call fit_check");
    await setFlag("agent.fit_check", false);
    await ask("Is he a good fit for a backend role?");
    expect(promptsSeen[1]).toContain("This is a fit question");
    expect(promptsSeen[1]).not.toContain("call fit_check");
  });
});

describe("compare_systems", () => {
  it("compares two published systems from the public view: shared and unique technologies, privacy shown", async () => {
    const card = await compareSystems(A, B);
    expect(card).not.toBeNull();
    expect(card!.left.slug).toBe(A);
    expect(card!.right).toMatchObject({ slug: B, repoPrivate: true, lastActivity: null });
    expect(card!.shared).toEqual(["TypeScript"]); // "TypeScript" and "typescript" are one technology
    expect(card!.onlyLeft).toEqual(["PostgreSQL", "Prisma"]);
    expect(card!.onlyRight).toEqual(["Python"]);
    expect(card!.pushGapDays).toBeNull(); // a private repo has no public activity to compare
  });

  it("gives nothing for a draft, a made-up slug, or a system against itself", async () => {
    expect(await compareSystems(A, D)).toBeNull();
    expect(await compareSystems(A, `${RUN}-nope`)).toBeNull();
    expect(await compareSystems(A, A)).toBeNull();
  });
});

describe("fit_check against the real public data", () => {
  const options: FitOptions = { maxRequirements: 8, maxEvidence: 3, yearsNote: "Asks for {years}+ years — since {since}.", seniorityNote: "Seniority.", noneNote: "Nothing yet." };

  it("evidence is only ever a system a visitor can open — never a draft", async () => {
    const data = await loadFitData(new Date());
    expect(data.systems.map((s) => s.slug)).toEqual(expect.arrayContaining([A, B]));
    expect(data.systems.map((s) => s.slug)).not.toContain(D);
    const card = fitCheck(["TypeScript", "Prisma"], data, options);
    for (const row of card.rows) for (const e of row.evidence) if (e.kind === "system") expect(e.href).not.toContain(D);
  });

  it("a technology no published system, role or course names is not evidenced", async () => {
    const card = fitCheck([`Zorblax${RUN}`], await loadFitData(new Date()), options);
    expect(card.rows[0]).toMatchObject({ status: "none", evidence: [], note: "Nothing yet." });
  });
});
