// tests/integration/audit-trail.test.ts
// F2.1 (#80): the database writes the audit trail. Proves three things:
//   1. coverage — every table is audited, or deliberately exempt (so a new
//      table can't silently escape the log);
//   2. structure — every admin route goes through withAdmin, and no manual
//      data-mutation logging remains to double up or drift;
//   3. behaviour — attribution (ADMIN / ANONYMOUS / SYSTEM), changed columns
//      only, housekeeping skipped, secrets and PII never copied, cascaded
//      changes attributed to whoever caused them.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import { GET as listFlags } from "@/app/api/v1/admin/settings/flags/route";
import { POST as postInquiry } from "@/app/api/v1/inquiries/route";
import { withActor } from "@/lib/audit";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";

const RUN = `au${Date.now().toString(36)}`;

// Tables deliberately not audited — each is its own record, or is noise.
// Adding a table? Audit it (migration) or add it here with a reason.
const EXEMPT = new Set([
  "_prisma_migrations",
  "ActivityLog", // the log itself
  "SystemStatusChange", // append-only history
  "JobRun", // run history
  "DocumentGen", // generated on public demand; supersession is its history
  "RateLimitEntry", // auth internals
  "LoginChallenge", // auth internals — auth events are logged explicitly
  "Event", // analytics
  "SystemActivityWeek", // GitHub sync data, recorded by JobRun
  "ContentChunk", // AI index (V1.1)
]);

let adminId: string;
let sessionCookie: string;
let orgId: string;
let plannedId: string;
let finishedId: string;

function adminRequest(url: string, method: string, body?: object): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `admin_session=${sessionCookie}`,
      "x-forwarded-for": "198.51.100.7",
      "user-agent": "audit-trail-test",
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

let seq = 0;
async function createSystem(extra: object = {}) {
  seq += 1;
  return db.system.create({
    data: {
      name: `${RUN} System ${seq}`,
      slug: `${RUN}-system-${seq}`,
      description: "Audit fixture.",
      techStack: [],
      organizationId: orgId,
      statusId: plannedId,
      ...extra,
    },
  });
}

const logsFor = (entityId: string) =>
  db.activityLog.findMany({ where: { entityId }, orderBy: { createdAt: "asc" } });

beforeAll(async () => {
  adminId = (await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "hash-one" } })).id;
  sessionCookie = createSessionCookieValue(adminId);
  orgId = (await db.organization.create({ data: { name: `${RUN} Org`, slug: `${RUN}-org` } })).id;
  plannedId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
  finishedId = (await db.status.findUniqueOrThrow({ where: { key: "finished" } })).id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("coverage — every table is audited or deliberately exempt", () => {
  it("has an audit trigger on each non-exempt table, and none on exempt ones", async () => {
    const tables = await db.$queryRaw<{ table: string; audited: boolean }[]>`
      SELECT c.relname AS table,
             EXISTS (SELECT 1 FROM pg_trigger t
                      WHERE t.tgrelid = c.oid AND NOT t.tgisinternal
                        AND t.tgfoid = 'audit_row_change'::regproc) AS audited
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'`;
    const unaudited = tables.filter((t) => !t.audited && !EXEMPT.has(t.table)).map((t) => t.table);
    const exemptButAudited = tables.filter((t) => t.audited && EXEMPT.has(t.table)).map((t) => t.table);
    expect(unaudited, "tables with neither an audit trigger nor an exemption").toEqual([]);
    expect(exemptButAudited).toEqual([]);
  });
});

describe("structure — one middleware layer for every admin write", () => {
  function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      return statSync(path).isDirectory() ? routeFiles(path) : entry === "route.ts" ? [path] : [];
    });
  }
  const adminRoutes = routeFiles(join(process.cwd(), "app/api/v1/admin")).filter((f) => !/[\\/]auth[\\/]/.test(f));
  const lookupWriteRoutes = routeFiles(join(process.cwd(), "app/api/v1/lookups"));

  it("every admin handler is wrapped in withAdmin", () => {
    for (const file of adminRoutes) {
      const src = readFileSync(file, "utf8");
      const handlers = [...src.matchAll(/export (?:async function|const) (GET|POST|PATCH|PUT|DELETE)\b[^\n]*/g)].map((m) => m[0]);
      expect(handlers.length, file).toBeGreaterThan(0);
      for (const h of handlers) expect(h, file).toMatch(/= withAdmin/);
    }
  });

  it("lookup writes are wrapped too", () => {
    for (const file of lookupWriteRoutes) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/export (?:async function|const) (POST|PATCH|PUT|DELETE)\b[^\n]*/g)) {
        expect(m[0], file).toMatch(/= withAdmin/);
      }
    }
  });

  it("no route logs data changes by hand — the database does", () => {
    for (const file of [...adminRoutes, ...lookupWriteRoutes]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/logActivity\(/);
    }
  });

  it("an unauthenticated request is refused by the wrapper itself", async () => {
    const res = await listFlags(new NextRequest("http://localhost/api/v1/admin/settings/flags"));
    expect(res.status).toBe(401);
  });
});

