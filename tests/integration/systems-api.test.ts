// tests/integration/systems-api.test.ts
// Hits the real database (seeded via prisma/seed.ts) through the actual
// route handlers — verifies BR-1.1 (published-only) and the generic-404
// behavior end to end, not just the serializer in isolation.

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSystems } from "@/app/api/v1/systems/route";
import { GET as getSystemBySlug } from "@/app/api/v1/systems/[slug]/route";

describe("GET /api/v1/systems", () => {
  it("returns only published systems", async () => {
    const res = await getSystems(new NextRequest("http://localhost/api/v1/systems"));
    const body = await res.json();

    const slugs = body.data.map((s: { slug: string }) => s.slug);
    expect(slugs).toContain("xkimm-xa-mali");
    // fundslink-academy is seeded as DRAFT — must never appear here (BR-1.1)
    expect(slugs).not.toContain("fundslink-academy");
  });

  it("masks the organization name for the seeded ANONYMIZED_ONLY system", async () => {
    const res = await getSystems(new NextRequest("http://localhost/api/v1/systems"));
    const body = await res.json();

    const sunduza = body.data.find((s: { slug: string }) => s.slug === "sunduza-case-study");
    expect(sunduza).toBeDefined();
    expect(sunduza.organization).not.toContain("Sunduza");
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
    const res = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/xkimm-xa-mali"), {
      params: Promise.resolve({ slug: "xkimm-xa-mali" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe("xkimm-xa-mali");
    expect(body).toHaveProperty("caseStudyBody");
    expect(body).toHaveProperty("impacts");
  });

  it("returns a generic 404 for a draft system's slug", async () => {
    const res = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/fundslink-academy"), {
      params: Promise.resolve({ slug: "fundslink-academy" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns the identical 404 shape for a genuinely unknown slug", async () => {
    const known = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/fundslink-academy"), {
      params: Promise.resolve({ slug: "fundslink-academy" }),
    });
    const unknown = await getSystemBySlug(new NextRequest("http://localhost/api/v1/systems/does-not-exist"), {
      params: Promise.resolve({ slug: "does-not-exist" }),
    });
    expect(await known.json()).toEqual(await unknown.json());
  });
});
