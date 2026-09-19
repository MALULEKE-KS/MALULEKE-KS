// prisma/seed.ts
// Seeds the initial values for every EXT-1 lookup table.
// Run: npx prisma db seed
// Idempotent — safe to re-run; uses upsert throughout so it never duplicates
// or clobbers admin-added values (BR-8.1).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Status ---
  // colorToken names a CSS custom property / Tailwind token (see globals.css,
  // tailwind.config.ts) — the color lives as data here, not in component code,
  // so a new admin-added Status doesn't require a code change (EXT-1). The
  // stage is the homepage count each status joins (#52); same principle.
  await Promise.all(
    [
      { key: "finished", label: "Finished", colorToken: "signal-finished", stage: "SHIPPED" as const },
      { key: "in_progress", label: "In Progress", colorToken: "signal-progress", stage: "BUILDING" as const },
      { key: "planned", label: "Planned", colorToken: "signal-planned", stage: "QUEUED" as const },
    ].map((s) =>
      prisma.status.upsert({ where: { key: s.key }, update: {}, create: s })
    )
  );

  // --- Domain ---
  await Promise.all(
    [
      { key: "fintech", label: "Fintech" },
      { key: "govtech", label: "GovTech" },
      { key: "architecture", label: "Architecture & Construction" },
      { key: "ai-ml", label: "AI / Machine Learning" },
      { key: "edtech", label: "EdTech" },
    ].map((d) =>
      prisma.domain.upsert({ where: { key: d.key }, update: {}, create: d })
    )
  );

  // --- InquiryType ---
  await Promise.all(
    [
      { key: "hire", label: "Hire" },
      { key: "partnership", label: "Partnership" },
      { key: "service", label: "Service Request" },
      { key: "contribution", label: "Contribution" },
      { key: "recruitment", label: "Recruitment" },
      { key: "collaboration", label: "Collaboration" },
    ].map((t) =>
      prisma.inquiryType.upsert({ where: { key: t.key }, update: {}, create: t })
    )
  );

  // --- MilestoneType ---
  // autoDraftOnShip marks the type a system's first ship is auto-drafted as
  // (#70) — data, so the admin can hand it to another type.
  await Promise.all(
    [
      { key: "education", label: "Education" },
      { key: "job", label: "Job" },
      { key: "launch", label: "Launch", autoDraftOnShip: true },
      { key: "achievement", label: "Achievement" },
      { key: "personal", label: "Personal" },
    ].map((m) =>
      prisma.milestoneType.upsert({ where: { key: m.key }, update: {}, create: m })
    )
  );

  // --- RepoRelationship --- (#69, BR-1.11)
  // How a system's repo relates to the owner. requiresOwnerPermission is data:
  // any relationship can gate publishing on the repo owner's permission.
  await Promise.all(
    [
      { key: "owner", label: "Owner", requiresOwnerPermission: false },
      { key: "collaborator", label: "Collaborator", requiresOwnerPermission: true },
    ].map((r) =>
      prisma.repoRelationship.upsert({ where: { key: r.key }, update: {}, create: r })
    )
  );

  // --- SkillCategory ---
  await Promise.all(
    [
      { key: "languages", label: "Languages" },
      { key: "frontend", label: "Frontend" },
      { key: "backend", label: "Backend" },
      { key: "database", label: "Database" },
      { key: "ai-ml", label: "AI / ML" },
      { key: "infra", label: "Infrastructure" },
      { key: "testing", label: "Testing" },
    ].map((c) =>
      prisma.skillCategory.upsert({ where: { key: c.key }, update: {}, create: c })
    )
  );

  // --- Organizations ---
  // githubLogins maps a raw GitHub org/user login (as configured in
  // GITHUB_SYNC_ORGS, e.g. "MALULEKE-KS") to the Organization it belongs to,
  // for logins that don't slugify to the same string as the Organization's
  // own slug. github-sync.ts checks this list before falling back to
  // slugify(login) === Organization.slug.
  await Promise.all(
    [
      { name: "KSDRILL-SA", slug: "ksdrill-sa", role: "Founder & Principal Engineer", isClient: false, githubLogins: ["KSDRILL-SA"] },
      { name: "GrowthCore Solutions", slug: "growthcore-solutions", role: "Co-founder", isClient: false, githubLogins: ["GrowthCore-Solutions"] },
      { name: "Sunduza Architectural & Projects (Pty) Ltd", slug: "sunduza", role: null, isClient: true, githubLogins: [] },
      { name: "Personal", slug: "personal", role: null, isClient: false, githubLogins: ["MALULEKE-KS"] },
    ].map((o) =>
      prisma.organization.upsert({ where: { slug: o.slug }, update: {}, create: o })
    )
  );

  // --- Systems ---
  // A small, real set for local dev/testing until the GitHub sync job has a
  // real token to run against. Deliberately covers three BR-1.x states:
  // plain public, ANONYMIZED_ONLY+approved (exercises the org-name masking
  // in lib/rules/publishing.ts), and an unpublished draft (exercises the
  // published-only filter / generic-404 behavior).
  const ksdrillSa = await prisma.organization.findUniqueOrThrow({ where: { slug: "ksdrill-sa" } });
  const sunduza = await prisma.organization.findUniqueOrThrow({ where: { slug: "sunduza" } });
  const growthcore = await prisma.organization.findUniqueOrThrow({ where: { slug: "growthcore-solutions" } });
  const finishedStatus = await prisma.status.findUniqueOrThrow({ where: { key: "finished" } });
  const inProgressStatus = await prisma.status.findUniqueOrThrow({ where: { key: "in_progress" } });
  const fintechDomain = await prisma.domain.findUniqueOrThrow({ where: { key: "fintech" } });
  const architectureDomain = await prisma.domain.findUniqueOrThrow({ where: { key: "architecture" } });
  const edtechDomain = await prisma.domain.findUniqueOrThrow({ where: { key: "edtech" } });

  await prisma.system.upsert({
    where: { slug: "xkimm-xa-mali" },
    update: {},
    create: {
      name: "Xkimm Xa Mali",
      slug: "xkimm-xa-mali",
      organizationId: ksdrillSa.id,
      statusId: finishedStatus.id,
      domainId: fintechDomain.id,
      description: "A private savings collective platform, built for real money and real family stakes.",
      isFlagship: true,
      clientVisibility: "PUBLIC",
      contentStatus: "PUBLISHED",
    },
  });

  await prisma.system.upsert({
    where: { slug: "sunduza-case-study" },
    update: {},
    create: {
      name: "Sunduza Case Study",
      slug: "sunduza-case-study",
      organizationId: sunduza.id,
      statusId: finishedStatus.id,
      domainId: architectureDomain.id,
      description: "Architectural and project management systems for a construction client.",
      isFlagship: false,
      // ANONYMIZED_ONLY + clientApproved=true (required to publish at all,
      // BR-1.1) + nameDisclosureApproved=false (default): publishable, but
      // the organization name still masks to a generic label (BR-1.4) — a
      // deliberately separate authorization from clientApproved.
      clientVisibility: "ANONYMIZED_ONLY",
      clientApproved: true,
      nameDisclosureApproved: false,
      contentStatus: "PUBLISHED",
    },
  });

  await prisma.system.upsert({
    where: { slug: "fundslink-academy" },
    update: {},
    create: {
      name: "FundsLink-Academy",
      slug: "fundslink-academy",
      organizationId: growthcore.id,
      statusId: inProgressStatus.id,
      domainId: edtechDomain.id,
      description: "In-progress EdTech platform — not yet published.",
      isFlagship: false,
      clientVisibility: "PUBLIC",
      contentStatus: "DRAFT",
    },
  });

  // --- Experience ---
  // Drives the homepage LedgerHero's "years building" figure (real data,
  // never hardcoded — Design System §7). No natural unique key on
  // Experience, so this is a find-then-create rather than an upsert, kept
  // idempotent by checking first.
  const hasExperience = await prisma.experience.findFirst();
  if (!hasExperience) {
    await prisma.experience.create({
      data: {
        title: "Founder & Principal Engineer",
        organization: "KSDRILL-SA",
        startDate: new Date("2025-01-01"),
        description: "Full-stack and AI systems engineering across fintech, GovTech, and enterprise automation.",
      },
    });
  }

  // --- Feature flags — all Tier 2 agent tools and V1.1 capabilities ship disabled (BR-4.4) ---
  await Promise.all(
    [
      "agent.search_systems",
      "agent.tailor_cv",
      "agent.check_availability",
      "agent.submit_inquiry",
      "concierge.enabled",
      "admin_copilot.enabled",
      "public_api.enabled",
    ].map((key) =>
      prisma.flag.upsert({
        where: { key },
        update: {},
        create: { key, enabled: false },
      })
    )
  );

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
