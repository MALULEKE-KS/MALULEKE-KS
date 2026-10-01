// lib/queries/case-study.ts
// /systems/[slug] — the case study as an engineering dossier (PAGE-BUILD-PLAYBOOK
// §9, PUBLIC-REDESIGN-PLAN §2): one system from problem to proof. Everything
// comes from the public views — the system (PublicSystem, impacts, permitted
// testimonials), its GitHub facts (PublicGithubRepo: public repos only — a
// private repo's README, languages and commits are never read), its weekly
// activity (PublicSystemActivity), its recent commits (PublicRepoCommit), the
// skills it proves (SkillEvidence) and its pace (SystemPace).
//
// Most systems are synced repos with no written case study yet, so the page
// leans on what GitHub proves — and says plainly where a write-up comes from.

import { dbPublic } from "@/lib/db";
import { getCatalog } from "@/lib/queries/catalog";
import { getSkillEvidence, getSystemPace } from "@/lib/queries/evidence";
import { getPublicSystemBySlug } from "@/lib/queries/systems";
import { ago } from "@/lib/queries/work";

const COMMITS_SHOWN = 8;
const RELATED = 3;

/** A commit message's first line — the rest is detail the feed doesn't need. */
export function commitTitle(message: string): string {
  return message.split("\n")[0]!.trim().slice(0, 140);
}

/** Bytes per language → shares that add up to 100, largest first; slivers fold into "Other". */
export function languageShares(languages: Record<string, number>, min = 2): { name: string; share: number }[] {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const raw = Object.entries(languages)
    .map(([name, bytes]) => ({ name, share: (bytes / total) * 100 }))
    .sort((a, b) => b.share - a.share);
  const kept = raw.filter((l) => l.share >= min);
  const other = raw.filter((l) => l.share < min).reduce((a, l) => a + l.share, 0);
  const rows = other > 0 ? [...kept, { name: "Other", share: other }] : kept;
  return rows.map((l) => ({ name: l.name, share: Math.round(l.share * 10) / 10 }));
}

export async function getCaseStudy(slug: string) {
  const system = await getPublicSystemBySlug(slug);
  if (!system) return null;
  const now = new Date();

  const [catalog, repo, skills, [pace]] = await Promise.all([
    getCatalog({ pageSize: 1000 }),
    dbPublic.publicGithubRepo.findFirst({ where: { slug, published: true } }),
    getSkillEvidence(),
    getSystemPace([system.id]),
  ]);
  const commits = repo
    ? await dbPublic.publicRepoCommit.findMany({ where: { fullName: repo.fullName }, orderBy: { committedAt: "desc" }, take: COMMITS_SHOWN })
    : [];

  const row = catalog.systems.find((s) => s.slug === slug) ?? null;
  const home = catalog.homes.find((h) => h.slug === row?.homeSlug) ?? null;

  // Related work: the same domain, then the same home, then a shared technology.
  const others = catalog.systems.filter((s) => s.slug !== slug);
  const shared = (s: (typeof others)[number]) => s.tech.filter((t) => row?.tech.some((u) => u.toLowerCase() === t.toLowerCase())).length;
  const related = [
    ...others.filter((s) => system.domain && s.domain === system.domain),
    ...others.filter((s) => row?.homeSlug && s.homeSlug === row.homeSlug),
    ...others.filter((s) => shared(s) > 0).sort((a, b) => shared(b) - shared(a)),
  ].filter((s, i, all) => all.findIndex((x) => x.slug === s.slug) === i);

  const written = system.caseStudyBody.trim();
  const readme = repo?.readmeExcerpt?.trim() ?? "";

  return {
    system,
    home: home ? { name: home.name, role: home.role } : null,
    tech: row?.tech ?? system.techStack,
    weeks: row?.weeks ?? [],
    commitsLast4Weeks: row?.commitsLast4Weeks ?? 0,
    // What the page says the system is, and where that comes from — never both.
    writeUp: written
      ? {
          source: "case-study" as const,
          markdown: written,
          // BR-4.5: written by AI from the repo — labelled as such on the page.
          byAi: system.caseStudyAuthor === "ai",
          writtenAgo: system.caseStudyWrittenAt ? ago(new Date(system.caseStudyWrittenAt), now) : null,
        }
      : readme
        ? { source: "readme" as const, text: readme }
        : null,
    repo: repo
      ? {
          fullName: repo.fullName,
          url: `https://github.com/${repo.fullName}`,
          languages: languageShares((repo.languages ?? {}) as Record<string, number>),
          topics: repo.topics,
          stars: repo.stars,
          createdAt: repo.createdAt,
          started: repo.createdAt ? repo.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : null,
          lastPush: ago(repo.pushedAt, now),
          commitsLastYear: repo.commitsLastYear,
        }
      : null,
    commits: commits.map((c) => ({ title: commitTitle(c.message), when: ago(c.committedAt, now), at: c.committedAt.toISOString() })),
    skills: skills
      .filter((s) => s.systemSlugs.includes(slug))
      .map((s) => ({ name: s.name, systems: s.systemCount, roles: s.roleCount })),
    shipped: pace?.shippedAt
      ? { on: pace.shippedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), days: pace.daysToShip }
      : null,
    related: related.slice(0, RELATED),
  };
}

export type CaseStudy = NonNullable<Awaited<ReturnType<typeof getCaseStudy>>>;