describe("behaviour", () => {
  it("an admin change is logged once, attributed, with request context and only the changed columns", async () => {
    const system = await createSystem();
    const res = await patchSystem(adminRequest(`http://localhost/api/v1/admin/systems/${system.id}`, "PATCH", { sortOrder: 7 }), {
      params: Promise.resolve({ id: system.id }),
    });
    expect(res.status).toBe(200);

    const updates = (await logsFor(system.id)).filter((l) => l.action === "system.update");
    expect(updates).toHaveLength(1);
    const [entry] = updates;
    expect(entry).toMatchObject({ actorType: "ADMIN", adminUserId: adminId, entityType: "System" });
    expect(entry?.ipHash).toBeTruthy();
    expect(entry?.userAgentHash).toBeTruthy();
    // sortOrder changed; needsCuration went false → false is no change, so it isn't listed.
    expect(Object.keys(entry?.after as object)).toEqual(["sortOrder"]);
    expect(entry?.before).toEqual({ sortOrder: 0 });
  });

  it("a write outside any request is still logged — as SYSTEM", async () => {
    const system = await createSystem();
    const [created] = await logsFor(system.id);
    expect(created).toMatchObject({ action: "system.create", actorType: "SYSTEM", adminUserId: null });
    expect((created?.after as { slug: string }).slug).toBe(system.slug);
  });

  it("a housekeeping-only change isn't logged", async () => {
    const system = await createSystem();
    const before = (await logsFor(system.id)).length;
    await db.system.update({ where: { id: system.id }, data: { updatedAt: new Date() } });
    expect((await logsFor(system.id)).length).toBe(before);
  });

  it("changes the database makes on the admin's behalf are attributed to that admin", async () => {
    const system = await createSystem({ contentStatus: "ARCHIVED" });
    await withActor({ kind: "admin", adminUserId: adminId }, (tx) =>
      tx.system.update({ where: { id: system.id }, data: { statusId: finishedId } }),
    );
    const draft = await db.timeline.findFirstOrThrow({ where: { systemId: system.id, autoDrafted: true } });
    const [entry] = await logsFor(draft.id);
    expect(entry).toMatchObject({ action: "timeline.create", actorType: "ADMIN", adminUserId: adminId });
  });

  it("a public inquiry is ANONYMOUS, and its personal data never reaches the log", async () => {
    const res = await postInquiry(
      new NextRequest("http://localhost/api/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `203.0.113.${Date.now() % 250}` },
        body: JSON.stringify({
          name: `${RUN} Visitor`,
          email: `${RUN}-visitor@example.com`,
          message: "A message long enough to pass the twenty-character rule.",
          inquiryType: "hire",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const [entry] = await logsFor(id);
    expect(entry).toMatchObject({ action: "inquiry.create", actorType: "ANONYMOUS", adminUserId: null });
    expect(entry?.ipHash).toBeTruthy();
    const after = entry?.after as Record<string, unknown>;
    expect(after).toMatchObject({ name: "[redacted]", email: "[redacted]", message: "[redacted]", status: "NEW" });
    expect(JSON.stringify(entry)).not.toContain(RUN);
    await db.inquiry.delete({ where: { id } });
  });

  it("admin secrets are redacted, and login bookkeeping alone isn't logged", async () => {
    const admin = await db.adminUser.create({ data: { email: `${RUN}-b@example.com`, passwordHash: "secret-hash" } });
    const [created] = await logsFor(admin.id);
    expect((created?.after as Record<string, unknown>).passwordHash).toBe("[redacted]");

    await db.adminUser.update({ where: { id: admin.id }, data: { failedLoginCount: 3, lastLoginAt: new Date() } });
    expect(await logsFor(admin.id)).toHaveLength(1);

    await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: "new-secret-hash" } });
    const entries = await logsFor(admin.id);
    expect(entries).toHaveLength(2);
    const change = entries.find((e) => e.action === "adminuser.update");
    expect(change?.before).toEqual({ passwordHash: "[redacted]" });
    expect(JSON.stringify(entries)).not.toContain("secret-hash");
  });

  it("a delete keeps what was removed", async () => {
    const link = await db.profileLink.create({ data: { kind: `${RUN}-tmp`, label: "Temp", url: "https://example.com" } });
    await db.profileLink.delete({ where: { id: link.id } });
    const entries = await logsFor(link.id);
    expect(entries.map((e) => e.action).sort()).toEqual(["profilelink.create", "profilelink.delete"]);
    const removed = entries.find((e) => e.action === "profilelink.delete");
    expect((removed?.before as { url: string }).url).toBe("https://example.com");
  });
});
