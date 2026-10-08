// lib/guide/show-tools.ts
// The AI guide's card tools (docs/AI-GUIDE-PHASE1-PLAN.md §7): read-only and
// server-executed. The model only chooses *which* records — a system's slug, a
// span of years, a skill's name — and everything a card shows is read here
// from the public views (F1.8), so a card can never say what the data
// doesn't. Unknown slugs and names are dropped, never guessed. Each tool sits
// behind its own flag (BR-4.4), and the browser never supplies their results
// (BR-4.6 — lib/guide/request.ts drops them from the history).

import { dbPublic } from "@/lib/db";
import { getJourney } from "@/lib/queries/journey";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { getPlatformPulse } from "@/lib/queries/profile";

export interface SystemCardData {
  slug: string;
  name: string;
  organization: string;
  status: string;
  statusColorToken: string;
  description: string;
  tech: string[];
  repoPrivate: boolean;
  /** Last push to its repo, ISO — null when unknown or private. */
  lastActivity: string | null;
  href: string;
}

export interface JourneyCardData {
  from: number;
  to: number;
  moments: { id: string; label: string; title: string; when: string; href: string | null; ahead: boolean }[];
}

export interface SkillCardData {
  name: string;
  systems: { slug: string; name: string }[];
}

export interface PulseCardData {
  rulesEnforcedByDatabase: number;
  auditEventsLast7Days: number;
  auditEventsTotal: number;
  lastGithubSyncAt: string | null;
}

const MAX_SYSTEMS = 4;
const MAX_MOMENTS = 6;
const MAX_SKILLS = 6;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The systems asked for, in the order asked, as they are on the site right now. */
export async function showSystems(slugs: string[]): Promise<SystemCardData[]> {
  const wanted = [...new Set(slugs)].slice(0, MAX_SYSTEMS);
  if (wanted.length === 0) return [];
  const rows = await dbPublic.publicSystem.findMany({ where: { slug: { in: wanted } } });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return wanted.flatMap((slug) => {
    const r = bySlug.get(slug);
    if (!r) return [];
    return [
      {
        slug: r.slug,
        name: r.name,
        organization: r.organization,
        status: r.status,
        statusColorToken: r.statusColorToken,
        description: clip(r.description, 180),
        tech: r.techStack.slice(0, 6),
        repoPrivate: r.repoPrivate,
        lastActivity: r.repoPrivate ? null : (r.githubPushedAt?.toISOString() ?? null),
        href: `/systems/${r.slug}`,
      },
    ];
  });
}

/** The journey's moments within a span of years (inclusive), oldest first. */
export async function showJourney(from: number, to: number): Promise<JourneyCardData | null> {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const journey = await getJourney();
  if (!journey) return null;
  const moments = journey.chapters
    .flatMap((c) => c.moments)
    .filter((m) => {
      const y = m.date.getUTCFullYear();
      return y >= lo && y <= hi;
    })
    .slice(-MAX_MOMENTS)
    .map((m) => ({
      id: m.id,
      label: m.label,
      title: m.title,
      when: m.precision === "year" ? String(m.date.getUTCFullYear()) : m.date.toISOString().slice(0, m.precision === "month" ? 7 : 10),
      href: m.href ?? `/journey#entry-${m.id}`,
      ahead: m.ahead,
    }));
  return moments.length > 0 ? { from: lo, to: hi, moments } : null;
}

/** Skills by name (any case), each with the published systems that prove it. */
export async function showSkills(names: string[]): Promise<SkillCardData[]> {
  const wanted = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_SKILLS);
  if (wanted.length === 0) return [];
  const evidence = await getSkillEvidence();
  const found = wanted.flatMap((w) => evidence.filter((e) => e.name.toLowerCase() === w).slice(0, 1));
  const slugs = [...new Set(found.flatMap((e) => e.systemSlugs))];
  const systems = slugs.length ? await dbPublic.publicSystem.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } }) : [];
  const nameOf = new Map(systems.map((s) => [s.slug, s.name]));
  return found.map((e) => ({
    name: e.name,
    // Only systems a visitor can open — a slug the public view doesn't have is left out.
    systems: e.systemSlugs.flatMap((slug) => (nameOf.has(slug) ? [{ slug, name: nameOf.get(slug)! }] : [])),
  }));
}

/** This site right now: rules the database enforces, audited changes, the last GitHub sync. */
export async function showPulse(): Promise<PulseCardData> {
  const p = await getPlatformPulse();
  return {
    rulesEnforcedByDatabase: p.rulesEnforcedByDatabase,
    auditEventsLast7Days: p.auditEventsLast7Days,
    auditEventsTotal: p.auditEventsTotal,
    lastGithubSyncAt: p.lastGithubSyncAt,
  };
}
