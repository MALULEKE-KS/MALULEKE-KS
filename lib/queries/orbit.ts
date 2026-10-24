// lib/queries/orbit.ts
// Home — the Orbit (D-069): every published system around the platform's core, one ring per
// GitHub home, each world's mass its commits over the last 26 weeks, and those weeks replayed as
// sparks. All of it read through the public role (F1.8): PublicSystem (published only, every mask
// applied), PublicHome + PublicSystemHome (which home holds which system) and PublicSystemActivity
// (weekly counts). A system in no home is left out rather than placed on a ring it doesn't belong to.

import { dbPublic } from "@/lib/db";
import { getPublicHomes } from "@/lib/queries/profile";
import { monday, series, WEEKS } from "@/lib/queries/work";

export interface OrbitSystem {
  name: string;
  slug: string;
  status: string;
  flagship: boolean;
  /** Index into `homes`: the ring it orbits on. */
  home: number;
  stack: string[];
  /** What it achieved ("flagship-outcomes") for a flagship, otherwise its own description. */
  line: string;
  /** Commits per week, oldest first, aligned with `weeks`. */
  weeks: number[];
}

export interface OrbitData {
  homes: string[];
  /** The core is the owner's GitHub (D-073): his own home's first account, or null. */
  github: string | null;
  /** The Monday of each week, oldest first (YYYY-MM-DD). */
  weeks: string[];
  systems: OrbitSystem[];
}

export async function getOrbit(
  outcomes: Record<string, string>,
  now = new Date()
): Promise<OrbitData | null> {
  const [homes, systems, activity] = await Promise.all([
    getPublicHomes(),
    dbPublic.publicSystem.findMany({
      select: {
        slug: true,
        name: true,
        status: true,
        isFlagship: true,
        techStack: true,
        description: true,
      },
    }),
    dbPublic.publicSystemActivity.findMany(),
  ]);
  // Rings for the homes that hold published work, in the homes' own order (personal first).
  const used = homes.filter((h) => h.systems.length > 0);
  if (used.length === 0) return null;
  const homeOf = new Map<string, number>();
  used.forEach((h, i) => h.systems.forEach((slug) => homeOf.has(slug) || homeOf.set(slug, i)));

  const out: OrbitSystem[] = [];
  for (const s of systems) {
    const home = homeOf.get(s.slug);
    if (home === undefined) continue;
    out.push({
      name: s.name,
      slug: s.slug,
      status: s.status,
      flagship: s.isFlagship,
      home,
      stack: s.techStack,
      line: (s.isFlagship && outcomes[s.slug]?.trim()) || s.description,
      weeks: series(
        activity.filter((a) => a.slug === s.slug),
        now
      ),
    });
  }
  if (out.length === 0) return null;
  // Flagships first, then each home's systems, busiest first — the order the panel steps through.
  const total = (s: OrbitSystem) => s.weeks.reduce((a, b) => a + b, 0);
  out.sort(
    (a, b) =>
      Number(b.flagship) - Number(a.flagship) ||
      a.home - b.home ||
      total(b) - total(a) ||
      a.name.localeCompare(b.name)
  );

  const start = monday(now);
  const weeks = Array.from({ length: WEEKS }, (_, i) =>
    new Date(start.getTime() - (WEEKS - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10)
  );
  const personal = homes.find((h) => h.kind === "personal") ?? homes[0];
  return { homes: used.map((h) => h.name), github: personal?.github[0]?.url ?? null, weeks, systems: out };
}
