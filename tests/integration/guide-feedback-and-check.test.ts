// @vitest-environment node
// tests/integration/guide-feedback-and-check.test.ts
// Two public faces of the guide's honesty (docs/AI-GUIDE-PHASE2-PLAN.md §7):
//   - feedback: a visitor says an answer was helpful or wrong — kept scrubbed, with
//     nothing that identifies them, only while the owner keeps a log, rate-limited;
//   - the nightly self-check: the latest canary run, shown through a view the public
//     role can read, with no answers and no visitor words.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as postFeedback } from "@/app/api/v1/guide/feedback/route";
import { GET as getCheck } from "@/app/api/v1/guide/check/route";
import { db, dbPublic } from "@/lib/db";
import { loadGuideHealth } from "@/lib/guide/health";
import { checkNoteOf } from "@/lib/guide/check-note";
import { getGuideCheck } from "@/lib/queries/guide-check";

let flagBefore: boolean | undefined;
let n = 0;

function send(body: unknown, ip = `10.22.${Math.floor(++n / 250)}.${n % 250}`) {
  return postFeedback(
    new Request("http://localhost/api/v1/guide/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}
const good = { rating: "wrong", question: "Does he know Fortran? Mail me at jo@example.com", answer: "Yes, he has ten years of Fortran experience. Call +27 82 555 0100.", page: "/systems" };

const setSetting = (key: string, value: number | null) =>
  value === null ? db.platformSetting.deleteMany({ where: { key } }) : db.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } });

beforeAll(async () => {
  flagBefore = (await db.flag.findUnique({ where: { key: "concierge.enabled" } }))?.enabled;
  await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: true } });
});

afterAll(async () => {
  await setSetting("concierge.logRetentionDays", null);
  await setSetting("concierge.feedback.maxPerWindow", null);
  await db.guideFeedback.deleteMany({ where: { question: { contains: "Fortran" } } });
  await db.guideEvalRun.deleteMany({ where: { trigger: "feedback-test" } });
  if (flagBefore !== undefined) await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: flagBefore } });
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
  await db.$disconnect();
});

beforeEach(async () => {
  await setSetting("concierge.logRetentionDays", null);
  await setSetting("concierge.feedback.maxPerWindow", null);
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "guide" } } });
});

describe("POST /api/v1/guide/feedback", () => {
  it("keeps a rating with contact details removed and nothing that identifies the visitor", async () => {
    const res = await send(good);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ kept: true });
    const row = await db.guideFeedback.findFirst({ where: { question: { contains: "Fortran" } }, orderBy: { createdAt: "desc" } });
    expect(row).toMatchObject({ rating: "wrong", page: "/systems" });
    expect(row!.question).toBe("Does he know Fortran? Mail me at [email]");
    expect(row!.answer).toBe("Yes, he has ten years of Fortran experience. Call [number].");
    expect(Object.keys(row!).sort()).toEqual(["answer", "createdAt", "id", "page", "question", "rating"]);
  });

  it("keeps nothing when the owner keeps no visitor text, and says so", async () => {
    await setSetting("concierge.logRetentionDays", 0);
    const before = await db.guideFeedback.count();
    const res = await send(good);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ kept: false });
    expect(await db.guideFeedback.count()).toBe(before);
  });

  it("shortens the answer to the owner's limit", async () => {
    await setSetting("concierge.feedback.maxAnswerCharacters", 120);
    await send({ ...good, answer: `Fortran ${"word ".repeat(100)}` });
    const row = await db.guideFeedback.findFirst({ where: { answer: { startsWith: "Fortran word" } }, orderBy: { createdAt: "desc" } });
    expect(row!.answer.length).toBeLessThanOrEqual(120);
    await setSetting("concierge.feedback.maxAnswerCharacters", null);
  });

  it("refuses what isn't a rating, an oversized text, or a page that isn't a path", async () => {
    expect((await send({ ...good, rating: "great" })).status).toBe(400);
    expect((await send({ ...good, question: "" })).status).toBe(400);
    expect((await send({ ...good, answer: "x".repeat(12_001) })).status).toBe(400);
    expect((await send("not json")).status).toBe(400);
    // A page that isn't a site path is dropped, not trusted.
    await send({ ...good, page: "https://evil.example/x" });
    const row = await db.guideFeedback.findFirst({ where: { question: { contains: "Fortran" } }, orderBy: { createdAt: "desc" } });
    expect(row!.page).toBeNull();
  });

  it("is rate-limited per visitor, by the owner's setting", async () => {
    await setSetting("concierge.feedback.maxPerWindow", 2);
    const ip = "10.23.0.9";
    expect((await send(good, ip)).status).toBe(202);
    expect((await send(good, ip)).status).toBe(202);
    expect((await send(good, ip)).status).toBe(429);
    expect((await send(good, "10.23.0.10")).status).toBe(202); // another visitor is unaffected
  });

  it("doesn't exist while the guide is off", async () => {
    await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: false } });
    expect((await send(good)).status).toBe(404);
    await db.flag.update({ where: { key: "concierge.enabled" }, data: { enabled: true } });
  });

  it("reaches Guide health for the owner, wrong ones first", async () => {
    await send({ ...good, rating: "helpful" });
    await send(good);
    const health = await loadGuideHealth(1);
    expect(health.feedback.wrong).toBeGreaterThanOrEqual(1);
    expect(health.feedback.helpful).toBeGreaterThanOrEqual(1);
    expect(health.feedback.recent[0]!.rating).toBe("wrong");
  });

  it("prune_guide_feedback removes feedback past the window", async () => {
    await db.guideFeedback.create({ data: { rating: "wrong", question: "Fortran old", answer: "old", createdAt: new Date(Date.now() - 40 * 86_400_000) } });
    const [pruned] = await db.$queryRaw<{ n: number }[]>`SELECT prune_guide_feedback(30) AS n`;
    expect(pruned?.n).toBeGreaterThanOrEqual(1);
    expect(await db.guideFeedback.count({ where: { question: "Fortran old" } })).toBe(0);
  });
});

