// tests/integration/systems-api.test.ts
// Hits the real database (seeded via prisma/seed.ts) through the actual
// route handlers — verifies BR-1.1 (published-only) and the generic-404
// behavior end to end, not just the serializer in isolation.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSystems } from "@/app/api/v1/systems/route";
import { GET as getSystemBySlug } from "@/app/api/v1/systems/[slug]/route";
import { db } from "@/lib/db";

// An unnamed client of this suite's own (BR-1.4): published with the client's
// approval, but without approval to name them.
const RUN = `sa${Date.now().toString(36)}`;
const CLIENT_NAME = `${RUN} Hidden Client Ltd`;
const DRAFT = `${RUN}-draft`;

beforeAll(async () => {
  const org = await db.organization.create({ data: { name: CLIENT_NAME, slug: `${RUN}-client`, isClient: true } });
  const status = await db.status.findUniqueOrThrow({ where: { key: "finished" } });
  await db.system.create({
    data: {
      name: `${RUN} Client Work`,
      slug: `${RUN}-client-work`,
      organizationId: org.id,
      statusId: status.id,
      description: "A client system published without naming the client.",
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      nameDisclosureApproved: false,
      contentStatus: "PUBLISHED",
    },
  });
  // A draft of this suite's own (not a seeded row — real systems change state, e.g. a repo going public).
  await db.system.create({
    data: {
      name: `${RUN} Draft`,
      slug: DRAFT,
      organizationId: org.id,
      statusId: status.id,
      description: "Not published.",
      clientVisibility: "PUBLIC",
      contentStatus: "DRAFT",
    },
  });
});

afterAll(async () => {
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

async function findPublished(slug: string) {
  // Page through: other test files add published systems of their own.
  for (let page = 1; page <= 20; page++) {
    const body = await (await getSystems(new NextRequest(`http://localhost/api/v1/systems?page=${page}`))).json();
    if (body.data.length === 0) return undefined;
    const found = body.data.find((s: { slug: string }) => s.slug === slug);
    if (found) return found as { organization: string };
  }
  return undefined;
}

describe("GET /api/v1/systems", () => {
  it("returns only published systems", async () => {
    const res = await getSystems(new NextRequest("http://localhost/api/v1/systems"));
    const body = await res.json();

    const slugs = body.data.map((s: { slug: string }) => s.slug);
    expect(slugs).toContain("xkimi-xa-mali");
    // A draft must never appear here (BR-1.1).
    expect(slugs).not.toContain(DRAFT);
  });

  it("masks the organization name of an ANONYMIZED_ONLY client without name approval (BR-1.4)", async () => {
    const system = await findPublished(`${RUN}-client-work`);
    expect(system).toBeDefined();
    expect(system!.organization).not.toContain(CLIENT_NAME);
  });

  it("names a client once they have approved it — Sunduza (BR-1.4)", async () => {
    const sunduza = await findPublished("sunduza-architectural");
    expect(sunduza).toBeDefined();
    expect(sunduza!.organization).toContain("Sunduza");
  });

  it("filters by domain", async () => {
    const res = await getSystems(new NextRequest("http://localhost/api/v1/systems?domain=fintech"));
    const body = await res.json();

    expect(body.data.every((s: { domain: string | null }) => s.domain === "Fintech")).toBe(true);
  });

  it("clamps an invalid pageSize instead of erroring", async () => {
    const res = await getSystems(new NextRequest("http://localhost/api/v1/systems?pageSize=9999"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.pageSize).toBeLessThanOrEqual(100);
  });
});

describe("GET /api/v1/systems/[slug]", () => {
  it("returns a published system's full detail", async () => {
    const res = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/xkimi-xa-mali"), {
      params: Promise.resolve({ slug: "xkimi-xa-mali" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("xkimi-xa-mali");
    expect(body).toHaveProperty("caseStudyBody");
    expect(body).toHaveProperty("impacts");
  });

  it("returns a generic 404 for a draft system's slug", async () => {
    const res = await getSystemBySlug(new NextRequest(`http://localhost/api/v1/systems/${DRAFT}`), {
      params: Promise.resolve({ slug: DRAFT }),
    });
    expect(res.status).toBe(404);
  });

  it("returns the identical 404 shape for a genuinely unknown slug", async () => {
    const known = await getSystemBySlug(new NextRequest(`http://localhost/api/v1/systems/${DRAFT}`), {
      params: Promise.resolve({ slug: DRAFT }),
    });
    const unknown = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/does-not-exist"), {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });
    expect(await known.json()).toEqual(await unknown.json());
  });
});
