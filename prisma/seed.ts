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
  // so a new admin-added Status doesn't require a code change (EXT-1).
  await Promise.all(
    [
      { key: "finished", label: "Finished", colorToken: "signal-finished" },
      { key: "in_progress", label: "In Progress", colorToken: "signal-progress" },
      { key: "planned", label: "Planned", colorToken: "signal-planned" },
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
  await Promise.all(
    [
      { key: "education", label: "Education" },
      { key: "job", label: "Job" },
      { key: "launch", label: "Launch" },
      { key: "achievement", label: "Achievement" },
      { key: "personal", label: "Personal" },
    ].map((m) =>
      prisma.milestoneType.upsert({ where: { key: m.key }, update: {}, create: m })
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
