// tests/integration/timeline-api.test.ts
// Hits the real database with a throwaway AdminUser + Timeline fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listPublicTimeline } from "@/app/api/v1/timeline/route";
import { GET as listAdminTimeline, POST as createTimeline } from "@/app/api/v1/admin/timeline/route";
import { PATCH as patchTimeline, DELETE as deleteTimeline } from "@/app/api/v1/admin/timeline/[id]/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let milestoneTypeId: string;
let otherMilestoneTypeId: string;
const createdEntryIds: string[] = [];

function makeRequest(url: string, method: string, body: object | null, withCookie: boolean): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withCookie ? { cookie: `admin_session=${sessionCookie}` } : {}),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: `test-admin-timeline-${Date.now().toString(36)}@example.com`, passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const milestoneType = await db.milestoneType.findFirstOrThrow({ where: { key: "job" } });
  milestoneTypeId = milestoneType.id;
  const otherMilestoneType = await db.milestoneType.findFirstOrThrow({ where: { key: "launch" } });
  otherMilestoneTypeId = otherMilestoneType.id;
});

afterAll(async () => {
  // No audit/admin cleanup: ActivityLog is append-only (F1.3) and an admin it
  // references can't be deleted. The test database is disposable, and each
  // run uses its own admin email, so leftovers never collide.
  if (!adminId) return;
  await db.timeline.deleteMany({ where: { id: { in: createdEntryIds } } });
});

describe("GET /api/v1/timeline (public)", () => {
  it("lists entries with no auth required, filterable by milestoneType", async () => {
    const entry = await db.timeline.create({
      data: { milestoneTypeId, title: "Fixture Job Entry", date: new Date("2024-01-01"), tags: ["fixture"] },
    });
    createdEntryIds.push(entry.id);

    const res = await listPublicTimeline(new NextRequest("http://localhost/api/v1/timeline?milestoneType=job"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((e: { id: string }) => e.id === entry.id)).toBe(true);
    expect(body.every((e: { milestoneType: string }) => e.milestoneType === "job")).toBe(true);
  });
});

describe("GET/POST /api/v1/admin/timeline", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listAdminTimeline(makeRequest("http://localhost/api/v1/admin/timeline", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("creates a timeline entry", async () => {
    const res = await createTimeline(
      makeRequest(
        "http://localhost/api/v1/admin/timeline",
        "POST",
        { milestoneTypeId: otherMilestoneTypeId, title: "Fixture Launch", date: "2024-02-01", tags: [] },
        true
      )
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    createdEntryIds.push(body.id);
    expect(body.milestoneType).toBe("launch");
  });
});

describe("PATCH/DELETE /api/v1/admin/timeline/[id]", () => {
  it("updates a timeline entry", async () => {
    const entry = await db.timeline.create({
      data: { milestoneTypeId, title: "Old Title", date: new Date("2024-01-01") },
    });
    createdEntryIds.push(entry.id);

    const res = await patchTimeline(
      makeRequest(
        `http://localhost/api/v1/admin/timeline/${entry.id}`,
        "PATCH",
        { milestoneTypeId, title: "New Title", date: "2024-01-01", tags: [] },
        true
      ),
      { params: Promise.resolve({ id: entry.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("New Title");
  });

  it("returns 404 for a nonexistent entry", async () => {
    const res = await patchTimeline(
      makeRequest(
        "http://localhost/api/v1/admin/timeline/does-not-exist",
        "PATCH",
        { milestoneTypeId, title: "X", date: "2024-01-01", tags: [] },
        true
      ),
      { params: Promise.resolve({ id: "does-not-exist" }) }
    );
    expect(res.status).toBe(404);
  });

  it("hard-deletes a timeline entry", async () => {
    const entry = await db.timeline.create({
      data: { milestoneTypeId, title: "To Delete", date: new Date("2024-01-01") },
    });

    const res = await deleteTimeline(
      makeRequest(`http://localhost/api/v1/admin/timeline/${entry.id}`, "DELETE", null, true),
      { params: Promise.resolve({ id: entry.id }) }
    );
    expect(res.status).toBe(204);

    const stillExists = await db.timeline.findUnique({ where: { id: entry.id } });
    expect(stillExists).toBeNull();
  });
});
