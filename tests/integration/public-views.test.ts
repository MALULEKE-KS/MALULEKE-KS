// tests/integration/public-views.test.ts
// F1.7 (#72): the public views are the only shape public pages read, so every
// masking and visibility rule is proven here, against the database itself.
// Replaces the old unit tests of TypeScript masking (tests/unit/publishing),
// which no longer exists — the rules live in SQL now.
// Also: the BR-1.4 organization-list leak (regression), instant search
// (approved feature 5) and curated numbers (approved feature 6, BR-5.3).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getFilterOrganizations, getPublicSystemBySlug, getPublicSystems } from "@/lib/queries/systems";
import { searchPublic } from "@/lib/queries/search";
import {
  approveMetricSnapshot as approveIn,
  getPublicMetrics,
  proposeComputedMetrics,
  proposeMetric,
  rejectMetricSnapshot as rejectIn,
} from "@/lib/metrics";
import { withActor } from "@/lib/audit";

// Admin decisions run in the admin's audited transaction, as the admin API will (F2.2).
const approveMetricSnapshot = (id: string, admin: string) =>
  withActor({ kind: "admin", adminUserId: admin }, (tx) => approveIn(tx, id, admin));
const rejectMetricSnapshot = (id: string, admin: string) =>
  withActor({ kind: "admin", adminUserId: admin }, (tx) => rejectIn(tx, id, admin));

const RUN = `pv${Date.now().toString(36)}`;

let adminId: string;
let clientOrgId: string;
let clientOrgSlug: string;
let publicOrgId: string;
let statusId: string;
let fintechId: string;
let architectureId: string;

let seq = 0;
async function createSystem(orgId: string, extra: Record<string, unknown> = {}) {
  seq += 1;
  const system = await db.system.create({
    data: {
      name: `${RUN} System ${seq}`,
      slug: `${RUN}-system-${seq}`,
      description: `Public views fixture ${seq}.`,
      techStack: ["TypeScript"],
      organizationId: orgId,
      statusId,
      repoUrl: "https://github.com/example/repo",
      liveUrl: "https://example.com",
      screenshotUrl: "https://example.com/shot.png",
    },
  });
  // Visibility and publishing are set after insert: BR-1.2 starts a client
  // organization's systems restricted, and BR-1.1 needs approval to publish.
  return db.system.update({ where: { id: system.id }, data: extra });
}

const view = (id: string) => db.publicSystem.findUnique({ where: { id } });

beforeAll(async () => {
  adminId = (
    await db.adminUser.create({ data: { email: `${RUN}@example.com`, passwordHash: "unused-in-these-tests" } })
  ).id;
  clientOrgSlug = `${RUN}-client`;
  clientOrgId = (
    await db.organization.create({ data: { name: `${RUN} Real Client Ltd`, slug: clientOrgSlug, isClient: true } })
  ).id;
  publicOrgId = (await db.organization.create({ data: { name: `${RUN} Studio`, slug: `${RUN}-studio` } })).id;
  statusId = (await db.status.findUniqueOrThrow({ where: { key: "planned" } })).id;
  fintechId = (await db.domain.findUniqueOrThrow({ where: { key: "fintech" } })).id;
  architectureId = (await db.domain.findUniqueOrThrow({ where: { key: "architecture" } })).id;
});

afterAll(async () => {
  if (!adminId) return;
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "ARCHIVED" } });
  await db.metric.updateMany({ where: { key: { startsWith: `test.${RUN}` } }, data: { active: false } });
});

describe("PublicSystem — BR-1.1 published only", () => {
  it("never contains a draft or archived system", async () => {
    const draft = await createSystem(publicOrgId);
    const archived = await createSystem(publicOrgId, { contentStatus: "ARCHIVED" });
    expect(await view(draft.id)).toBeNull();
    expect(await view(archived.id)).toBeNull();
    expect(await getPublicSystemBySlug(draft.slug)).toBeNull();
  });
});