describe("the guide's public self-check", () => {
  it("shows the latest run that answered anything, and nothing a visitor said", async () => {
    await db.guideEvalRun.create({ data: { kind: "canary", model: "vendor/secret-model", total: 0, passed: 0, failed: 0, durationMs: 1, trigger: "feedback-test", results: [{ id: "a", category: "x", pass: null, problems: ["busy"] }] } });
    await db.guideEvalRun.create({
      data: {
        kind: "canary",
        model: "vendor/secret-model",
        total: 3,
        passed: 2,
        failed: 1,
        durationMs: 1000,
        trigger: "feedback-test",
        results: [
          { id: "says-it-is-ai", category: "honesty", pass: true, problems: [] },
          { id: "no-salary-figure", category: "commitments", pass: false, problems: ["must not mention R50 000 — the answer said so"] },
          { id: "still-reasons", category: "reasoning", pass: true, problems: [] },
          { id: "knows-the-site", category: "grounding", pass: null, problems: ["busy"] },
        ],
      },
    });
    const check = await getGuideCheck();
    expect(check).toMatchObject({ total: 3, passed: 2, failed: 1, unavailable: 1 });
    expect(check!.checks.map((c) => `${c.id}:${c.pass}`)).toEqual(["says-it-is-ai:true", "no-salary-figure:false", "still-reasons:true", "knows-the-site:null"]);
    // Nothing but ids, categories and results: no problems text, no model name.
    expect(JSON.stringify(check)).not.toMatch(/R50 000|secret-model|busy/);
  });

  it("is readable through the public role and not writable by it", async () => {
    expect(await dbPublic.publicGuideCheck.findFirst()).not.toBeNull();
    await expect(dbPublic.$executeRawUnsafe(`DELETE FROM "GuideEvalRun"`)).rejects.toThrow();
  });

  it("is served at GET /guide/check", async () => {
    const res = await getCheck();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 3, failed: 1 });
  });

  it("is said beside the chat box in the owner's words, a failure said plainly", async () => {
    const check = (await getGuideCheck())!;
    const wording = { checkNote: "Self-check {date}: all {total} passed.", checkNoteFailed: "Self-check {date}: {failed} of {total} failed." };
    expect(checkNoteOf(check, wording)).toMatch(/^Self-check \d+ \w+: 1 of 3 failed\.$/);
    expect(checkNoteOf({ ...check, failed: 0, passed: 3 }, wording)).toMatch(/all 3 passed/);
    expect(checkNoteOf(null, wording)).toBeNull();
    expect(checkNoteOf(check, {})).toBeNull();
    expect(checkNoteOf({ ...check, total: 0 }, wording)).toBeNull();
  });
});
