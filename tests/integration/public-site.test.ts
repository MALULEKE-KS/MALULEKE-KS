// tests/integration/public-site.test.ts
// F5a (#99–#102): the public site reads its content as data — the owner's
// profile, links and affiliations, the inquiry types (EXT-1), the review
// promise (BR-2.2) — and the launch surfaces (sitemap, robots) only ever show
// what a visitor may see.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as submitInquiry } from "@/app/api/v1/inquiries/route";
import { issueFormToken } from "@/lib/inquiries/form-token";
import { GET as getProfile } from "@/app/api/v1/profile/route";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { db } from "@/lib/db";
import { yearsBuildingFrom } from "@/lib/queries/homepage";
import { getAffiliations, getInquiryTypes, getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";

const RUN = `ps${Date.now().toString(36)}`;
let orgId: string;
let statusId: string;

beforeAll(async () => {
  orgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
  await db.rateLimitEntry.deleteMany({ where: { bucketKey: { startsWith: "inquiry:" } } });
});

afterAll(async () => {
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
});

describe("years building (#100)", () => {
  const now = new Date("2026-09-30T00:00:00Z");
  it("counts from the year the owner states, when set", () => {
    expect(yearsBuildingFrom(2024, new Date("2025-01-01"), now)).toBe(2);
  });
  it("falls back to the first published role, never below one year", () => {
    expect(yearsBuildingFrom(null, new Date("2025-01-01"), now)).toBe(1);
    expect(yearsBuildingFrom(null, new Date("2021-06-01"), now)).toBe(5);
    expect(yearsBuildingFrom(null, null, now)).toBe(0);
    expect(yearsBuildingFrom(2026, null, now)).toBe(1);
  });
});

describe("site content is data, not code (#99)", () => {
  it("the owner's details and links come from the profile", async () => {
    const profile = await getSiteProfile();
    expect(profile.name).toBe("Kurhula Success Maluleke");
    expect(profile.links.map((l) => l.kind)).toEqual(expect.arrayContaining(["github", "linkedin"]));
  });

  it("affiliations are the organizations with a role — and the profile API exposes them", async () => {
    const affiliations = await getAffiliations();
    expect(affiliations.map((a) => a.slug)).toEqual(expect.arrayContaining(["ksdrill-sa", "growthcore-solutions"]));
    expect(affiliations.every((a) => a.role.length > 0)).toBe(true);
    const body = await (await getProfile()).json();
    expect(body.affiliations.map((a: { slug: string }) => a.slug)).toEqual(expect.arrayContaining(["ksdrill-sa"]));
  });

  it("the review promise is the admin setting (BR-2.2)", async () => {
    expect(await getReviewSlaHours()).toBe(48);
  });
});

describe("inquiry types are a lookup, end to end (EXT-1, #99)", () => {
  const post = (inquiryType: string, i: number) =>
    submitInquiry(
      new NextRequest("http://localhost/api/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${i}` },
        body: JSON.stringify({ name: "Visitor", email: `${RUN}.${i}@example.com`, message: "A message long enough to pass the rules.", inquiryType, formToken: issueFormToken(Date.now() - 10_000) }),
      }),
    );

  it("a type the admin adds is offered and accepted with no code change; a deprecated one is refused", async () => {
    const key = `${RUN.replace(/[^a-z0-9]/g, "")}type`;
    const type = await db.inquiryType.create({ data: { key, label: `${RUN} Speaking` } });
    expect((await getInquiryTypes()).map((t) => t.value)).toContain(key);
    expect((await post(key, 11)).status).toBe(201);

    await db.inquiryType.update({ where: { id: type.id }, data: { active: false } });
    expect((await post(key, 12)).status).toBe(400);
    expect((await post("not-a-type", 13)).status).toBe(400);
  });
});

describe("launch surfaces show only what a visitor may see (#101)", () => {
  it("the sitemap lists live systems, never a draft", async () => {
    const live = await db.system.create({ data: { name: `${RUN} Live`, slug: `${RUN}-live`, description: "x", organizationId: orgId, statusId } });
    await db.system.update({ where: { id: live.id }, data: { contentStatus: "PUBLISHED" } });
    await db.system.create({ data: { name: `${RUN} Draft`, slug: `${RUN}-draft`, description: "x", organizationId: orgId, statusId } });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith(`/systems/${RUN}-live`))).toBe(true);
    expect(urls.some((u) => u.endsWith(`/systems/${RUN}-draft`))).toBe(false);
    // The pages that remain (owner, 2026-10-02): no /cv, no /method — both redirect.
    expect(urls.some((u) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/cv") || u.endsWith("/method"))).toBe(false);
  });

  it("robots keeps the admin and the API out of indexes", () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules : [rules]).flatMap((r) => r.disallow ?? []);
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/api/"]));
  });
});