describe("PublicSystem — BR-1.3 NDA and BR-1.7 private repos", () => {
  it("shows links for a PUBLIC system", async () => {
    const s = await createSystem(publicOrgId, { contentStatus: "PUBLISHED" });
    expect(await view(s.id)).toMatchObject({
      repoUrl: "https://github.com/example/repo",
      liveUrl: "https://example.com",
      screenshotUrl: "https://example.com/shot.png",
    });
  });

  it("hides repo, live link and screenshot for NDA_RESTRICTED, even when approved", async () => {
    const s = await createSystem(clientOrgId, {
      clientVisibility: "NDA_RESTRICTED",
      clientApproved: true,
      contentStatus: "PUBLISHED",
    });
    expect(await view(s.id)).toMatchObject({ repoUrl: null, liveUrl: null, screenshotUrl: null });
  });

  it("never links a private repo, but keeps the live link", async () => {
    const s = await createSystem(publicOrgId, { repoPrivate: true, contentStatus: "PUBLISHED" });
    expect(await view(s.id)).toMatchObject({ repoPrivate: true, repoUrl: null, liveUrl: "https://example.com" });
  });
});

describe("PublicSystem — BR-1.4 anonymized clients", () => {
  it("masks the name with the domain, and exposes no organization slug", async () => {
    const s = await createSystem(clientOrgId, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      domainId: fintechId,
      contentStatus: "PUBLISHED",
    });
    expect(await view(s.id)).toMatchObject({ organization: "a fintech client", organizationSlug: null });
  });

  it("uses 'an' before a vowel, and a generic label without a domain", async () => {
    const vowel = await createSystem(clientOrgId, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      domainId: architectureId,
      contentStatus: "PUBLISHED",
    });
    const none = await createSystem(clientOrgId, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      contentStatus: "PUBLISHED",
    });
    expect((await view(vowel.id))?.organization).toBe("an architecture & construction client");
    expect((await view(none.id))?.organization).toBe("a client");
  });

  it("reveals the real name only once name disclosure is approved", async () => {
    const s = await createSystem(clientOrgId, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      contentStatus: "PUBLISHED",
    });
    expect((await view(s.id))?.organization).not.toContain("Real Client");
    await db.system.update({ where: { id: s.id }, data: { nameDisclosureApproved: true } });
    expect(await view(s.id)).toMatchObject({ organization: `${RUN} Real Client Ltd`, organizationSlug: clientOrgSlug });
    await db.system.update({ where: { id: s.id }, data: { contentStatus: "ARCHIVED" } });
  });

  it("never masks a system that isn't ANONYMIZED_ONLY", async () => {
    const s = await createSystem(clientOrgId, { clientApproved: true, contentStatus: "PUBLISHED" });
    expect((await view(s.id))?.organization).toBe(`${RUN} Real Client Ltd`);
    await db.system.update({ where: { id: s.id }, data: { contentStatus: "ARCHIVED" } });
  });
});

describe("BR-1.4 regression — the organization list can't reveal an anonymized client (#72)", () => {
  it("lists an organization only through a published system that discloses its name", async () => {
    const org = await db.organization.create({ data: { name: `${RUN} Hidden Ltd`, slug: `${RUN}-hidden`, isClient: true } });
    const s = await createSystem(org.id, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      contentStatus: "PUBLISHED",
    });
    expect((await getFilterOrganizations()).map((o) => o.slug)).not.toContain(`${RUN}-hidden`);

    // Filtering the catalog by the client's slug surfaces nothing either.
    const filtered = await getPublicSystems({ organizationSlug: `${RUN}-hidden` });
    expect(filtered.meta.total).toBe(0);

    await db.system.update({ where: { id: s.id }, data: { nameDisclosureApproved: true } });
    expect((await getFilterOrganizations()).map((o) => o.slug)).toContain(`${RUN}-hidden`);
  });
});

