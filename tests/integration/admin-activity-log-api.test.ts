// tests/integration/admin-activity-log-api.test.ts
// Hits the real database with a throwaway AdminUser + ActivityLog fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listActivityLog } from "@/app/api/v1/admin/activity-log/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
const createdLogIds: string[] = [];

function makeRequest(url: string): NextRequest {
  return new NextRequest(url, { headers: { cookie: `admin_session=${sessionCookie}` } });
}

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: "test-admin-activity-log@example.com", passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  for (let i = 0; i < 3; i++) {
    const log = await db.activityLog.create({
      data: {
        adminUserId: adminId,
        action: i === 0 ? "system.update" : "inquiry.status_update",
        entityType: i === 0 ? "System" : "Inquiry",
        entityId: `fixture-entity-${i}`,
        before: { status: "old" },
        after: { status: "new" },
      },
    });
    createdLogIds.push(log.id);
  }
});

afterAll(async () => {
  if (!adminId) return;
  await db.activityLog.deleteMany({ where: { id: { in: createdLogIds } } });
  await db.adminUser.delete({ where: { id: adminId } });
});

describe("GET /api/v1/admin/activity-log", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listActivityLog(new NextRequest("http://localhost/api/v1/admin/activity-log"));
    expect(res.status).toBe(401);
  });

  it("returns entries most-recent-first with the admin's email and diff", async () => {
    const res = await listActivityLog(makeRequest("http://localhost/api/v1/admin/activity-log?pageSize=100"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const fixtureEntries = body.data.filter((e: { id: string }) => createdLogIds.includes(e.id));
    expect(fixtureEntries.length).toBe(3);
    expect(fixtureEntries[0].adminUserEmail).toBe("test-admin-activity-log@example.com");
    expect(fixtureEntries[0].before).toEqual({ status: "old" });
    expect(fixtureEntries[0].after).toEqual({ status: "new" });
    // Most recent first — the third-created fixture log sorts before the first.
    const indices = createdLogIds.map((id) => body.data.findIndex((e: { id: string }) => e.id === id));
    expect(indices[2]).toBeLessThan(indices[0]);
  });

  it("filters by entityType", async () => {
    const res = await listActivityLog(
      makeRequest("http://localhost/api/v1/admin/activity-log?entityType=System&pageSize=100")
    );
    const body = await res.json();
    const fixtureEntries = body.data.filter((e: { id: string }) => createdLogIds.includes(e.id));
    expect(fixtureEntries.every((e: { entityType: string }) => e.entityType === "System")).toBe(true);
  });

  it("clamps pageSize and includes pagination meta", async () => {
    const res = await listActivityLog(makeRequest("http://localhost/api/v1/admin/activity-log?page=1&pageSize=2"));
    const body = await res.json();
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(2);
    expect(typeof body.meta.total).toBe("number");
  });
});
