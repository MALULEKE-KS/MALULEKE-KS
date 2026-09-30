// tests/integration/slug-history.test.ts
// #87 / BR-1.14 — a renamed system keeps its old links: the database records
// every slug given up, redirects it permanently to the current one (live
// systems only), and keeps it reserved for the system that used it.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSystem } from "@/app/api/v1/systems/[slug]/route";
import { GET as getRelated } from "@/app/api/v1/systems/[slug]/related/route";
import { PATCH as patchSystem } from "@/app/api/v1/admin/systems/[id]/route";
import SystemDetailPage from "@/app/(public)/systems/[slug]/page";
import { db } from "@/lib/db";
import { createSessionCookieValue } from "@/lib/auth/session";
import { isSlugAvailable } from "@/lib/rules/slugs";

const RUN = `sh${Date.now().toString(36)}`;
let cookie: string;
let orgId: string;
let statusId: string;

let seq = 0;
async function createSystem(published = true) {
  seq += 1;
  const system = await db.system.create({
    data: { name: `${RUN} ${seq}`, slug: `${RUN}-${seq}`, description: "Slug history fixture.", organizationId: orgId, statusId },
  });
  return published ? db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED" } }) : system;
}
const rename = (id: string, slug: string) => db.system.update({ where: { id }, data: { slug } });
const redirectOf = async (slug: string) => (await db.publicSlugRedirect.findUnique({ where: { fromSlug: slug } }))?.toSlug ?? null;
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeAll(async () => {
  const admin = await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } });
  cookie = createSessionCookieValue(admin.id, 1);
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
});

afterAll(async () => {
  await db.system.updateMany({ where: { name: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("the database keeps every old slug (BR-1.14)", () => {
  it("records the old slug on rename, and every old slug points at the current one", async () => {
    const system = await createSystem();
    const [a, b, c] = [system.slug, `${RUN}-renamed-b`, `${RUN}-renamed-c`];
    await rename(system.id, b);
    await rename(system.id, c);
    expect(await redirectOf(a)).toBe(c);
    expect(await redirectOf(b)).toBe(c);
  });

  it("a system can take its own old slug back — it's current again, not a redirect", async () => {
    const system = await createSystem();
    const original = system.slug;
    await rename(system.id, `${RUN}-temp`);
    await rename(system.id, original);
    expect(await redirectOf(original)).toBeNull();
    expect(await redirectOf(`${RUN}-temp`)).toBe(original);
  });

  it("another system can't take an old slug — it would hijack the old links", async () => {
    const first = await createSystem();
    const old = first.slug;
    await rename(first.id, `${RUN}-moved`);
    const second = await createSystem();
    await expect(rename(second.id, old)).rejects.toThrow(/BR-1\.14/);
    await expect(
      db.system.create({ data: { name: `${RUN} squatter`, slug: old, description: "x", organizationId: orgId, statusId } }),
    ).rejects.toThrow(/BR-1\.14/);
    expect(await isSlugAvailable(db, old, second.id)).toBe(false);
    expect(await isSlugAvailable(db, old, first.id)).toBe(true);
  });

  it("never reveals a hidden system through a redirect", async () => {
    const draft = await createSystem(false);
    const old = draft.slug;
    await rename(draft.id, `${RUN}-draft-new`);
    expect(await redirectOf(old)).toBeNull();
  });
});

describe("visitors following an old link land on the current page", () => {
  it("the API answers an old slug with a permanent redirect; an unknown one is a 404", async () => {
    const system = await createSystem();
    const old = system.slug;
    await rename(system.id, `${RUN}-api-new`);

    const res = await getSystem(new NextRequest(`http://localhost/api/v1/systems/${old}`), params(old));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(`http://localhost/api/v1/systems/${RUN}-api-new`);

    const related = await getRelated(new NextRequest(`http://localhost/api/v1/systems/${old}/related?limit=2`), params(old));
    expect(related.status).toBe(308);
    expect(related.headers.get("location")).toBe(`http://localhost/api/v1/systems/${RUN}-api-new/related?limit=2`);

    const unknown = await getRelated(new NextRequest(`http://localhost/api/v1/systems/${RUN}-nope/related`), params(`${RUN}-nope`));
    expect(unknown.status).toBe(404);
  });

  it("the case-study page redirects permanently", async () => {
    const system = await createSystem();
    const old = system.slug;
    await rename(system.id, `${RUN}-page-new`);
    await expect(SystemDetailPage(params(old))).rejects.toMatchObject({
      digest: expect.stringContaining(`/systems/${RUN}-page-new;308`),
    });
  });
});

describe("admin rename", () => {
  const patch = (id: string, body: object) =>
    patchSystem(
      new NextRequest(`http://localhost/api/v1/admin/systems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: `admin_session=${cookie}` },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  it("renames, keeps the old link, and refuses a taken or reserved slug with a 409", async () => {
    const system = await createSystem();
    const old = system.slug;
    const renamed = await patch(system.id, { slug: `${RUN}-admin-new` });
    expect(renamed.status).toBe(200);
    expect(await redirectOf(old)).toBe(`${RUN}-admin-new`);

    const other = await createSystem();
    const taken = await patch(other.id, { slug: `${RUN}-admin-new` });
    expect(taken.status).toBe(409);
    expect((await taken.json()).error.code).toBe("SLUG_TAKEN");

    const reserved = await patch(other.id, { slug: old });
    expect(reserved.status).toBe(409);
    expect((await reserved.json()).error.code).toBe("SLUG_RESERVED");

    expect((await patch(other.id, { slug: "Not A Slug" })).status).toBe(400);
  });
});
