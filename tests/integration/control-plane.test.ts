// tests/integration/control-plane.test.ts
// F1.6a (#52, #67): pipeline stages on statuses, admin homepage curation,
// admin-tunable platform settings, and the BR-8.3 lookup answers. Hits the
// real database with a throwaway AdminUser + per-run fixtures.
//
// Other test files only ever put systems in the seeded "planned" (QUEUED)
// status, so this file's SHIPPED/BUILDING deltas are exact even while test
// files run in parallel.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as createLookup } from "@/app/api/v1/lookups/[type]/route";
import { PATCH as patchLookup } from "@/app/api/v1/lookups/[type]/[id]/route";
import { POST as deprecateLookup } from "@/app/api/v1/lookups/[type]/[id]/deprecate/route";
import { GET as listPlatformSettings } from "@/app/api/v1/admin/settings/platform/route";
import { PATCH as patchPlatformSetting } from "@/app/api/v1/admin/settings/platform/[key]/route";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { getHomepageStats, getPrioritySystems } from "@/lib/queries/homepage";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings/registry";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

let adminId: string;
let sessionCookie: string;
let orgId: string;
const createdSystemIds: string[] = [];
// Lookup keys, system slugs and admin emails are unique per run: systems are
// never hard-deleted (BR-1.9) and audited rows are append-only.
const RUN = Date.now().toString(36);

function makeRequest(url: string, method: string, body: object | null, withCookie = true): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(withCookie ? { cookie: `admin_session=${sessionCookie}` } : {}),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

async function createStatus(key: string, stage: string) {
  const res = await createLookup(
    makeRequest("http://localhost/api/v1/lookups/status", "POST", { key, label: `Test ${key}`, stage }),
    { params: Promise.resolve({ type: "status" }) },
  );
  return { res, body: await res.json() };
}

async function createSystem(name: string, statusId: string, extra: object = {}) {
  const system = await db.system.create({
    data: {
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${RUN}`,
      description: "Control-plane test fixture.",
      techStack: [],
      organizationId: orgId,
      statusId,
      ...extra,
    },
  });
  createdSystemIds.push(system.id);
  return system;
}

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: `test-control-plane-${RUN}@example.com`, passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  sessionCookie = createSessionCookieValue(adminId);

  const org = await db.organization.create({
    data: { name: "Control Plane Org", slug: `control-plane-org-${RUN}`, isClient: false },
  });
  orgId = org.id;
});

afterAll(async () => {
  if (!adminId) return;
  // Retire, don't delete (BR-1.9); fixture statuses and org stay referenced.
  await db.system.updateMany({
    where: { id: { in: createdSystemIds } },
    data: { contentStatus: "ARCHIVED", featuredOnHome: false },
  });
  await db.platformSetting.deleteMany({ where: { key: "data.retentionMonths" } });
});

describe("status lookups carry a pipeline stage (#52)", () => {
  it("creates a status with a stage and colour, exposed on the wire in lowercase", async () => {
    const { res, body } = await createStatus(`live_${RUN}`, "shipped");
    expect(res.status).toBe(201);
    expect(body.stage).toBe("shipped");
    expect(body.colorToken).toBe("signal-planned");
  });

  it("rejects a colour outside the curated palette", async () => {
    const res = await createLookup(
      makeRequest("http://localhost/api/v1/lookups/status", "POST", {
        key: `bad_colour_${RUN}`,
        label: "Bad colour",
        colorToken: "hot-pink",
      }),
      { params: Promise.resolve({ type: "status" }) },
    );
    expect(res.status).toBe(400);
  });

  it("refuses stage on a non-status lookup", async () => {
    const domain = await db.domain.findFirstOrThrow();
    const res = await patchLookup(
      makeRequest(`http://localhost/api/v1/lookups/domain/${domain.id}`, "PATCH", { stage: "shipped" }),
      { params: Promise.resolve({ type: "domain", id: domain.id }) },
    );
    expect(res.status).toBe(400);
  });

  it("moves systems between the homepage counts when a status changes stage, and excludes archived ones", async () => {
    const { body: status } = await createStatus(`refinishing_${RUN}`, "building");
    const before = await getHomepageStats();

    const a = await createSystem(`Stage A ${RUN}`, status.id);
    await createSystem(`Stage B ${RUN}`, status.id);
    const afterCreate = await getHomepageStats();
    expect(afterCreate.systemsBuilding).toBe(before.systemsBuilding + 2);
    expect(afterCreate.systemsShipped).toBe(before.systemsShipped);

    const res = await patchLookup(
      makeRequest(`http://localhost/api/v1/lookups/status/${status.id}`, "PATCH", { stage: "shipped" }),
      { params: Promise.resolve({ type: "status", id: status.id }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).stage).toBe("shipped");

    const afterMove = await getHomepageStats();
    expect(afterMove.systemsBuilding).toBe(before.systemsBuilding);
    expect(afterMove.systemsShipped).toBe(before.systemsShipped + 2);

    await db.system.update({ where: { id: a.id }, data: { contentStatus: "ARCHIVED" } });
    expect((await getHomepageStats()).systemsShipped).toBe(before.systemsShipped + 1);

    const audit = await db.activityLog.findFirst({
      where: { action: "lookup.update", entityId: status.id },
    });
    expect(audit).not.toBeNull();
  });
});

