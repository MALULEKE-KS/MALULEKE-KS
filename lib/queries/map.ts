// lib/queries/map.ts
// Home — the system map (PUBLIC-REDESIGN-PLAN §3.4): the owner's GitHub homes
// → the work in each (published systems, and public repos not yet written up)
// → the technologies that work is built with. Everything is data:
//   homes        PublicHome (+ PublicSystemHome for which system is where)
//   systems      PublicSystem — published only
//   technologies the curated stack (System.techStack) and skills (SkillEvidence)
//                of each system, plus each public repo's GitHub languages
//   repos        PublicGithubRepo — public, in his own homes, not client work
// Read through the public role (F1.8).

import { dbPublic } from "@/lib/db";
import { getPublicHomes } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";

/** Public repos shown per home beside its systems; the rest are counted. */
const REPOS_PER_HOME = 4;
/** Technologies shown: the most used across the work on the map. */
const TECH_SHOWN = 10;
const LANGS_PER_REPO = 3;

export type MapNodeKind = "home" | "work" | "tech";

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  label: string;
  sub?: string;
  href?: string;
  external?: boolean;
  /** Public repo not yet written up on the site — drawn lighter. */
  faint?: boolean;
  /** Status colour token for a published system. */
  colorToken?: string;
}

export interface SystemMapData {
  homes: MapNode[];
  work: MapNode[];
  tech: MapNode[];
  edges: [string, string][];
}

const topLanguages = (languages: unknown, n: number) =>
  Object.entries((languages ?? {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);

export async function getSystemMap(): Promise<SystemMapData | null> {
  const [homes, systems, skills, repos] = await Promise.all([
    getPublicHomes(),
    dbPublic.publicSystem.findMany({ select: { slug: true, name: true, status: true, statusColorToken: true, techStack: true } }),
    getSkillEvidence(),
    dbPublic.publicGithubRepo.findMany({ orderBy: [{ pushedAt: { sort: "desc", nulls: "last" } }] }),
  ]);
  if (homes.length === 0) return null;

  const homeNodes: MapNode[] = [];
  const work: MapNode[] = [];
  const edges: [string, string][] = [];
  // Technologies each work node uses, keyed case-insensitively (first spelling wins).
  const techOf = new Map<string, string[]>();
  const spelling = new Map<string, string>();
  const addTech = (workId: string, names: string[]) => {
    const keys = [...new Set(names.map((n) => n.trim()).filter(Boolean).map((n) => {
      const k = n.toLowerCase();
      if (!spelling.has(k)) spelling.set(k, n);
      return k;
    }))];
    techOf.set(workId, keys);
  };

  for (const h of homes) {
    const homeId = `home:${h.slug}`;
    const own = h.systems.map((slug) => systems.find((s) => s.slug === slug)).filter((s) => s !== undefined);
    const homeRepos = repos.filter((r) => r.homeSlug === h.slug && !r.published);
    const shownRepos = homeRepos.slice(0, REPOS_PER_HOME);
    const moreRepos = homeRepos.length - shownRepos.length;

    homeNodes.push({
      id: homeId,
      kind: "home",
      label: h.name,
      sub: [
        h.kind === "personal" ? "Personal" : h.kind === "venture" ? "Venture" : h.kind === "client" ? "Client" : null,
        own.length ? `${own.length} on this site` : null,
        homeRepos.length ? `${homeRepos.length} public repo${homeRepos.length === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: h.github[0]?.url,
      external: true,
    });

    for (const s of own) {
      const id = `sys:${s.slug}`;
      work.push({ id, kind: "work", label: s.name, sub: s.status, href: `/systems/${s.slug}`, colorToken: s.statusColorToken });
      edges.push([homeId, id]);
      const publicRepo = repos.find((r) => r.slug === s.slug);
      addTech(id, [
        ...s.techStack,
        ...skills.filter((k) => k.systemSlugs.includes(s.slug)).map((k) => k.name),
        ...topLanguages(publicRepo?.languages, LANGS_PER_REPO),
      ]);
    }
    for (const r of shownRepos) {
      const id = `repo:${r.fullName}`;
      work.push({ id, kind: "work", label: r.name, sub: "On GitHub", href: `https://github.com/${r.fullName}`, external: true, faint: true });
      edges.push([homeId, id]);
      addTech(id, topLanguages(r.languages, LANGS_PER_REPO));
    }
    if (moreRepos > 0 && h.github[0]) {
      const id = `more:${h.slug}`;
      work.push({ id, kind: "work", label: `+${moreRepos} more on GitHub`, href: h.github[0].url, external: true, faint: true });
      edges.push([homeId, id]);
    }
  }

  // The most used technologies across the map.
  const counts = new Map<string, number>();
  for (const keys of techOf.values()) for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  const shown = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TECH_SHOWN);
  const tech: MapNode[] = shown.map(([k, n]) => ({ id: `tech:${k}`, kind: "tech", label: spelling.get(k) ?? k, sub: `${n} ${n === 1 ? "project" : "projects"}` }));
  const shownKeys = new Set(shown.map(([k]) => k));
  for (const [workId, keys] of techOf) for (const k of keys) if (shownKeys.has(k)) edges.push([workId, `tech:${k}`]);

  if (work.length === 0) return null;
  return { homes: homeNodes, work, tech, edges };
}
