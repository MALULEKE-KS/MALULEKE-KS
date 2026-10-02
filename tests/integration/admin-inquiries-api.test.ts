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
    data: { email: `test-admin-inquiries-${Date.now().toString(36)}@example.com`, passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId, 1);

  const inquiryType = await db.inquiryType.findFirstOrThrow({ where: { key: "general" } });
  inquiryTypeId = inquiryType.id;
});

afterAll(async () => {
  // No audit/admin cleanup: ActivityLog is append-only (F1.3) and an admin it
  // references can't be deleted. The test database is disposable, and each
  // run uses its own admin email, so leftovers never collide.
  if (!adminId) return;
  await db.inquiry.deleteMany({ where: { id: { in: createdInquiryIds } } });
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

  it("surfaces only NEW inquiries past the configured review deadline (BR-2.2)", async () => {
    const overdue = await createFixtureInquiry();
    const current = await createFixtureInquiry();
    await db.inquiry.update({
      where: { id: overdue.id },
      data: { createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    const res = await listInquiries(
      makeRequest("http://localhost/api/v1/admin/inquiries?overdue=true", "GET", null, true)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.some((i: { id: string; overdue: boolean }) => i.id === overdue.id && i.overdue)).toBe(true);
    expect(body.data.some((i: { id: string }) => i.id === current.id)).toBe(false);
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

  it("a closed inquiry can only be reopened for review (LT-6)", async () => {
    const inquiry = await createFixtureInquiry({ status: "CLOSED" });
    const url = `http://localhost/api/v1/admin/inquiries/${inquiry.id}`;
    expect((await patchInquiry(makeRequest(url, "PATCH", { status: "accepted" }, true), { params: Promise.resolve({ id: inquiry.id }) })).status).toBe(409);
    expect((await patchInquiry(makeRequest(url, "PATCH", { status: "reviewed" }, true), { params: Promise.resolve({ id: inquiry.id }) })).status).toBe(200);
  });

  it("refuses a change made from a stale screen (LT-6)", async () => {
    const inquiry = await createFixtureInquiry();
    const url = `http://localhost/api/v1/admin/inquiries/${inquiry.id}`;
    const ok = await patchInquiry(makeRequest(url, "PATCH", { status: "reviewed", expectedVersion: 0 }, true), { params: Promise.resolve({ id: inquiry.id }) });
    expect(ok.status).toBe(200);
    const stale = await patchInquiry(makeRequest(url, "PATCH", { status: "declined", expectedVersion: 0 }, true), { params: Promise.resolve({ id: inquiry.id }) });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("STALE");
  });

  it("keeps the private reason apart from what the applicant is told (LT-7)", async () => {
    const inquiry = await createFixtureInquiry({ status: "REVIEWED" });
    const url = `http://localhost/api/v1/admin/inquiries/${inquiry.id}`;
    const res = await patchInquiry(
      makeRequest(url, "PATCH", { status: "declined", internalReason: "Budget far too low", applicantMessage: "Thank you — it isn't a fit right now." }, true),
      { params: Promise.resolve({ id: inquiry.id }) },
    );
    expect(res.status).toBe(200);
    const messages = await db.inquiryMessage.findMany({ where: { inquiryId: inquiry.id } });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.kind).toBe("decline");
    expect(messages[0]!.body).not.toContain("Budget");
    const change = await db.inquiryStatusChange.findFirstOrThrow({ where: { inquiryId: inquiry.id, toStatus: "DECLINED" } });
    expect(change.internalReason).toBe("Budget far too low");
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
    // Logged by the database (F2.1): only the changed column, never the PII.
    expect(log?.action).toBe("inquiry.update");
    expect(log?.before).toEqual({ status: "NEW" });
    expect(log?.after).toEqual({ status: "REVIEWED" });
  });
});
