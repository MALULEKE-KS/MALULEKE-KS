// tests/integration/admin-settings-api.test.ts
// Hits the real database with a throwaway AdminUser + Flag/VisitorLens/
// lookup-value fixtures.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listFlags } from "@/app/api/v1/admin/settings/flags/route";
import { PATCH as patchFlag } from "@/app/api/v1/admin/settings/flags/[key]/route";
import { GET as listLenses, POST as createLens } from "@/app/api/v1/admin/settings/lenses/route";
import { PATCH as patchLens } from "@/app/api/v1/admin/settings/lenses/[id]/route";
import { GET as listLookups, POST as createLookup } from "@/app/api/v1/lookups/[type]/route";
import { POST as deprecateLookup } from "@/app/api/v1/lookups/[type]/[id]/deprecate/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let flagKey: string;
const createdLensIds: string[] = [];
const createdDomainIds: string[] = [];

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
    data: { email: "test-admin-settings@example.com", passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const flag = await db.flag.findFirstOrThrow();
  flagKey = flag.key;
});

afterAll(async () => {
  if (!adminId) return;
  await db.activityLog.deleteMany({ where: { adminUserId: adminId } });
  await db.visitorLens.deleteMany({ where: { id: { in: createdLensIds } } });
  await db.domain.deleteMany({ where: { id: { in: createdDomainIds } } });
  // Restore the flag this suite toggles back to its original (disabled) state.
  await db.flag.update({ where: { key: flagKey }, data: { enabled: false } });
  await db.adminUser.delete({ where: { id: adminId } });
});

describe("GET/PATCH /api/v1/admin/settings/flags", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listFlags(makeRequest("http://localhost/api/v1/admin/settings/flags", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("toggles a single flag", async () => {
    const res = await patchFlag(
      makeRequest(`http://localhost/api/v1/admin/settings/flags/${flagKey}`, "PATCH", { enabled: true }, true),
      { params: Promise.resolve({ key: flagKey }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).enabled).toBe(true);
  });

  it("returns 404 for an unknown flag key", async () => {
    const res = await patchFlag(
      makeRequest("http://localhost/api/v1/admin/settings/flags/does-not-exist", "PATCH", { enabled: true }, true),
      { params: Promise.resolve({ key: "does-not-exist" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("GET/POST /api/v1/admin/settings/lenses", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await listLenses(makeRequest("http://localhost/api/v1/admin/settings/lenses", "GET", null, false));
    expect(res.status).toBe(401);
  });

  it("creates and updates a visitor lens", async () => {
    const createRes = await createLens(
      makeRequest(
        "http://localhost/api/v1/admin/settings/lenses",
        "POST",
        {
          key: "test-lens",
          label: "Test Lens",
          priorityContent: { systems: ["a", "b"] },
          aiFramingPrompt: "Frame as a test.",
        },
        true
      )
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    createdLensIds.push(created.id);
    expect(created.priorityContent).toEqual({ systems: ["a", "b"] });

    const patchRes = await patchLens(
      makeRequest(
        `http://localhost/api/v1/admin/settings/lenses/${created.id}`,
        "PATCH",
        { key: "test-lens", label: "Updated Label", priorityContent: {}, aiFramingPrompt: "Updated prompt." },
        true
      ),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).label).toBe("Updated Label");
  });
});

describe("POST /api/v1/lookups/{type} and /deprecate", () => {
  it("rejects an unauthenticated create", async () => {
    const res = await createLookup(
      makeRequest("http://localhost/api/v1/lookups/domain", "POST", { key: "x", label: "X" }, false),
      { params: Promise.resolve({ type: "domain" }) }
    );
    expect(res.status).toBe(401);
  });

  it("creates a lookup value and then soft-deprecates it (BR-8.1/8.2)", async () => {
    const createRes = await createLookup(
      makeRequest(
        "http://localhost/api/v1/lookups/domain",
        "POST",
        { key: "test-domain", label: "Test Domain" },
        true
      ),
      { params: Promise.resolve({ type: "domain" }) }
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    createdDomainIds.push(created.id);
    expect(created.active).toBe(true);

    // Unauthenticated GET never sees it once deprecated, and shouldn't see
    // includeInactive honored at all regardless of the query param.
    const publicListBefore = await listLookups(
      new NextRequest("http://localhost/api/v1/lookups/domain?includeInactive=true"),
      { params: Promise.resolve({ type: "domain" }) }
    );
    const beforeBody = await publicListBefore.json();
    expect(beforeBody.some((v: { id: string }) => v.id === created.id)).toBe(true);

    const deprecateRes = await deprecateLookup(
      makeRequest(`http://localhost/api/v1/lookups/domain/${created.id}/deprecate`, "POST", null, true),
      { params: Promise.resolve({ type: "domain", id: created.id }) }
    );
    expect(deprecateRes.status).toBe(200);
    expect((await deprecateRes.json()).active).toBe(false);

    // Default (active-only) public list no longer includes it.
    const publicListAfter = await listLookups(new NextRequest("http://localhost/api/v1/lookups/domain"), {
      params: Promise.resolve({ type: "domain" }),
    });
    const afterBody = await publicListAfter.json();
    expect(afterBody.some((v: { id: string }) => v.id === created.id)).toBe(false);

    // includeInactive=true from an UNAUTHENTICATED caller still doesn't
    // reveal it — the param is admin-only, not trusted on its own.
    const unauthIncludeInactive = await listLookups(
      new NextRequest("http://localhost/api/v1/lookups/domain?includeInactive=true"),
      { params: Promise.resolve({ type: "domain" }) }
    );
    const unauthBody = await unauthIncludeInactive.json();
    expect(unauthBody.some((v: { id: string }) => v.id === created.id)).toBe(false);

    // But an authenticated admin explicitly asking for inactive values still
    // sees it (soft-deprecate, not deleted).
    const adminListAfter = await listLookups(
      makeRequest("http://localhost/api/v1/lookups/domain?includeInactive=true", "GET", null, true),
      { params: Promise.resolve({ type: "domain" }) }
    );
    const adminBody = await adminListAfter.json();
    expect(adminBody.some((v: { id: string; active: boolean }) => v.id === created.id && v.active === false)).toBe(
      true
    );
  });

  it("returns 404 deprecating an unknown lookup type", async () => {
    const res = await deprecateLookup(
      makeRequest("http://localhost/api/v1/lookups/not-a-type/some-id/deprecate", "POST", null, true),
      { params: Promise.resolve({ type: "not-a-type", id: "some-id" }) }
    );
    expect(res.status).toBe(404);
  });
});
