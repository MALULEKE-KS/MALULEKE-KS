// tests/integration/organizations-and-lookups-api.test.ts
// Hits the real database (seeded via prisma/seed.ts).

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getOrganizations } from "@/app/api/v1/organizations/route";
import { GET as getLookups } from "@/app/api/v1/lookups/[type]/route";

describe("GET /api/v1/organizations", () => {
  it("only returns organizations with at least one published system", async () => {
    const res = await getOrganizations();
    const body = await res.json();
    const slugs = body.map((o: { slug: string }) => o.slug);

    // ksdrill-sa has a published, disclosed system (Xkimm Xa Mali).
    // growthcore-solutions only has the DRAFT fundslink-academy.
    // sunduza's only published system is ANONYMIZED_ONLY without name
    // disclosure, so listing it would reveal the client (BR-1.4, #72).
    expect(slugs).toContain("ksdrill-sa");
    expect(slugs).not.toContain("sunduza");
    expect(slugs).not.toContain("growthcore-solutions");
  });
});

describe("GET /api/v1/lookups/[type]", () => {
  it("returns active status values", async () => {
    const res = await getLookups(new NextRequest("http://localhost/api/v1/lookups/status"), {
      params: Promise.resolve({ type: "status" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((s: { key: string }) => s.key === "finished")).toBe(true);
  });

  it("returns 404 for an unknown lookup type", async () => {
    const res = await getLookups(new NextRequest("http://localhost/api/v1/lookups/not-a-real-type"), {
      params: Promise.resolve({ type: "not-a-real-type" }),
    });
    expect(res.status).toBe(404);
  });
});