describe("case-study details — impacts and testimonials (BR-6.1, BR-6.2, BR-1.4)", () => {
  it("shows only permitted testimonials, and masks a hidden client's organization in them", async () => {
    const s = await createSystem(clientOrgId, {
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      contentStatus: "PUBLISHED",
    });
    await db.impact.create({ data: { systemId: s.id, label: "Findings closed", value: "12" } });
    await db.testimonial.createMany({
      data: [
        { systemId: s.id, authorName: "Allowed", organization: `${RUN} Real Client Ltd`, quote: "Great.", hasPermission: true },
        { systemId: s.id, authorName: "Not allowed", quote: "Hidden.", hasPermission: false },
      ],
    });

    const detail = await getPublicSystemBySlug(s.slug);
    expect(detail?.impacts).toEqual([{ label: "Findings closed", value: "12" }]);
    expect(detail?.testimonials.map((t) => t.authorName)).toEqual(["Allowed"]);
    expect(detail?.testimonials[0]?.organization).toBeNull();
  });

  it("hides impacts and testimonials of a system that isn't published", async () => {
    const s = await createSystem(publicOrgId);
    await db.impact.create({ data: { systemId: s.id, label: "Hidden", value: "1" } });
    await db.testimonial.create({ data: { systemId: s.id, authorName: "X", quote: "Hidden.", hasPermission: true } });
    expect(await db.publicImpact.count({ where: { systemId: s.id } })).toBe(0);
    expect(await db.publicTestimonial.count({ where: { systemId: s.id } })).toBe(0);
  });
});

describe("instant search (approved feature 5)", () => {
  it("finds published work by a typo, and never a draft", async () => {
    const published = await createSystem(publicOrgId, { name: `${RUN} Ledgerwise`, contentStatus: "PUBLISHED" });
    await createSystem(publicOrgId, { name: `${RUN} Ledgerwise Draft` });

    const results = await searchPublic(`${RUN} Ledgerwse`);
    const titles = results.map((r) => r.title);
    expect(results.find((r) => r.key === published.slug)?.kind).toBe("system");
    expect(titles).not.toContain(`${RUN} Ledgerwise Draft`);
  });

  it("shows a masked client as masked in results", async () => {
    await createSystem(clientOrgId, {
      name: `${RUN} Vaultline`,
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      domainId: fintechId,
      contentStatus: "PUBLISHED",
    });
    const hit = (await searchPublic(`${RUN} Vaultline`)).find((r) => r.title === `${RUN} Vaultline`);
    expect(hit?.subtitle).toBe("a fintech client");
  });

  it("finds skills, ignores queries under two characters, and caps the limit", async () => {
    const category = await db.skillCategory.findFirstOrThrow();
    await db.skill.create({ data: { name: `${RUN}Kubernetes`, categoryId: category.id } });
    expect((await searchPublic(`${RUN}Kubernetes`)).some((r) => r.kind === "skill")).toBe(true);
    expect(await searchPublic("a")).toEqual([]);
    expect(await searchPublic("xy", 500)).toEqual([]); // invalid limit → no query at all
    await db.skill.deleteMany({ where: { name: `${RUN}Kubernetes` } });
  });
});

