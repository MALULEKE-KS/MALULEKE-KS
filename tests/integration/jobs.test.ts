// tests/integration/jobs.test.ts
// #94 (F4.1) — the scheduler: cron routes authorized by CRON_SECRET only (and
// refused, never open, when it isn't set), the registry, run attribution,
// abandoned-run recovery, and the admin's run-now. #96 (F4.3) — the daily
// maintenance job: BR-5.2 retention and pruning.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as cron } from "@/app/api/cron/[job]/route";
import { POST as runNow } from "@/app/api/v1/admin/jobs/[job]/run/route";
import { GET as listJobs } from "@/app/api/v1/admin/jobs/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";
import { closeAbandonedRuns, runJob } from "@/lib/jobs/run-job";
import { runDailyMaintenance } from "@/lib/jobs/maintenance";

const RUN = `jb${Date.now().toString(36)}`;
const SECRET = `test-cron-secret-${RUN}`;
const DAY = 24 * 60 * 60 * 1000;
let adminId: string;
let cookie: string;
let inquiryTypeId: string;

const cronRequest = (job: string, auth?: string) =>
  new NextRequest(`http://localhost/api/cron/${job}`, { headers: auth ? { authorization: auth } : {} });
const params = (job: string) => ({ params: Promise.resolve({ job }) });

beforeAll(async () => {
  adminId = (await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } })).id;
  cookie = createSessionCookieValue(adminId, 1);
  inquiryTypeId = (await db.inquiryType.findFirstOrThrow()).id;
  delete process.env.GITHUB_SYNC_TOKEN; // the sync must fail cleanly, not reach GitHub
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe("cron routes (#94)", () => {
  it("refuse to run at all when CRON_SECRET isn't configured — never open", async () => {
    delete process.env.CRON_SECRET;
    const res = await cron(cronRequest("maintenance.daily", "Bearer anything"), params("maintenance.daily"));
    expect(res.status).toBe(503);
  });

  it("refuse a missing or wrong secret; run the named job with the right one", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await cron(cronRequest("maintenance.daily"), params("maintenance.daily"))).status).toBe(401);
    expect((await cron(cronRequest("maintenance.daily", `Bearer ${SECRET}x`), params("maintenance.daily"))).status).toBe(401);

    const ok = await cron(cronRequest("maintenance.daily", `Bearer ${SECRET}`), params("maintenance.daily"));
    expect([200, 409]).toContain(ok.status); // 409 if another test file's run holds the lock
    if (ok.status === 200) {
      const body = await ok.json();
      const run = await db.jobRun.findUniqueOrThrow({ where: { id: body.runId } });
      expect(run).toMatchObject({ job: "maintenance.daily", status: "SUCCEEDED", trigger: "schedule", adminUserId: null });
    }
    expect((await cron(cronRequest("nope", `Bearer ${SECRET}`), params("nope"))).status).toBe(404);
  });

  it("the daily entry runs every daily job; one failing (sync without a token) doesn't stop the others", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await cron(cronRequest("daily", `Bearer ${SECRET}`), params("daily"));
    const { results } = await res.json();
    expect(results.map((r: { job: string }) => r.job)).toEqual(["maintenance.daily", "metrics.compute", "github.sync", "systems.writeups", "systems.screenshots", "notifications.send"]);
    const sync = results.find((r: { job: string }) => r.job === "github.sync");
    if (sync.status === "failed") {
      expect(sync.error).toMatch(/GITHUB_SYNC_TOKEN is not set/);
      expect(res.status).toBe(500);
    }
    for (const r of results.filter((r: { job: string }) => r.job !== "github.sync")) {
      expect(["succeeded", "already_running"]).toContain(r.status);
    }
  });
});

describe("the runner (#94)", () => {
  it("closes a run abandoned past jobs.staleAfterMinutes, so the job can run again", async () => {
    const job = `test.stale.${RUN}`;
    const stale = await db.jobRun.create({ data: { job, startedAt: new Date(Date.now() - DAY) } });
    expect(await closeAbandonedRuns(job)).toBe(1);
    const closed = await db.jobRun.findUniqueOrThrow({ where: { id: stale.id } });
    expect(closed.status).toBe("FAILED");
    expect(closed.error).toMatch(/Abandoned/);
    expect((await runJob(job, async () => ({ ok: true }))).status).toBe("succeeded");
  });

  it("leaves a run that's merely in progress alone", async () => {
    const job = `test.live.${RUN}`;
    await db.jobRun.create({ data: { job } });
    expect(await closeAbandonedRuns(job)).toBe(0);
    expect((await runJob(job, async () => ({ ok: true }))).status).toBe("already_running");
  });

  it("the database insists an admin-started run names its admin", async () => {
    await expect(db.jobRun.create({ data: { job: `test.admin.${RUN}`, trigger: "admin" } })).rejects.toThrow();
    await expect(db.jobRun.create({ data: { job: `test.bogus.${RUN}`, trigger: "cron-ish" } })).rejects.toThrow();
  });
});

