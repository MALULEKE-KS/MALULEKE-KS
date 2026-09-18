// tests/integration/admin-inquiries-api.test.ts
// Hits the real database with a throwaway AdminUser + Inquiry fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listInquiries } from "@/app/api/v1/admin/inquiries/route";
import { PATCH as patchInquiry } from "@/app/api/v1/admin/inquiries/[id]/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let inquiryTypeId: string;
const createdInquiryIds: string[] = [];

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
    data: { email: "test-admin-inquiries@example.com", passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const inquiryType = await db.inquiryType.findFirstOrThrow({ where: { key: "hire" } });
  inquiryTypeId = inquiryType.id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.activityLog.deleteMany({ where: { adminUserId: adminId } });
  await db.inquiry.deleteMany({ where: { id: { in: createdInquiryIds } } });
  await db.adminUser.delete({ where: { id: adminId } });
});

// The database enforces BR-2.1 itself: every inquiry starts NEW and only moves
// along valid transitions. So a fixture in a later state is walked there the
// same way a real inquiry would be, never inserted mid-workflow.
const PATH_TO: Record<"NEW" | "REVIEWED" | "RESPONDED" | "CLOSED", Array<"REVIEWED" | "RESPONDED" | "CLOSED">> = {
  NEW: [],
  REVIEWED: ["REVIEWED"],
  RESPONDED: ["REVIEWED", "RESPONDED"],
  CLOSED: ["REVIEWED", "CLOSED"],
};

async function createFixtureInquiry(overrides: { status?: "NEW" | "REVIEWED" | "RESPONDED" | "CLOSED" } = {}) {
  let inquiry = await db.inquiry.create({
    data: {
      name: "Fixture Visitor",
      email: "visitor@example.com",
      message: "This is a fixture inquiry message, at least twenty characters long.",
      inquiryTypeId,
    },
  });
  createdInquiryIds.push(inquiry.id);
  for (const status of PATH_TO[overrides.status ?? "NEW"]) {
    inquiry = await db.inquiry.update({ where: { id: inquiry.id }, data: { status } });
  }
  return inquiry;
}

describe("GET /api/v1/admin/inquiries", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listInquiries(makeRequest("http://localhost/api/v1/admin/inquiries", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("returns the inbox for an authenticated admin", async () => {
    await createFixtureInquiry();
    const res = await listInquiries(makeRequest("http://localhost/api/v1/admin/inquiries", "GET", null, true));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("filters by status", async () => {
    const closed = await createFixtureInquiry({ status: "CLOSED" });
    const res = await listInquiries(
      makeRequest("http://localhost/api/v1/admin/inquiries?status=closed", "GET", null, true)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((i: { status: string }) => i.status === "closed")).toBe(true);
    expect(body.data.some((i: { id: string }) => i.id === closed.id)).toBe(true);
  });
});

describe("PATCH /api/v1/admin/inquiries/[id]", () => {
  it("rejects an unauthenticated request", async () => {
    const inquiry = await createFixtureInquiry();
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "reviewed" }, false),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(401);
  });

  it("allows new -> reviewed (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry();
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "reviewed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("reviewed");
  });

  it("blocks new -> responded, a skip-ahead transition (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry();
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "responded" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("blocks new -> closed, a skip-ahead transition (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry();
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "closed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("allows reviewed -> responded (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry({ status: "REVIEWED" });
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "responded" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(200);
  });

  it("allows reviewed -> closed directly, without a fake responded step (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry({ status: "REVIEWED" });
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "closed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(200);
  });

  it("allows responded -> closed (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry({ status: "RESPONDED" });
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "closed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(200);
  });

  it("blocks any transition out of closed — a terminal state (BR-2.1)", async () => {
    const inquiry = await createFixtureInquiry({ status: "CLOSED" });
    const res = await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "reviewed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    expect(res.status).toBe(409);
  });

  it("returns 404 for a nonexistent inquiry", async () => {
    const res = await patchInquiry(
      makeRequest("http://localhost/api/v1/admin/inquiries/does-not-exist", "PATCH", { status: "reviewed" }, true),
      { params: Promise.resolve({ id: "does-not-exist" }) }
    );
    expect(res.status).toBe(404);
  });

  it("writes an ActivityLog entry for every successful transition (BR-3.4)", async () => {
    const inquiry = await createFixtureInquiry();
    await patchInquiry(
      makeRequest(`http://localhost/api/v1/admin/inquiries/${inquiry.id}`, "PATCH", { status: "reviewed" }, true),
      { params: Promise.resolve({ id: inquiry.id }) }
    );
    const log = await db.activityLog.findFirst({
      where: { adminUserId: adminId, entityType: "Inquiry", entityId: inquiry.id },
    });
    expect(log).not.toBeNull();
    expect(log?.action).toBe("inquiry.status_update");
  });
});
