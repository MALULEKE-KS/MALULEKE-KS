// tests/integration/content-freshness.test.ts
// #89 / BR-1.16 — freshness nudges: only a real edit to what visitors see (or
// an explicit "mark reviewed") restarts the clock; GitHub sync writes don't;
// live content untouched for the threshold is listed for the owner.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listStale } from "@/app/api/v1/admin/freshness/route";
import { POST as markReviewed } from "@/app/api/v1/admin/freshness/[kind]/[id]/reviewed/route";
import { GET as overview } from "@/app/api/v1/admin/overview/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

const RUN = `fr${Date.now().toString(36)}`;
const DAY = 24 * 60 * 60 * 1000;
let cookie: string;
let orgId: string;
let statusId: string;

let seq = 0;
async function createSystem(published = true) {
  seq += 1;
  const s = await db.system.create({
    data: { name: `${RUN} ${seq}`, slug: `${RUN}-${seq}`, description: "Freshness fixture.", organizationId: orgId, statusId },
  });
  return published ? db.system.update({ where: { id: s.id }, data: { contentStatus: "PUBLISHED" } }) : s;
}
const backdate = (id: string, days: number) =>
  db.system.update({ where: { id }, data: { contentReviewedAt: new Date(Date.now() - days * DAY) } });
const reviewedAt = async (id: string) => (await db.system.findUniqueOrThrow({ where: { id } })).contentReviewedAt.getTime();

function request(url: string, method = "GET") {
  return new NextRequest(url, { method, headers: { cookie: `admin_session=${cookie}` } });
}
const stale = async () => (await (await listStale(request("http://localhost/api/v1/admin/freshness"))).json()) as {
  thresholdDays: number;
  items: { kind: string; id: string; daysSince: number }[];
};
const review = (kind: string, id: string) =>
  markReviewed(request(`http://localhost/api/v1/admin/freshness/${kind}/${id}/reviewed`, "POST"), { params: Promise.resolve({ kind, id }) });

beforeAll(async () => {
  const admin = await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, 1);
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
});

// Systems are never deleted (BR-1.9): retire this run's fixtures.
afterAll(async () => {
  await db.system.updateMany({ where: { name: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("what restarts the clock (BR-1.16)", () => {
  it("a real edit to what visitors see does", async () => {
    const system = await createSystem();
    await backdate(system.id, 200);
    await db.system.update({ where: { id: system.id }, data: { description: "Rewritten." } });
    expect(Date.now() - (await reviewedAt(system.id))).toBeLessThan(60_000);
  });

  it("GitHub sync writes don't — or synced systems would never look stale", async () => {
    const system = await createSystem();
    await backdate(system.id, 200);
    const before = await reviewedAt(system.id);
    await db.system.update({
      where: { id: system.id },
      data: { repoUrl: "https://github.com/example/renamed", githubStars: 12, githubSyncedAt: new Date(), slug: `${RUN}-synced-${seq}` },
    });
    expect(await reviewedAt(system.id)).toBe(before);
  });

  it("a stamp can't be set in the future", async () => {
    const system = await createSystem();
    await db.system.update({ where: { id: system.id }, data: { contentReviewedAt: new Date(Date.now() + 30 * DAY) } });
    expect(await reviewedAt(system.id)).toBeLessThanOrEqual(Date.now());
  });
});

describe("the nudge list", () => {
  it("lists live content past the threshold, oldest first — never a draft", async () => {
    const { thresholdDays } = await stale();
    const old = await createSystem();
    const older = await createSystem();
    const draft = await createSystem(false);
    await backdate(old.id, thresholdDays + 5);
    await backdate(older.id, thresholdDays + 50);
    await backdate(draft.id, thresholdDays + 50);

    const ids = (await stale()).items.map((i) => i.id);
    expect(ids).toContain(old.id);
    expect(ids.indexOf(older.id)).toBeLessThan(ids.indexOf(old.id));
    expect(ids).not.toContain(draft.id);

    const count = (await (await overview(request("http://localhost/api/v1/admin/overview"))).json()).attention.staleContent;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("mark reviewed takes an item off the list", async () => {
    const { thresholdDays } = await stale();
    const system = await createSystem();
    await backdate(system.id, thresholdDays + 5);
    expect((await review("system", system.id)).status).toBe(200);
    expect((await stale()).items.map((i) => i.id)).not.toContain(system.id);
  });

  it("works for the profile, and refuses an unknown kind or id", async () => {
    expect((await review("profile", "1")).status).toBe(200);
    expect((await review("timeline", "x")).status).toBe(400);
    expect((await review("system", `${RUN}-missing`)).status).toBe(404);
    expect((await review("profile", "not-a-number")).status).toBe(404);
  });
});
