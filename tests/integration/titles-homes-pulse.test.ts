// tests/integration/titles-homes-pulse.test.ts
// F5c: the owner's titles and qualifications as data (D13), the GitHub homes
// (D12) and the platform pulse (§3.2) — through the real routes and views.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProfile } from "@/app/api/v1/profile/route";
import { GET as getHomes } from "@/app/api/v1/homes/route";
import { GET as getPulse } from "@/app/api/v1/platform/pulse/route";
import { GET as listTitles, POST as createTitle } from "@/app/api/v1/admin/profile/titles/route";
import { DELETE as deleteTitle, PATCH as patchTitle } from "@/app/api/v1/admin/profile/titles/[id]/route";
import { POST as createOrganization } from "@/app/api/v1/admin/organizations/route";
import { db } from "@/lib/db";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const RUN = `th${Date.now().toString(36)}`;
let cookie: string;
const createdTitleIds: string[] = [];

function req(url: string, method: string, body?: unknown, session: string | null = cookie) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(session ? { cookie: `${SESSION_COOKIE_NAME}=${session}` } : {}) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  const admin = await db.adminUser.create({ data: { email: `test-titles-${RUN}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, admin.sessionVersion);
});

afterAll(async () => {
  await db.profileTitle.deleteMany({ where: { id: { in: createdTitleIds } } });
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("titles and qualifications (D13)", () => {
  it("the profile carries the owner's current titles, in order", async () => {
    const body = await (await getProfile()).json();
    const labels = body.titles.map((t: { label: string }) => t.label);
    expect(labels).toEqual(expect.arrayContaining(["Software & AI Engineer", "Final-year BSc Computer Science & Mathematics student"]));
    expect(labels.indexOf("Software & AI Engineer")).toBeLessThan(labels.indexOf("Final-year BSc Computer Science & Mathematics student"));
  });

  it("a new title of any kind appears with no code change; an ended one leaves the site but stays on record", async () => {
    const created = await createTitle(req("/api/v1/admin/profile/titles", "POST", { kind: "role", label: `${RUN} Security Engineer`, sortOrder: 9 }));
    expect(created.status).toBe(201);
    const title = await created.json();
    createdTitleIds.push(title.id);
    expect(title.current).toBe(true);
    let labels = (await (await getProfile()).json()).titles.map((t: { label: string }) => t.label);
    expect(labels).toContain(`${RUN} Security Engineer`);

    const ended = await patchTitle(
      req(`/api/v1/admin/profile/titles/${title.id}`, "PATCH", { kind: "role", label: `${RUN} Security Engineer`, sortOrder: 9, startsOn: "2020-01-01", endsOn: "2021-01-01" }),
      params(title.id),
    );
    expect((await ended.json()).current).toBe(false);
    labels = (await (await getProfile()).json()).titles.map((t: { label: string }) => t.label);
    expect(labels).not.toContain(`${RUN} Security Engineer`);
    const all = (await (await listTitles(req("/api/v1/admin/profile/titles", "GET"))).json()).data;
    expect(all.map((t: { id: string }) => t.id)).toContain(title.id);
  });

  it("refuses an unknown kind, reversed dates, and a request without a session", async () => {
    expect((await createTitle(req("/api/v1/admin/profile/titles", "POST", { kind: "nope", label: "X" }))).status).toBe(400);
    expect((await createTitle(req("/api/v1/admin/profile/titles", "POST", { kind: "role", label: "X", startsOn: "2025-01-02", endsOn: "2025-01-01" }))).status).toBe(400);
    expect((await createTitle(req("/api/v1/admin/profile/titles", "POST", { kind: "role", label: "X" }, null))).status).toBe(401);
    await expect(db.profileTitle.create({ data: { kindId: (await db.titleKind.findFirstOrThrow()).id, label: "  " } })).rejects.toThrow(/ProfileTitle_label_present/);
  });

  it("deletes a title", async () => {
    const title = await (await createTitle(req("/api/v1/admin/profile/titles", "POST", { kind: "role", label: `${RUN} Temp` }))).json();
    expect((await deleteTitle(req(`/api/v1/admin/profile/titles/${title.id}`, "DELETE"), params(title.id))).status).toBe(204);
    expect(await db.profileTitle.findUnique({ where: { id: title.id } })).toBeNull();
  });
});

describe("GitHub homes (D12)", () => {
  it("lists the owner's account first, then the ventures, each with its GitHub accounts", async () => {
    const { data } = await (await getHomes()).json();
    const slugs = data.map((h: { slug: string }) => h.slug);
    expect(slugs.slice(0, 1)).toEqual(["personal"]);
    expect(slugs).toEqual(expect.arrayContaining(["ksdrill-sa", "growthcore-solutions"]));
    const ksdrill = data.find((h: { slug: string }) => h.slug === "ksdrill-sa");
    expect(ksdrill.github).toEqual([{ login: "KSDRILL-SA", url: "https://github.com/KSDRILL-SA" }]);
  });

  it("counts only live, nameable systems — a draft adds nothing, publishing adds one", async () => {
    const count = async () => (await (await getHomes()).json()).data.find((h: { slug: string }) => h.slug === "ksdrill-sa").publishedSystems as number;
    const before = await count();
    const org = await db.organization.findUniqueOrThrow({ where: { slug: "ksdrill-sa" } });
    const status = await db.status.findUniqueOrThrow({ where: { key: "finished" } });
    const system = await db.system.create({
      data: { name: `${RUN} Draft`, slug: `${RUN}-draft`, organizationId: org.id, statusId: status.id, description: "Fixture", contentStatus: "DRAFT" },
    });
    expect(await count()).toBe(before);
    await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } });
    expect(await count()).toBe(before + 1);
  });

  it("an organisation's kind is a lookup key; an unknown one is refused", async () => {
    const bad = await createOrganization(req("/api/v1/admin/organizations", "POST", { name: `${RUN} Org`, slug: `${RUN}-org`, kind: "nope" }));
    expect(bad.status).toBe(400);
    const good = await createOrganization(req("/api/v1/admin/organizations", "POST", { name: `${RUN} Org`, slug: `${RUN}-org`, kind: "venture" }));
    expect(good.status).toBe(201);
    expect((await good.json()).kind).toBe("venture");
  });
});

describe("home ledger counts only curated systems (F5c)", () => {
  it("a sync-imported system waiting for curation is left out of the counts", async () => {
    const org = await db.organization.findUniqueOrThrow({ where: { slug: "personal" } });
    const status = await db.status.findUniqueOrThrow({ where: { key: "planned" } });
    await db.system.create({
      data: { name: `${RUN} Imported`, slug: `${RUN}-imported`, organizationId: org.id, statusId: status.id, description: "Fixture", needsCuration: true },
    });
    // One statement, so systems other test files add in parallel can't skew the comparison.
    const [row] = await db.$queryRaw<{ ledger: number; curated: number; all: number }[]>`
      SELECT (SELECT "systemsQueued" FROM "PublicLedger") AS ledger,
             (SELECT count(*)::int FROM "System" s JOIN "Status" st ON st.id = s."statusId"
               WHERE st.stage = 'QUEUED' AND s."contentStatus" <> 'ARCHIVED' AND NOT s."needsCuration") AS curated,
             (SELECT count(*)::int FROM "System" s JOIN "Status" st ON st.id = s."statusId"
               WHERE st.stage = 'QUEUED' AND s."contentStatus" <> 'ARCHIVED') AS "all"`;
    expect(row!.ledger).toBe(row!.curated);
    expect(row!.all).toBeGreaterThan(row!.ledger);
  });
});

describe("platform pulse (§3.2)", () => {
  it("reports aggregates from the database itself", async () => {
    const pulse = await (await getPulse()).json();
    // Every BR-x.y named in the database's own constraints, triggers and functions.
    expect(pulse.rulesEnforcedByDatabase).toBeGreaterThanOrEqual(10);
    expect(pulse.auditEventsTotal).toBeGreaterThanOrEqual(pulse.auditEventsLast7Days);
    expect(pulse).toHaveProperty("lastSuccessfulJobAt");
    expect(pulse).toHaveProperty("lastGithubSyncAt");
    expect(Object.keys(pulse).sort()).toEqual(
      ["auditEventsLast7Days", "auditEventsTotal", "deployment", "lastGithubSyncAt", "lastSuccessfulJobAt", "rulesEnforcedByDatabase"],
    );
  });
});
