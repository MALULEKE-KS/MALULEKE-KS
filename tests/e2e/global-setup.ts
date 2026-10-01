// tests/e2e/global-setup.ts
// Before the end-to-end suite: a published "stress" system with everything that
// has broken a phone layout before — long unbroken words and links, very long
// commit messages, a full year of weekly activity, a wide table and long code in
// its write-up, many technologies and topics. The case studies broke on
// production (2026-10-01) because the test database had no commits; the suite
// now always has content as hostile as real data. Idempotent; it writes only to
// the database the dev server under test uses (CI's test database, or the local
// dev database — never production: the same guard as vitest.config.mts).

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const SLUG = "e2e-stress";
const OWNER = "e2e-stress-owner";
const LONG = "Averyveryverylongunbrokenidentifierthatwouldstretchanynarrowcolumnpastthescreenedge";

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) loadEnv({ path: path.resolve(process.cwd(), ".env.development.local") });
  const url = process.env.DATABASE_URL;
  if (!url) return; // no database: the suite runs against whatever data exists
  if (!process.env.CI && !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)) {
    throw new Error("Refusing to seed e2e fixtures into a non-local database.");
  }

  const db = new PrismaClient();
  try {
    const org = await db.organization.upsert({
      where: { slug: "e2e-stress-studio" },
      create: { name: "E2E Stress Studio", slug: "e2e-stress-studio", githubLogins: [OWNER] },
      update: {},
    });
    const status = await db.status.findFirstOrThrow({ where: { key: { in: ["on_github", "finished", "planned"] } } });

    const body = [
      "## The problem",
      "",
      `A paragraph with an unbroken identifier \`${LONG}\` and a bare link https://example.com/${LONG}/${LONG}.`,
      "",
      "## How it works",
      "",
      "| Component | Responsibility | Runs on | Notes |",
      "|---|---|---|---|",
      `| ${LONG} | Handles the long things | Vercel Fluid Compute | ${LONG} |`,
      "",
      "```ts",
      `export const ${LONG} = await fetch("https://example.com/${LONG}").then((r) => r.json()); // a very long line of code`,
      "```",
    ].join("\n");

    const existing = await db.system.findUnique({ where: { slug: SLUG } });
    const system =
      existing ??
      (await db.system.create({
        data: {
          name: "E2E Stress System With A Deliberately Long Name",
          slug: SLUG,
          description: `A system whose description contains ${LONG} to prove nothing widens the page.`,
          organizationId: org.id,
          statusId: status.id,
          liveUrl: "https://example.com",
          githubFullName: `${OWNER}/${SLUG}`,
          githubOwnerLogin: OWNER,
          githubRepoId: 2_000_000_001,
          repoPrivate: false,
          githubTopics: ["observability", "event-sourcing", "infrastructure-as-code", LONG.slice(0, 40), "postgresql", "typescript"],
          githubLanguages: { TypeScript: 60000, PLpgSQL: 20000, Python: 9000, Shell: 3000, Dockerfile: 800 },
          techStack: ["Next.js", "React", "TypeScript", "PostgreSQL", "Prisma", "Tailwind CSS", "Redis", "Vercel", "Docker", "GitHub Actions"],
          caseStudyBody: body,
          onCv: true,
        },
      }));
    if (system.contentStatus !== "PUBLISHED" || !system.onCv) await db.system.update({ where: { id: system.id }, data: { contentStatus: "PUBLISHED", onCv: true } });

    // A full year of activity, every week busy.
    const monday = new Date();
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    for (let i = 0; i < 52; i++) {
      const weekStart = new Date(monday.getTime() - i * 7 * 86_400_000);
      await db.systemActivityWeek.upsert({
        where: { systemId_weekStart: { systemId: system.id, weekStart } },
        create: { systemId: system.id, weekStart, commits: 5 + ((i * 7) % 23) },
        update: {},
      });
    }

    // Recent commits with messages far longer than any screen.
    for (let i = 0; i < 8; i++) {
      await db.repoCommit.upsert({
        where: { systemId_sha: { systemId: system.id, sha: `e2e${i}`.padEnd(40, "0") } },
        create: {
          systemId: system.id,
          sha: `e2e${i}`.padEnd(40, "0"),
          message: `feat(${LONG}): ${LONG} ${i} — a commit message that goes on far longer than any phone is wide`,
          committedAt: new Date(Date.now() - i * 86_400_000),
        },
        update: { committedAt: new Date(Date.now() - i * 86_400_000) },
      });
    }
  } finally {
    await db.$disconnect();
  }
}
