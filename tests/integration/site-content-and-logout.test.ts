// tests/integration/site-content-and-logout.test.ts
// F5b: page content blocks as data (#106) — the public read, the admin
// replace with per-key validation, the database's own guards, and the
// malformed-row fallback — and sign-out ending every session (#104).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPublicContent } from "@/app/api/v1/content/[key]/route";
import { GET as listAdminContent } from "@/app/api/v1/admin/content/route";
import { GET as getAdminContent, PUT as putAdminContent } from "@/app/api/v1/admin/content/[key]/route";
import { POST as logout } from "@/app/api/v1/admin/auth/logout/route";
import { db } from "@/lib/db";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getContentBlock } from "@/lib/content/blocks";

const KEY = "how-i-build";
let adminId: string;
let cookie: string;
let original: unknown;

function req(url: string, method: string, body?: unknown, session: string | null = cookie) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(session ? { cookie: `${SESSION_COOKIE_NAME}=${session}` } : {}) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
const params = (key: string) => ({ params: Promise.resolve({ key }) });

beforeAll(async () => {
  const admin = await db.adminUser.create({
    data: { email: `test-content-${Date.now().toString(36)}@example.com`, passwordHash: "unused-in-these-tests" },
  });
  adminId = admin.id;
  cookie = createSessionCookieValue(adminId, admin.sessionVersion);
  original = (await db.siteContent.findUniqueOrThrow({ where: { key: KEY } })).body;
});

afterAll(async () => {
  if (original) await db.siteContent.update({ where: { key: KEY }, data: { body: original as object } });
});

describe("page content blocks (#106)", () => {
  it("serves the seeded how-i-build block publicly", async () => {
    const res = await getPublicContent(req(`/api/v1/content/${KEY}`, "GET", undefined, null), params(KEY));
    expect(res.status).toBe(200);
    const { body } = await res.json();
    expect(body.mission.length).toBeGreaterThan(0);
    expect(body.principles.length).toBeGreaterThanOrEqual(1);
    expect(body.principles[0]).toEqual(expect.objectContaining({ name: expect.any(String), summary: expect.any(String), body: expect.any(String) }));
  });

  it("answers 404 for a key that isn't a registered block", async () => {
    const res = await getPublicContent(req("/api/v1/content/nope", "GET", undefined, null), params("nope"));
    expect(res.status).toBe(404);
  });

  it("lists and reads blocks for the admin, and refuses without a session", async () => {
    expect((await listAdminContent(req("/api/v1/admin/content", "GET", undefined, null))).status).toBe(401);
    const list = await (await listAdminContent(req("/api/v1/admin/content", "GET"))).json();
    expect(list.blocks.map((b: { key: string }) => b.key)).toContain(KEY);
    const one = await (await getAdminContent(req(`/api/v1/admin/content/${KEY}`, "GET"), params(KEY))).json();
    expect(one.title.length).toBeGreaterThan(0);
    expect(one.body).toEqual(original);
  });

  it("refuses a body that doesn't match the block's schema", async () => {
    const res = await putAdminContent(req(`/api/v1/admin/content/${KEY}`, "PUT", { mission: "x", principles: [] }), params(KEY));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details.issues.length).toBeGreaterThan(0);
  });

  it("replaces the block; the public read shows it at once, and the change is audited", async () => {
    const next = { mission: "A test mission.", principles: [{ name: "One", summary: "The first.", body: "The first, in full." }] };
    const res = await putAdminContent(req(`/api/v1/admin/content/${KEY}`, "PUT", next), params(KEY));
    expect(res.status).toBe(200);
    expect(await getContentBlock(KEY)).toEqual(next);
    const audit = await db.activityLog.findFirst({ where: { entityType: "SiteContent", entityId: KEY, adminUserId: adminId }, orderBy: { createdAt: "desc" } });
    expect(audit).not.toBeNull();
  });

  it("a malformed row degrades to 'no content' instead of breaking the page", async () => {
    await db.siteContent.update({ where: { key: KEY }, data: { body: { mission: 42 } } });
    expect(await getContentBlock(KEY)).toBeNull();
    const res = await getPublicContent(req(`/api/v1/content/${KEY}`, "GET", undefined, null), params(KEY));
    expect(res.status).toBe(404);
  });

  it("the database refuses a bad key or a non-object body", async () => {
    await expect(db.siteContent.create({ data: { key: "Not A Key", body: {} } })).rejects.toThrow(/SiteContent_key_format/);
    await expect(db.$executeRaw`INSERT INTO "SiteContent" ("key", "body") VALUES ('test-array', '[]'::jsonb)`).rejects.toThrow(/SiteContent_body_object/);
  });
});

describe("sign-out (#104)", () => {
  it("ends every session: the cookie is cleared and the old one stops working", async () => {
    const before = (await db.adminUser.findUniqueOrThrow({ where: { id: adminId } })).sessionVersion;
    const res = await logout(req("/api/v1/admin/auth/logout", "POST"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedOut: true });
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`${SESSION_COOKIE_NAME}=;`));

    const after = (await db.adminUser.findUniqueOrThrow({ where: { id: adminId } })).sessionVersion;
    expect(after).toBe(before + 1);
    expect((await listAdminContent(req("/api/v1/admin/content", "GET"))).status).toBe(401);

    const logged = await db.activityLog.findFirst({ where: { adminUserId: adminId, action: "auth.logout" } });
    expect(logged).not.toBeNull();
  });

  it("refuses a request with no session", async () => {
    expect((await logout(req("/api/v1/admin/auth/logout", "POST", undefined, null))).status).toBe(401);
  });
});
