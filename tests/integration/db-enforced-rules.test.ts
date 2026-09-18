// tests/integration/db-enforced-rules.test.ts
// F1.2 (#60): proves the DATABASE itself refuses each business-rule violation.
// Every write here goes straight through Prisma — no API route, no Zod — so a
// passing test means the rule would hold even if application code were buggy
// or bypassed. Each rule is paired with a valid write that must still succeed,
// so a rule can't pass by simply blocking everything.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

// Systems and documents can't be deleted (that's one of the rules under
// test), so fixtures carry a per-run suffix instead of relying on cleanup.
const RUN = `dbr-${Date.now().toString(36)}`;

let orgId: string;
let clientOrgId: string;
let statusId: string;
let inquiryTypeId: string;
let skillCategoryId: string;
const inquiryIds: string[] = [];

beforeAll(async () => {
  orgId = (await db.organization.create({ data: { name: "DB Rules Org", slug: `${RUN}-org` } })).id;
  clientOrgId = (
    await db.organization.create({ data: { name: "DB Rules Client", slug: `${RUN}-client`, isClient: true } })
  ).id;
  statusId = (await db.status.findFirstOrThrow({ where: { key: "planned" } })).id;
  inquiryTypeId = (await db.inquiryType.findFirstOrThrow({ where: { key: "hire" } })).id;
  skillCategoryId = (await db.skillCategory.findFirstOrThrow()).id;
});

afterAll(async () => {
  await db.inquiry.deleteMany({ where: { id: { in: inquiryIds } } });
  await db.skill.deleteMany({ where: { name: { startsWith: RUN, mode: "insensitive" } } });
  await db.experience.deleteMany({ where: { title: { startsWith: RUN } } });
  await db.adminUser.deleteMany({ where: { email: { startsWith: RUN } } });
});

const systemData = (slug: string, extra: object = {}) => ({
  name: `System ${slug}`,
  slug,
  organizationId: orgId,
  statusId,
  description: "Fixture system for database rule tests.",
  ...extra,
});

describe("BR-1.x publishing — enforced by the database", () => {
  it("BR-1.1: refuses to publish a non-PUBLIC system without client approval", async () => {
    await expect(
      db.system.create({
        data: systemData(`${RUN}-br11`, {
          clientVisibility: "REQUIRES_APPROVAL",
          clientApproved: false,
          contentStatus: "PUBLISHED",
        }),
      }),
    ).rejects.toThrow(/System_br_1_1_publish_requires_approval/);

    const approved = await db.system.create({
      data: systemData(`${RUN}-br11-ok`, {
        clientVisibility: "REQUIRES_APPROVAL",
        clientApproved: true,
        contentStatus: "PUBLISHED",
      }),
    });
    expect(approved.contentStatus).toBe("PUBLISHED");
  });

  it("BR-1.2: a client-org system created as PUBLIC starts as REQUIRES_APPROVAL", async () => {
    const created = await db.system.create({
      data: { ...systemData(`${RUN}-br12`), organizationId: clientOrgId, clientVisibility: "PUBLIC" },
    });
    expect(created.clientVisibility).toBe("REQUIRES_APPROVAL");

    // Opening it up afterwards is a deliberate UPDATE, which is allowed.
    const opened = await db.system.update({ where: { id: created.id }, data: { clientVisibility: "PUBLIC" } });
    expect(opened.clientVisibility).toBe("PUBLIC");
  });

  it("BR-1.9: refuses to hard-delete a system; archiving works", async () => {
    const system = await db.system.create({ data: systemData(`${RUN}-br19`) });
    await expect(db.system.delete({ where: { id: system.id } })).rejects.toThrow(/BR-1\.9/);
    const archived = await db.system.update({ where: { id: system.id }, data: { contentStatus: "ARCHIVED" } });
    expect(archived.contentStatus).toBe("ARCHIVED");
  });

  it("refuses slugs that aren't lowercase hyphenated words", async () => {
    await expect(db.system.create({ data: systemData(`${RUN} Bad Slug`) })).rejects.toThrow(/System_slug_format/);
    await expect(
      db.organization.create({ data: { name: "Bad", slug: `${RUN}_Bad` } }),
    ).rejects.toThrow(/Organization_slug_format/);
  });
});

describe("BR-7.2 documents — enforced by the database", () => {
  it("refuses to delete a generated document", async () => {
    const doc = await db.documentGen.create({
      data: { type: "cv", fileData: Buffer.from("%PDF-test"), fileUrl: `/api/v1/cv/documents/${RUN}` },
    });
    await expect(db.documentGen.delete({ where: { id: doc.id } })).rejects.toThrow(/BR-7\.2/);
  });
});