describe("BR-8.3 — re-creating an existing key answers with an action", () => {
  it("409 LOOKUP_KEY_EXISTS for an active key", async () => {
    const key = `dup_${RUN}`;
    await createStatus(key, "queued");
    const { res, body } = await createStatus(key, "queued");
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("LOOKUP_KEY_EXISTS");
    expect(body.error.details.existingId).toBeTruthy();
  });

  it("409 LOOKUP_KEY_DEPRECATED for a deprecated key", async () => {
    const key = `retired_${RUN}`;
    const { body: created } = await createStatus(key, "queued");
    await deprecateLookup(
      makeRequest(`http://localhost/api/v1/lookups/status/${created.id}/deprecate`, "POST", null),
      { params: Promise.resolve({ type: "status", id: created.id }) },
    );
    const { res, body } = await createStatus(key, "queued");
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("LOOKUP_KEY_DEPRECATED");
    expect(body.error.details.existingId).toBe(created.id);
  });
});

describe("homepage curation (#52)", () => {
  it("features only published systems the admin marked, in homeOrder", async () => {
    const status = await db.status.findUniqueOrThrow({ where: { key: "planned" } });
    const second = await createSystem(`Curated Second ${RUN}`, status.id, { contentStatus: "PUBLISHED" });
    const first = await createSystem(`Curated First ${RUN}`, status.id, { contentStatus: "PUBLISHED" });
    const draft = await createSystem(`Curated Draft ${RUN}`, status.id);

    for (const [system, homeOrder] of [
      [second, 2],
      [first, 1],
      [draft, 0],
    ] as const) {
      const res = await patchSystem(
        makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", {
          featuredOnHome: true,
          homeOrder,
        }),
        { params: Promise.resolve({ id: system.id }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.featuredOnHome).toBe(true);
      expect(body.homeOrder).toBe(homeOrder);
    }

    const featured = await getPrioritySystems(4);
    const slugs = featured.map((s) => s.slug);
    // BR-1.1 — featuring a draft never publishes it.
    expect(slugs).not.toContain(draft.slug);
    expect(slugs.indexOf(first.slug)).toBeGreaterThanOrEqual(0);
    expect(slugs.indexOf(first.slug)).toBeLessThan(slugs.indexOf(second.slug));
  });

  it("rejects a negative homeOrder", async () => {
    const status = await db.status.findUniqueOrThrow({ where: { key: "planned" } });
    const system = await createSystem(`Curated Negative ${RUN}`, status.id);
    const res = await patchSystem(
      makeRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { homeOrder: -1 }),
      { params: Promise.resolve({ id: system.id }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("platform settings (#67)", () => {
  it("lists every registered setting with its effective value", async () => {
    const res = await listPlatformSettings(makeRequest("http://localhost/api/v1/admin/settings/platform", "GET", null));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((s: { key: string }) => s.key).sort()).toEqual([...SETTING_KEYS].sort());
  });

  it("rejects an unauthenticated change", async () => {
    const res = await patchPlatformSetting(
      makeRequest("http://localhost/api/v1/admin/settings/platform/data.retentionMonths", "PATCH", { value: 12 }, false),
      { params: Promise.resolve({ key: "data.retentionMonths" }) },
    );
    expect(res.status).toBe(401);
  });

  it("404s an unknown key and 400s a value outside its bounds", async () => {
    const unknown = await patchPlatformSetting(
      makeRequest("http://localhost/api/v1/admin/settings/platform/not.aSetting", "PATCH", { value: 1 }),
      { params: Promise.resolve({ key: "not.aSetting" }) },
    );
    expect(unknown.status).toBe(404);

    const outOfBounds = await patchPlatformSetting(
      makeRequest("http://localhost/api/v1/admin/settings/platform/inquiry.rateLimit.maxPerWindow", "PATCH", {
        value: 0,
      }),
      { params: Promise.resolve({ key: "inquiry.rateLimit.maxPerWindow" }) },
    );
    expect(outOfBounds.status).toBe(400);
  });

  it("stores a valid change, audits it, and the platform reads it", async () => {
    const res = await patchPlatformSetting(
      makeRequest("http://localhost/api/v1/admin/settings/platform/data.retentionMonths", "PATCH", { value: 18 }),
      { params: Promise.resolve({ key: "data.retentionMonths" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.value).toBe(18);
    expect(body.isDefault).toBe(false);
    expect(await getSetting("data.retentionMonths")).toBe(18);

    const audit = await db.activityLog.findFirst({
      where: { action: "setting.update", entityId: "data.retentionMonths", adminUserId: adminId },
    });
    expect(audit).not.toBeNull();
  });

  it("falls back to the default when a stored value is invalid", async () => {
    await db.platformSetting.upsert({
      where: { key: "data.retentionMonths" },
      create: { key: "data.retentionMonths", value: "banana" },
      update: { value: "banana" },
    });
    expect(await getSetting("data.retentionMonths")).toBe(24);
  });

  it("the database rejects a malformed setting key", async () => {
    await expect(db.platformSetting.create({ data: { key: "Not A Key", value: 1 } })).rejects.toThrow();
  });
});