describe("admin: run now, and the list of jobs (#94)", () => {
  const adminPost = (job: string) =>
    runNow(new NextRequest(`http://localhost/api/v1/admin/jobs/${job}/run`, { method: "POST", headers: { cookie: `admin_session=${cookie}` } }), params(job));

  it("runs a registered job, recorded as started by that admin; unknown is a 404", async () => {
    const res = await adminPost("maintenance.daily");
    expect([200, 409]).toContain(res.status);
    if (res.status === 200) {
      const run = await db.jobRun.findUniqueOrThrow({ where: { id: (await res.json()).runId } });
      expect(run).toMatchObject({ trigger: "admin", adminUserId: adminId });
    }
    expect((await adminPost("nope")).status).toBe(404);
  });

  it("lists every job with its schedule, and each run's trigger", async () => {
    const res = await listJobs(new NextRequest("http://localhost/api/v1/admin/jobs", { headers: { cookie: `admin_session=${cookie}` } }));
    const body = await res.json();
    expect(body.jobs.map((j: { name: string }) => j.name).sort()).toEqual(["github.sync", "guide.canary", "maintenance.daily", "metrics.compute", "notifications.send", "systems.screenshots", "systems.writeups"]);
    // The daily batch shares one schedule; the AI guide's canary has its own cron entry.
    for (const j of body.jobs as { name: string; schedule: string | null }[]) expect(j.schedule).toBe(j.name === "guide.canary" ? "30 1 * * *" : "0 3 * * *");
    expect(body.data[0]).toHaveProperty("trigger");
  });
});

describe("maintenance.daily — BR-5.2 retention and pruning (#96)", () => {
  const monthsAgo = (m: number) => new Date(Date.now() - m * 31 * DAY);

  async function inquiry(createdAt: Date, name: string) {
    return db.inquiry.create({
      data: {
        inquiryTypeId,
        name,
        email: `${RUN}.${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        message: "I'd like to talk about a project — long enough to pass BR-2.3.",
        idempotencyKey: `${RUN}-${name}`,
        createdAt,
      },
    });
  }

  it("strips personal data from inquiries past the retention period, keeps the facts, and leaves recent ones alone", async () => {
    const old = await inquiry(monthsAgo(30), "Old Visitor");
    const recent = await inquiry(monthsAgo(2), "Recent Visitor");
    const summary = await runDailyMaintenance();
    expect(summary.retentionMonths).toBe(24);
    expect(summary.inquiriesAnonymized).toBeGreaterThanOrEqual(1);

    const after = await db.inquiry.findUniqueOrThrow({ where: { id: old.id } });
    expect(after).toMatchObject({ name: "Anonymized", email: "anonymized@retention.invalid", idempotencyKey: null, inquiryTypeId, status: "NEW" });
    expect(after.anonymizedAt).not.toBeNull();
    expect(after.createdAt).toEqual(old.createdAt);
    expect(await db.inquiry.findUniqueOrThrow({ where: { id: recent.id } })).toMatchObject({ name: "Recent Visitor", anonymizedAt: null });

    // Idempotent: nothing more to do for this row.
    const again = await db.inquiry.findUniqueOrThrow({ where: { id: old.id } });
    await runDailyMaintenance();
    expect((await db.inquiry.findUniqueOrThrow({ where: { id: old.id } })).anonymizedAt).toEqual(again.anonymizedAt);
  });

  it("anonymisation is one-way — personal fields can't be written back; the workflow can still move on", async () => {
    const old = await inquiry(monthsAgo(30), "Another Old Visitor");
    await runDailyMaintenance();
    await expect(db.inquiry.update({ where: { id: old.id }, data: { name: "Restored Name" } })).rejects.toThrow(/BR-5\.2/);
    await expect(db.inquiry.update({ where: { id: old.id }, data: { anonymizedAt: null } })).rejects.toThrow(/BR-5\.2/);
    expect((await db.inquiry.update({ where: { id: old.id }, data: { status: "REVIEWED" } })).status).toBe("REVIEWED");
  });

  it("anonymises old events: no session or metadata left", async () => {
    const event = await db.event.create({
      data: { eventType: "page_view", sessionId: `${RUN}-session`, metadata: { path: "/systems" }, createdAt: monthsAgo(30) },
    });
    await runDailyMaintenance();
    expect(await db.event.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({ sessionId: "anonymized", metadata: null, eventType: "page_view" });
  });

  it("prunes ended rate-limit windows and old finished sign-in challenges, keeping live ones", async () => {
    const ended = await db.rateLimitEntry.create({ data: { bucketKey: `${RUN}:ended`, windowEnd: new Date(Date.now() - 1000) } });
    const live = await db.rateLimitEntry.create({ data: { bucketKey: `${RUN}:live`, windowEnd: new Date(Date.now() + DAY) } });
    const oldChallenge = await db.loginChallenge.create({
      data: { tokenHash: `${RUN}-old`, adminUserId: adminId, createdAt: new Date(Date.now() - 30 * DAY - 60_000), expiresAt: new Date(Date.now() - 30 * DAY), consumedAt: new Date(Date.now() - 30 * DAY) },
    });
    const freshChallenge = await db.loginChallenge.create({
      data: { tokenHash: `${RUN}-fresh`, adminUserId: adminId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const summary = await runDailyMaintenance();
    expect(summary.rateLimitRows).toBeGreaterThanOrEqual(1);
    expect(summary.loginChallenges).toBeGreaterThanOrEqual(1);
    expect(await db.rateLimitEntry.findUnique({ where: { id: ended.id } })).toBeNull();
    expect(await db.rateLimitEntry.findUnique({ where: { id: live.id } })).not.toBeNull();
    expect(await db.loginChallenge.findUnique({ where: { id: oldChallenge.id } })).toBeNull();
    expect(await db.loginChallenge.findUnique({ where: { id: freshChallenge.id } })).not.toBeNull();
  });
});