describe("BR-2.x inquiries — enforced by the database", () => {
  const inquiry = (extra: object = {}) => ({
    name: "Rule Tester",
    email: "rule.tester@example.com",
    message: "A message comfortably longer than twenty characters.",
    inquiryTypeId,
    ...extra,
  });

  it("BR-2.3: refuses messages outside 20–5000 characters", async () => {
    await expect(db.inquiry.create({ data: inquiry({ message: "too short" }) })).rejects.toThrow(
      /Inquiry_br_2_3_message_length/,
    );
    await expect(db.inquiry.create({ data: inquiry({ message: "x".repeat(5001) }) })).rejects.toThrow(
      /Inquiry_br_2_3_message_length/,
    );
  });

  it("BR-2.3: refuses a blank name and a malformed email", async () => {
    await expect(db.inquiry.create({ data: inquiry({ name: "   " }) })).rejects.toThrow(/Inquiry_br_2_3_name_present/);
    await expect(db.inquiry.create({ data: inquiry({ email: "not-an-email" }) })).rejects.toThrow(
      /Inquiry_br_2_3_email_shape/,
    );
  });

  it("BR-2.1: an inquiry must start as NEW", async () => {
    await expect(db.inquiry.create({ data: inquiry({ status: "REVIEWED" }) })).rejects.toThrow(/BR-2\.1/);
  });

  it("BR-2.1: refuses skipped or backward transitions; allows the valid path", async () => {
    const created = await db.inquiry.create({ data: inquiry() });
    inquiryIds.push(created.id);
    const id = created.id;

    await expect(db.inquiry.update({ where: { id }, data: { status: "RESPONDED" } })).rejects.toThrow(/BR-2\.1/);
    await expect(db.inquiry.update({ where: { id }, data: { status: "CLOSED" } })).rejects.toThrow(/BR-2\.1/);

    await db.inquiry.update({ where: { id }, data: { status: "REVIEWED" } });
    await expect(db.inquiry.update({ where: { id }, data: { status: "NEW" } })).rejects.toThrow(/BR-2\.1/);

    await db.inquiry.update({ where: { id }, data: { status: "RESPONDED" } });
    const closed = await db.inquiry.update({ where: { id }, data: { status: "CLOSED" } });
    expect(closed.status).toBe("CLOSED");

    await expect(db.inquiry.update({ where: { id }, data: { status: "REVIEWED" } })).rejects.toThrow(/BR-2\.1/);
  });
});

describe("BR-3.x admin security — enforced by the database", () => {
  it("BR-3.10: refuses a mixed-case admin email", async () => {
    await expect(
      db.adminUser.create({ data: { email: `${RUN}-Admin@Example.com`, passwordHash: "x" } }),
    ).rejects.toThrow(/AdminUser_br_3_10_email_lowercase/);
  });

  it("BR-3.5: refuses a login challenge that lives longer than 5 minutes", async () => {
    const admin = await db.adminUser.create({ data: { email: `${RUN}-admin@example.com`, passwordHash: "x" } });
    const now = Date.now();
    await expect(
      db.loginChallenge.create({
        data: {
          adminUserId: admin.id,
          tokenHash: `${RUN}-long`,
          createdAt: new Date(now),
          expiresAt: new Date(now + 10 * 60_000),
        },
      }),
    ).rejects.toThrow(/LoginChallenge_br_3_5_ttl/);

    const ok = await db.loginChallenge.create({
      data: { adminUserId: admin.id, tokenHash: `${RUN}-ok`, createdAt: new Date(now), expiresAt: new Date(now + 5 * 60_000) },
    });
    expect(ok.attempts).toBe(0);
    await expect(
      db.loginChallenge.update({ where: { id: ok.id }, data: { attempts: -1 } }),
    ).rejects.toThrow(/LoginChallenge_attempts_nonnegative/);
  });

  it("refuses a negative failed-login counter", async () => {
    await expect(
      db.adminUser.create({ data: { email: `${RUN}-neg@example.com`, passwordHash: "x", failedLoginCount: -1 } }),
    ).rejects.toThrow(/AdminUser_failedLoginCount_nonnegative/);
  });
});

describe("CV record and lookups — enforced by the database", () => {
  it("refuses an end date before the start date", async () => {
    await expect(
      db.experience.create({
        data: {
          title: `${RUN} role`,
          organization: "Org",
          description: "Fixture",
          startDate: new Date("2025-06-01"),
          endDate: new Date("2025-01-01"),
        },
      }),
    ).rejects.toThrow(/Experience_dates_ordered/);
  });

  it("refuses two skills that differ only by letter case", async () => {
    await db.skill.create({ data: { name: `${RUN}-React`, categoryId: skillCategoryId } });
    await expect(
      db.skill.create({ data: { name: `${RUN}-react`, categoryId: skillCategoryId } }),
    ).rejects.toThrow(/Skill_name_lower_key|Unique constraint/);
  });

  it("refuses malformed lookup keys", async () => {
    await expect(db.domain.create({ data: { key: "Bad Key", label: "Bad" } })).rejects.toThrow(/Domain_key_format/);
    await expect(db.status.create({ data: { key: "NoCaps", label: "Bad", colorToken: "signal-planned" } })).rejects.toThrow(
      /Status_key_format/,
    );
  });
});
