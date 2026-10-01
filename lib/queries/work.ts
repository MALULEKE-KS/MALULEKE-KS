// lib/queries/work.ts
// Home — selected work (PUBLIC-REDESIGN-PLAN §3.3): the admin's homepage
// picks, each with its impact figures, its GitHub facts (languages, recent
// commits, last push) and its weekly activity, plus "Now building" — the
// owner's most recently active public repo and its latest commits. All read
// through the public role (F1.8): published systems, public repos, counts.

import { dbPublic } from "@/lib/db";
import { getPrioritySystems } from "@/lib/queries/homepage";

const WEEKS = 26;
const DAY = 86_400_000;

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" — computed per request. */
export function ago(date: Date | null, now = new Date()): string | null {
  if (!date) return null;
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** The Monday (UTC) of the week containing `date`, as YYYY-MM-DD. */
function monday(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** The last WEEKS weeks as a dense series (missing weeks are zero). */
function series(rows: { weekStart: Date; commits: number }[], now: Date): number[] {
  const byWeek = new Map(rows.map((r) => [r.weekStart.toISOString().slice(0, 10), r.commits]));
  const start = monday(now);
  return Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(start.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    return byWeek.get(d.toISOString().slice(0, 10)) ?? 0;
  });
}

export async function getSelectedWork(limit = 4) {
  const now = new Date();
  const systems = await getPrioritySystems(limit);
  const ids = systems.map((s) => s.id);
  const slugs = systems.map((s) => s.slug);

  const [impacts, repos, activity, active] = await Promise.all([
    dbPublic.publicImpact.findMany({ where: { systemId: { in: ids } }, orderBy: { sortOrder: "asc" } }),
    dbPublic.publicGithubRepo.findMany({ where: { slug: { in: slugs } } }),
    dbPublic.publicSystemActivity.findMany({ where: { slug: { in: slugs } } }),
    // Now building: the most recently pushed public repo that moved in the last 30 days.
    dbPublic.publicGithubRepo.findFirst({
      where: { pushedAt: { gte: new Date(now.getTime() - 30 * DAY) } },
      orderBy: { pushedAt: "desc" },
    }),
  ]);

  const work = systems.map((s) => {
    const repo = repos.find((r) => r.slug === s.slug);
    const weeks = series(activity.filter((a) => a.slug === s.slug), now);
    const languages = Object.entries((repo?.languages ?? {}) as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    return {
      ...s,
      impacts: impacts.filter((i) => i.systemId === s.id).slice(0, 3).map((i) => ({ label: i.label, value: i.value })),
      weeks,
      commitsLast4Weeks: weeks.slice(-4).reduce((a, b) => a + b, 0),
      lastPush: ago(repo?.pushedAt ?? null, now),
      languages,
    };
  });

  let nowBuilding = null;
  if (active) {
    const commits = await dbPublic.publicRepoCommit.findMany({ where: { fullName: active.fullName }, orderBy: { committedAt: "desc" }, take: 5 });
    nowBuilding = {
      name: active.name,
      fullName: active.fullName,
      home: active.home,
      url: active.published && active.slug ? `/systems/${active.slug}` : `https://github.com/${active.fullName}`,
      onSite: Boolean(active.published && active.slug),
      lastPush: ago(active.pushedAt, now),
      commitsLast4Weeks: active.commitsLast4Weeks,
      commits: commits.map((c) => ({ message: c.message, when: ago(c.committedAt, now), key: `${c.committedAt.toISOString()}:${c.message.slice(0, 24)}` })),
    };
  }

  return { work, nowBuilding };
}

export type SelectedWork = Awaited<ReturnType<typeof getSelectedWork>>;
