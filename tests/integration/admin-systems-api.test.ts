// tests/integration/admin-systems-api.test.ts
// Hits the real database with a throwaway AdminUser + System fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listSystems, POST as createSystem } from "@/app/api/v1/admin/systems/route";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let clientOrgId: string;
let publicOrgId: string;
let statusId: string;
const createdSystemIds: string[] = [];

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
    data: { email: "test-admin-systems@example.com", passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const clientOrg = await db.organization.create({
    data: { name: "Test Client Org", slug: "test-client-org-fixture", isClient: true },
  });
  clientOrgId = clientOrg.id;

  const publicOrg = await db.organization.create({
    data: { name: "Test Public Org", slug: "test-public-org-fixture", isClient: false },
  });
  publicOrgId = publicOrg.id;

  const status = await db.status.findFirstOrThrow({ where: { key: "planned" } });
  statusId = status.id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.activityLog.deleteMany({ where: { adminUserId: adminId } });
  await db.system.deleteMany({ where: { id: { in: createdSystemIds } } });
  await db.organization.deleteMany({ where: { id: { in: [clientOrgId, publicOrgId] } } });
  await db.adminUser.delete({ where: { id: adminId } });
});

describe("GET/POST /api/v1/admin/systems", () => {
  it("GET returns the full list (proxy.ts, not the route itself, is the real session gate)", async () => {
    const res = await listSystems(makeRequest("http://localhost/api/v1/admin/systems", "GET", null, false));
    expect(res.status).toBe(200);
  });

  it("POST rejects an unauthenticated request", async () => {
    const res = await createSystem(
      makeRequest("http://localhost/api/v1/admin/systems", "POST", {
        name: "Should Not Be Created",
        slug: "should-not-be-created",
        organizationId: publicOrgId,
        statusId,
        description: "Fixture.",
      }, false)
    );
    expect(res.status).toBe(401);
  });

  it("applies the BR-1.2 default for a client organization regardless of request body", async () => {
    const res = await createSystem(
      makeRequest("http://localhost/api/v1/admin/systems", "POST", {
        name: "Client Fixture System",
        slug: "client-fixture-system",
        organizationId: clientOrgId,
        statusId,
        description: "A fixture system for a client org.",
        clientVisibility: "PUBLIC", // deliberately wrong — the org is a client
      }, true)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    createdSystemIds.push(body.id);
    expect(body.clientVisibility).toBe("REQUIRES_APPROVAL");
  });
});

describe("PATCH /api/v1/admin/systems/[id]", () => {
  it("blocks publishing when clientVisibility != PUBLIC and clientApproved is false (BR-1.1)", async () => {
    const system = await db.system.create({
      data: {
        name: "Blocked Publish Fixture",
        slug: "blocked-publish-fixture",
        organizationId: clientOrgId,
        statusId,
        description: "Fixture.",
        clientVisibility: "REQUIRES_APPROVAL",
        clientApproved: false,
      },
    });
    createdSystemIds.push(system.id);

    const res = await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { contentStatus: "published" }, true),
      { params: Promise.resolve({ id: system.id }) }
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CLIENT_APPROVAL_REQUIRED");
  });

  it("allows publishing when clientApproved=true is set in the SAME request (BR-1.10)", async () => {
    const system = await db.system.create({
      data: {
        name: "Combined Approve Publish Fixture",
        slug: "combined-approve-publish-fixture",
        organizationId: clientOrgId,
        statusId,
        description: "Fixture.",
        clientVisibility: "REQUIRES_APPROVAL",
        clientApproved: false,
      },
    });
    createdSystemIds.push(system.id);

    const res = await patchSystem(
      makeRequest(
        `http://localhost/api/v1/admin/systems/${system.id}`,
        "PATCH",
        { contentStatus: "published", clientApproved: true },
        true
      ),
      { params: Promise.resolve({ id: system.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contentStatus).toBe("PUBLISHED");
    expect(body.clientApproved).toBe(true);
  });

  it("allows publishing directly for a PUBLIC-visibility system with no approval needed", async () => {
    const system = await db.system.create({
      data: {
        name: "Public System Fixture",
        slug: "public-system-fixture",
        organizationId: publicOrgId,
        statusId,
        description: "Fixture.",
        clientVisibility: "PUBLIC",
      },
    });
    createdSystemIds.push(system.id);

    const res = await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { contentStatus: "published" }, true),
      { params: Promise.resolve({ id: system.id }) }
    );
    expect(res.status).toBe(200);
  });

  it("clears needsCuration on any successful save (BR-1.8)", async () => {
    const system = await db.system.create({
      data: {
        name: "Needs Curation Fixture",
        slug: "needs-curation-fixture",
        organizationId: publicOrgId,
        statusId,
        description: "Fixture.",
        needsCuration: true,
      },
    });
    createdSystemIds.push(system.id);

    const res = await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { sortOrder: 5 }, true),
      { params: Promise.resolve({ id: system.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).needsCuration).toBe(false);
  });

  it("rejects an unauthenticated request", async () => {
    const system = await db.system.create({
      data: {
        name: "Unauth Fixture",
        slug: "unauth-fixture",
        organizationId: publicOrgId,
        statusId,
        description: "Fixture.",
      },
    });
    createdSystemIds.push(system.id);

    const res = await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { sortOrder: 1 }, false),
      { params: Promise.resolve({ id: system.id }) }
    );
    expect(res.status).toBe(401);
  });

  it("writes an ActivityLog entry for every successful update (BR-3.4)", async () => {
    const system = await db.system.create({
      data: {
        name: "Activity Log Fixture",
        slug: "activity-log-fixture",
        organizationId: publicOrgId,
        statusId,
        description: "Fixture.",
      },
    });
    createdSystemIds.push(system.id);

    await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { sortOrder: 9 }, true),
      { params: Promise.resolve({ id: system.id }) }
    );

    const log = await db.activityLog.findFirst({
      where: { adminUserId: adminId, entityType: "System", entityId: system.id },
    });
    expect(log).not.toBeNull();
    expect(log?.action).toBe("system.update");
  });
});
