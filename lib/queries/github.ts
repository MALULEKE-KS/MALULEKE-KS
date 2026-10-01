// lib/queries/github.ts
// The owner's public GitHub work as visitors (and the AI guide) may see it
// (F5c): public repos in his own homes — never private, archived or
// client-restricted (PublicGithubRepo) — and their last 90 days of commits
// (PublicRepoCommit). Read through the public role (F1.8).

import { dbPublic } from "@/lib/db";

export async function getPublicGithubRepos() {
  const rows = await dbPublic.publicGithubRepo.findMany({ orderBy: [{ pushedAt: { sort: "desc", nulls: "last" } }, { fullName: "asc" }] });
  return rows.map((r) => ({
    fullName: r.fullName,
    name: r.name,
    home: r.home,
    homeSlug: r.homeSlug,
    url: `https://github.com/${r.fullName}`,
    // The case study on this site, when there is one.
    systemPath: r.published && r.slug ? `/systems/${r.slug}` : null,
    description: r.description,
    languages: (r.languages ?? {}) as Record<string, number>,
    topics: r.topics,
    stars: r.stars,
    createdAt: r.createdAt?.toISOString() ?? null,
    pushedAt: r.pushedAt?.toISOString() ?? null,
    readmeExcerpt: r.readmeExcerpt,
    commitsLast4Weeks: r.commitsLast4Weeks,
    commitsLastYear: r.commitsLastYear,
  }));
}

export async function getPublicRepoCommits(limit = 100) {
  const rows = await dbPublic.publicRepoCommit.findMany({ orderBy: { committedAt: "desc" }, take: Math.min(Math.max(limit, 1), 400) });
  return rows.map((c) => ({ repo: c.fullName, message: c.message, committedAt: c.committedAt.toISOString() }));
}
