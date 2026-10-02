// lib/queries/journey.ts
// /journey — the one dated log (PAGE-SPECIFICATIONS "/journey"; PAGE-BUILD-
// PLAYBOOK §9: "never empty"). It reads every public, dated fact the site
// already holds and lays them on one line, newest first:
//   milestones   PublicTimeline (the owner's entries, typed by MilestoneType)
//   roles        PublicExperience — starting, and leaving
//   study        PublicEducation — starting, finishing, or expected (ahead)
//   achievements PublicAchievement
//   shipped      SystemPace.shippedAt of a published system
//   started      the first commit date of a published system's public repo
// Nothing is invented: an event exists only when its date does. A system the
// owner already wrote a milestone for isn't announced twice. Only public
// views (BR-1.x masking already applied) — private repos never appear.

import { cache } from "react";
import { dbPublic as db } from "@/lib/db";
import { getSystemPace } from "@/lib/queries/evidence";

export type JourneyKind = "milestone" | "role" | "study" | "achievement" | "shipped" | "started";

export interface JourneyEvent {
  id: string; // stable anchor: #entry-<id> (instant search links here)
  date: Date;
  kind: JourneyKind;
  /** The milestone type for milestones (a lookup), otherwise the kind's own label. */
  label: string;
  /** The filter this event belongs to: a milestone type key, or the kind. */
  filter: string;
  title: string;
  detail: string | null;
  tags: string[];
  href: string | null;
  /** Dated in the future — an expected graduation, never a guess. */
  ahead: boolean;
}

export const KIND_LABEL: Record<Exclude<JourneyKind, "milestone">, string> = {
  role: "Role",
  study: "Study",
  achievement: "Achievement",
  shipped: "Shipped",
  started: "Started building",
};

export const getJourney = cache(async () => {
  const [timeline, experience, education, achievements, systems, repos, types] = await Promise.all([
    db.publicTimeline.findMany({ orderBy: [{ date: "desc" }, { title: "asc" }] }),
    db.publicExperience.findMany(),
    db.publicEducation.findMany(),
    db.publicAchievement.findMany(),
    db.publicSystem.findMany({ select: { id: true, slug: true, name: true, stage: true } }),
    db.publicGithubRepo.findMany({ where: { published: true, slug: { not: null } }, select: { slug: true, createdAt: true, fullName: true } }),
    db.milestoneType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);
  const pace = await getSystemPace(systems.map((s) => s.id));
  const now = new Date();
  const events: JourneyEvent[] = [];

  for (const t of timeline) {
    events.push({
      id: t.id,
      date: t.date,
      kind: "milestone",
      label: t.milestoneTypeLabel,
      filter: t.milestoneType,
      title: t.title,
      detail: t.description,
      tags: t.tags,
      href: t.systemSlug ? `/systems/${t.systemSlug}` : null,
      ahead: t.date > now,
    });
  }

  for (const e of experience) {
    events.push({ id: `role-${e.id}`, date: e.startDate, kind: "role", label: KIND_LABEL.role, filter: "role", title: `${e.title}, ${e.organization}`, detail: e.description, tags: e.skills.slice(0, 6), href: null, ahead: false });
    if (e.endDate && e.endDate <= now) {
      events.push({ id: `role-end-${e.id}`, date: e.endDate, kind: "role", label: KIND_LABEL.role, filter: "role", title: `Moved on from ${e.organization}`, detail: null, tags: [], href: null, ahead: false });
    }
  }

  for (const ed of education) {
    const what = ed.fieldOfStudy ? `${ed.qualification} — ${ed.fieldOfStudy}` : ed.qualification;
    events.push({ id: `study-${ed.id}`, date: ed.startDate, kind: "study", label: KIND_LABEL.study, filter: "study", title: `Began ${what}, ${ed.institution}`, detail: ed.description, tags: ed.skills.slice(0, 6), href: null, ahead: false });
    const end = ed.endDate ?? ed.expectedGraduation;
    if (end) {
      const ahead = end > now;
      events.push({
        id: `study-end-${ed.id}`,
        date: end,
        kind: "study",
        label: ahead ? "Expected" : KIND_LABEL.study,
        filter: "study",
        title: ahead ? `Expected to complete ${ed.qualification}` : `Completed ${ed.qualification}${ed.honors ? ` (${ed.honors})` : ""}`,
        detail: null,
        tags: [],
        href: ed.certificateUrl && !ahead ? ed.certificateUrl : null,
        ahead,
      });
    }
  }

  for (const a of achievements) {
    events.push({ id: `achievement-${a.id}`, date: a.achievedOn, kind: "achievement", label: KIND_LABEL.achievement, filter: "achievement", title: a.issuer ? `${a.title} — ${a.issuer}` : a.title, detail: a.description, tags: [], href: a.systemSlug ? `/systems/${a.systemSlug}` : a.url, ahead: false });
  }

  // A system the owner already wrote a milestone for (BR-1.x auto-drafted first ship) isn't announced twice.
  const told = new Set(timeline.map((t) => t.systemSlug).filter(Boolean));
  const bySlug = new Map(systems.map((s) => [s.slug, s]));
  for (const p of pace) {
    const s = systems.find((x) => x.id === p.systemId);
    if (!s || !p.shippedAt || told.has(s.slug)) continue;
    events.push({ id: `shipped-${s.slug}`, date: p.shippedAt, kind: "shipped", label: KIND_LABEL.shipped, filter: "shipped", title: `Shipped ${s.name}`, detail: null, tags: [], href: `/systems/${s.slug}`, ahead: false });
  }
  for (const r of repos) {
    const s = r.slug ? bySlug.get(r.slug) : undefined;
    if (!s || !r.createdAt) continue;
    events.push({ id: `started-${s.slug}`, date: r.createdAt, kind: "started", label: KIND_LABEL.started, filter: "started", title: `Started ${s.name}`, detail: null, tags: [], href: `/systems/${s.slug}`, ahead: false });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title));

  // Filters: each milestone type in use, then each derived kind in use — never an empty chip.
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.filter, (counts.get(e.filter) ?? 0) + 1);
  const filters = [
    ...types.filter((t) => counts.has(t.key)).map((t) => ({ key: t.key, label: t.label, count: counts.get(t.key)! })),
    ...(["role", "study", "achievement", "shipped", "started"] as const).filter((k) => counts.has(k)).map((k) => ({ key: k, label: KIND_LABEL[k], count: counts.get(k)! })),
  ];

  return { events, filters };
});
