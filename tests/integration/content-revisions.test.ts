// tests/integration/content-revisions.test.ts
// #88 / BR-1.15 — every version of a system's case study and description is
// kept by the database, append-only and attributed; restoring writes an old
// text back as a new version.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { GET as listRevisions } from "@/app/api/v1/admin/systems/[id]/revisions/route";
import { POST as restoreRevision } from "@/app/api/v1/admin/systems/[id]/revisions/[revisionId]/restore/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

const RUN = `rv${Date.now().toString(36)}`;
let adminId: string;
let cookie: string;
let orgId: string;
let statusId: string;

let seq = 0;
async function createSystem() {
  seq += 1;
  return db.system.create({
    data: { name: `${RUN} ${seq}`, slug: `${RUN}-${seq}`, description: "First description.", organizationId: orgId, statusId },
  });
}

function request(url: string, method: string, body?: object) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", cookie: `admin_session=${cookie}` },
    ...(body && { body: JSON.stringify(body) }),
  });
}
const patch = (id: string, body: object) =>
  patchSystem(request(`http://localhost/api/v1/admin/systems/${id}`, "PATCH", body), { params: Promise.resolve({ id }) });
const list = async (id: string, field = "caseStudyBody") =>
  listRevisions(request(`http://localhost/api/v1/admin/systems/${id}/revisions?field=${field}`, "GET"), { params: Promise.resolve({ id }) });
const restore = (id: string, revisionId: string) =>
  restoreRevision(request(`http://localhost/api/v1/admin/systems/${id}/revisions/${revisionId}/restore`, "POST"), {
    params: Promise.resolve({ id, revisionId }),
  });
const revisions = (systemId: string, field: string) =>
  db.systemContentRevision.findMany({ where: { systemId, field }, orderBy: { createdAt: "asc" } });

beforeAll(async () => {
  adminId = (await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } })).id;
  cookie = createSessionCookieValue(adminId, 1);
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
});

// Systems are never deleted (BR-1.9): retire this run's fixtures.
afterAll(async () => {
  await db.system.updateMany({ where: { name: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("the database writes every version (BR-1.15)", () => {
  it("records the first description on create, attributed to the system when no admin acted", async () => {
    const system = await createSystem();
    const [first] = await revisions(system.id, "description");
    expect(first).toMatchObject({ body: "First description.", actorType: "SYSTEM", adminUserId: null, backfilled: false });
    expect(await revisions(system.id, "caseStudyBody")).toEqual([]);
  });

  it("records each admin edit, attributed to the admin; other edits add nothing", async () => {
    const system = await createSystem();
    expect((await patch(system.id, { caseStudyBody: "Draft one." })).status).toBe(200);
    expect((await patch(system.id, { caseStudyBody: "Draft two." })).status).toBe(200);
    expect((await patch(system.id, { sortOrder: 7, name: `${RUN} renamed` })).status).toBe(200);

    const history = await revisions(system.id, "caseStudyBody");
    expect(history.map((r) => r.body)).toEqual(["Draft one.", "Draft two."]);
    expect(history.every((r) => r.actorType === "ADMIN" && r.adminUserId === adminId)).toBe(true);
  });

  it("can't be rewritten or deleted", async () => {
    const system = await createSystem();
    const [first] = await revisions(system.id, "description");
    await expect(db.systemContentRevision.update({ where: { id: first!.id }, data: { body: "rewritten" } })).rejects.toThrow(/append-only/);
    await expect(db.systemContentRevision.delete({ where: { id: first!.id } })).rejects.toThrow(/append-only/);
  });
});

describe("admin: list and restore", () => {
  it("lists newest first, marks the current one, and validates the field", async () => {
    const system = await createSystem();
    await patch(system.id, { description: "Second description." });
    const body = await (await list(system.id, "description")).json();
    expect(body.revisions.map((r: { body: string }) => r.body)).toEqual(["Second description.", "First description."]);
    expect(body.revisions[0].current).toBe(true);
    expect(body.revisions[1].current).toBe(false);

    expect((await list(system.id, "name")).status).toBe(400);
    expect((await list(`${RUN}-missing`, "description")).status).toBe(404);
  });

  it("restores an old version as a new one; restoring the current text adds nothing", async () => {
    const system = await createSystem();
    await patch(system.id, { caseStudyBody: "Version A." });
    await patch(system.id, { caseStudyBody: "Version B." });
    const [a] = await revisions(system.id, "caseStudyBody");

    const res = await restore(system.id, a!.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ field: "caseStudyBody", body: "Version A.", changed: true });
    expect((await db.system.findUniqueOrThrow({ where: { id: system.id } })).caseStudyBody).toBe("Version A.");

    const history = await revisions(system.id, "caseStudyBody");
    expect(history.map((r) => r.body)).toEqual(["Version A.", "Version B.", "Version A."]);
    expect(history.at(-1)).toMatchObject({ actorType: "ADMIN", adminUserId: adminId });

    const again = await restore(system.id, a!.id);
    expect((await again.json()).changed).toBe(false);
    expect(await revisions(system.id, "caseStudyBody")).toHaveLength(3);
  });

  it("refuses a revision that belongs to another system", async () => {
    const one = await createSystem();
    const other = await createSystem();
    const [foreign] = await revisions(other.id, "description");
    expect((await restore(one.id, foreign!.id)).status).toBe(404);
  });
});
