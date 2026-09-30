// tests/integration/scheduled-publishing.test.ts
// #86 / BR-1.13 — scheduled publishing, proven against the database itself:
// content with a future publishAt is invisible everywhere the public reads
// (views, search, derived views), appears once its time has passed, and every
// publish gate is checked when the schedule is set, not when it fires.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { PATCH as patchExperience } from "@/app/api/v1/admin/cv/experience/[id]/route";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";
import { searchPublic } from "@/lib/queries/search";
import { getSkillEvidence } from "@/lib/queries/evidence";

const RUN = `sp${Date.now().toString(36)}`;
const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + 24 * HOUR);
const past = () => new Date(Date.now() - HOUR);

let adminId: string;
let cookie: string;
let orgId: string;
let clientOrgId: string;
let statusId: string;
let milestoneTypeId: string;

let seq = 0;
async function createSystem(orgId_ = orgId) {
  seq += 1;
  return db.system.create({
    data: {
      name: `${RUN} Scheduled ${seq}`,
      slug: `${RUN}-scheduled-${seq}`,
      description: `Scheduled publishing fixture ${seq}.`,
      organizationId: orgId_,
      statusId,
    },
  });
}

function request(url: string, body: object) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: `admin_session=${cookie}` },
    body: JSON.stringify(body),
  });
}

const isPublic = async (id: string) => (await db.publicSystem.findUnique({ where: { id } })) !== null;

beforeAll(async () => {
  adminId = (await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } })).id;
  cookie = createSessionCookieValue(adminId, 1);
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  clientOrgId = (await db.organization.create({ data: { name: `${RUN} Client`, slug: `${RUN}-client`, isClient: true } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
  milestoneTypeId = (await db.milestoneType.findFirstOrThrow()).id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("the public views honour the schedule", () => {
  it("hides a system until its time, then shows it — no job runs in between", async () => {
    const system = await createSystem();
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", publishAt: future() } });
    expect(await isPublic(system.id)).toBe(false);

    await db.system.update({ where: { id: system.id }, data: { publishAt: past() } });
    expect(await isPublic(system.id)).toBe(true);
  });

  it("a scheduled system hides its journey entries, and a scheduled entry hides itself", async () => {
    const system = await createSystem();
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", publishAt: future() } });
    const onSystem = await db.timeline.create({
      data: { milestoneTypeId, title: `${RUN} entry on system`, date: new Date(), contentStatus: "PUBLISHED", systemId: system.id },
    });
    const scheduled = await db.timeline.create({
      data: { milestoneTypeId, title: `${RUN} scheduled entry`, date: new Date(), contentStatus: "PUBLISHED", publishAt: future() },
    });
    const visible = await db.publicTimeline.findMany({ where: { id: { in: [onSystem.id, scheduled.id] } } });
    expect(visible).toEqual([]);
  });

  it("search never finds scheduled work", async () => {
    const system = await createSystem();
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", publishAt: future() } });
    const results = await searchPublic(`${RUN} Scheduled`);
    expect(results.map((r) => r.key)).not.toContain(system.slug);
  });

  it("a scheduled role doesn't count as skill evidence yet", async () => {
    const category = await db.skillCategory.findFirstOrThrow();
    const skill = await db.skill.create({ data: { name: `${RUN}-skill`, categoryId: category.id } });
    await db.experience.create({
      data: {
        title: `${RUN} future role`,
        organization: "Future Org",
        startDate: new Date("2026-01-01"),
        description: "Scheduled role.",
        contentStatus: "PUBLISHED",
        publishAt: future(),
        skills: { create: { skillId: skill.id } },
      },
    });
    const evidence = (await getSkillEvidence()).find((e) => e.skillId === skill.id)!;
    expect(evidence.roleCount).toBe(0);
    expect(await db.publicExperience.count({ where: { title: `${RUN} future role` } })).toBe(0);
  });
});

describe("the database keeps a schedule meaningful (BR-1.13)", () => {
  it("refuses a publish time on unpublished content", async () => {
    const system = await createSystem();
    await expect(db.system.update({ where: { id: system.id }, data: { publishAt: future() } })).rejects.toThrow(/BR-1\.13/);
  });

  it("drops the schedule when content stops being published", async () => {
    const system = await createSystem();
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", publishAt: future() } });
    const archived = await db.system.update({ where: { id: system.id }, data: { contentStatus: "ARCHIVED" } });
    expect(archived.publishAt).toBeNull();
  });

  it("checks the publish gates when scheduling, not when the time comes (BR-1.1)", async () => {
    const system = await createSystem(clientOrgId); // BR-1.2: a client's system starts REQUIRES_APPROVAL
    await expect(
      db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", publishAt: future() } }),
    ).rejects.toThrow();
  });
});

describe("admin API", () => {
  it("schedules a system and returns the time; the public doesn't see it", async () => {
    const system = await createSystem();
    const at = future().toISOString();
    const res = await patchSystem(request(`http://localhost/api/v1/admin/systems/${system.id}`, { contentStatus: "published", publishAt: at }), {
      params: Promise.resolve({ id: system.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).publishAt).toBe(at);
    expect(await isPublic(system.id)).toBe(false);
  });

  it("answers a publish time on a draft with a 400 in the rule's words", async () => {
    const system = await createSystem();
    const res = await patchSystem(request(`http://localhost/api/v1/admin/systems/${system.id}`, { publishAt: future().toISOString() }), {
      params: Promise.resolve({ id: system.id }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/^BR-1\.13:/);
  });

  it("works the same for other content types (experience)", async () => {
    const role = await db.experience.create({
      data: { title: `${RUN} role`, organization: "Org", startDate: new Date("2025-01-01"), description: "Role.", contentStatus: "DRAFT" },
    });
    const body = { title: role.title, organization: "Org", startDate: "2025-01-01", description: "Role.", contentStatus: "draft", publishAt: future().toISOString() };
    const refused = await patchExperience(request(`http://localhost/api/v1/admin/cv/experience/${role.id}`, body), {
      params: Promise.resolve({ id: role.id }),
    });
    expect(refused.status).toBe(400);

    const scheduled = await patchExperience(
      request(`http://localhost/api/v1/admin/cv/experience/${role.id}`, { ...body, contentStatus: "published" }),
      { params: Promise.resolve({ id: role.id }) },
    );
    expect(scheduled.status).toBe(200);
    expect((await scheduled.json()).publishAt).toBe(body.publishAt);
  });
});