describe("curated numbers (approved feature 6, BR-5.3)", () => {
  const key = `test.${RUN}.a`;

  it("a proposed value isn't public until the admin approves it; approving swaps atomically", async () => {
    await db.metric.create({ data: { key, label: "Test metric", sortOrder: 99 } });

    const first = await proposeMetric(key, 3, "MANUAL");
    expect(first).toBeTruthy();
    expect((await getPublicMetrics()).find((m) => m.key === key)).toBeUndefined();

    await approveMetricSnapshot(first!, adminId);
    expect((await getPublicMetrics()).find((m) => m.key === key)?.value).toBe(3);

    // The same value again proposes nothing.
    expect(await proposeMetric(key, 3, "MANUAL")).toBeNull();

    const second = await proposeMetric(key, 5, "MANUAL");
    expect((await getPublicMetrics()).find((m) => m.key === key)?.value).toBe(3);
    await approveMetricSnapshot(second!, adminId);
    expect((await getPublicMetrics()).find((m) => m.key === key)?.value).toBe(5);

    const history = await db.metricSnapshot.findMany({ where: { metricKey: key }, orderBy: { proposedAt: "asc" } });
    expect(history.map((h) => h.status)).toEqual(["SUPERSEDED", "APPROVED"]);
    expect(history.every((h) => h.decidedAt !== null && h.decidedById === adminId)).toBe(true);

    // The database logged both approvals, attributed to the admin (F2.1).
    const approvals = await db.activityLog.count({
      where: { action: "metricsnapshot.update", adminUserId: adminId, after: { path: ["status"], equals: "APPROVED" } },
    });
    expect(approvals).toBe(2);
  });

  it("a newer proposal replaces a pending one; a rejected value never goes public", async () => {
    const k = `test.${RUN}.b`;
    await db.metric.create({ data: { key: k, label: "Test metric B" } });
    const older = await proposeMetric(k, 1, "MANUAL");
    const newer = await proposeMetric(k, 2, "MANUAL");
    expect((await db.metricSnapshot.findUniqueOrThrow({ where: { id: older! } })).status).toBe("SUPERSEDED");

    await rejectMetricSnapshot(newer!, adminId);
    expect((await getPublicMetrics()).find((m) => m.key === k)).toBeUndefined();
  });

  it("the database keeps the history honest", async () => {
    const k = `test.${RUN}.c`;
    await db.metric.create({ data: { key: k, label: "Test metric C" } });
    const id = (await proposeMetric(k, 7, "MANUAL"))!;

    await expect(db.metricSnapshot.update({ where: { id }, data: { value: 70 } })).rejects.toThrow(/BR-5\.3/);
    await expect(db.metricSnapshot.delete({ where: { id } })).rejects.toThrow(/BR-5\.3/);
    await expect(
      db.metricSnapshot.create({ data: { metricKey: k, value: 1, source: "MANUAL", status: "APPROVED" } }),
    ).rejects.toThrow(/BR-5\.3/);

    await rejectMetricSnapshot(id, adminId);
    await expect(db.metricSnapshot.update({ where: { id }, data: { status: "APPROVED" } })).rejects.toThrow(
      /invalid metric snapshot transition/,
    );
    await expect(db.$executeRaw`SELECT approve_metric_snapshot(${id}, ${adminId})`).rejects.toThrow(/BR-5\.3/);
  });

  it("computes proposals for the registered metrics from public data only", async () => {
    const result = await proposeComputedMetrics();
    const handled = [...result.proposed, ...result.unchanged];
    expect(handled).toEqual(
      expect.arrayContaining(["systems.published", "systems.shipped", "skills.evidenced", "journey.milestones"]),
    );
    // Other test files add systems concurrently, so the exact count can move;
    // what must hold is that a proposal is a whole, non-negative count.
    const pending = await db.metricSnapshot.findFirst({ where: { metricKey: "systems.published", status: "PROPOSED" } });
    if (pending) expect(Number.isInteger(pending.value) && pending.value >= 0).toBe(true);
  });
});

describe("profile and ledger views", () => {
  it("serve the owner's profile and the homepage ledger", async () => {
    const profile = await db.publicProfile.findFirstOrThrow();
    expect(profile.displayName).toBe("Kurhula Success Maluleke");
    expect(await db.publicProfileLink.count()).toBeGreaterThanOrEqual(3);

    const ledger = await db.publicLedger.findFirstOrThrow();
    for (const n of [ledger.systemsShipped, ledger.systemsBuilding, ledger.systemsQueued, ledger.organizationsFounded]) {
      expect(Number.isInteger(n) && n >= 0).toBe(true);
    }
  });
});
