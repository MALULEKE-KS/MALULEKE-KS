// lib/queries/journey.ts
// /journey — the owner's life and career in chapters (owner, 2026-10-02:
// "the journey is about me and my life since day one", not his
// repositories). The chapters are his content block ("journey": years, place,
// a paragraph each, and what's next); inside each, the dated facts that fall
// in its years — his milestones (PublicTimeline, shown only as precisely as
// they're known), his roles and his study. No GitHub entries: the systems
// live on /systems. Only public views.

import { cache } from "react";
import { dbPublic as db } from "@/lib/db";
import { getContentBlock } from "@/lib/content/blocks";

export interface JourneyMoment {
  id: string; // #entry-<id> — instant search lands here
  date: Date;
  precision: "day" | "month" | "year";
  label: string;
  title: string;
  detail: string | null;
  href: string | null;
  ahead: boolean;
}

export interface JourneyChapter {
  id: string;
  from: number;
  to: number | null;
  title: string;
  place: string | null;
  body: string;
  moments: JourneyMoment[];
  /** The chapter that includes this year. */
  current: boolean;
}

export const getJourney = cache(async () => {
  const [block, timeline, experience] = await Promise.all([
    getContentBlock("journey"),
    db.publicTimeline.findMany({ orderBy: [{ date: "asc" }, { title: "asc" }] }),
    db.publicExperience.findMany({ orderBy: { startDate: "asc" } }),
  ]);
  if (!block) return null;
  const now = new Date();
  const thisYear = now.getUTCFullYear();

  const moments: JourneyMoment[] = [
    ...timeline.map((t) => ({
      id: t.id,
      date: t.date,
      precision: (t.datePrecision as JourneyMoment["precision"]) ?? "day",
      label: t.milestoneTypeLabel,
      title: t.title,
      detail: t.description,
      href: t.systemSlug ? `/systems/${t.systemSlug}` : null,
      ahead: t.date > now,
    })),
    ...experience.map((e) => ({ id: `role-${e.id}`, date: e.startDate, precision: "month" as const, label: "Role", title: `${e.title}, ${e.organization}`, detail: null, href: null, ahead: false })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Each fact goes in the latest chapter that covers its year — chapters can overlap (study and companies run side by side).
  const chapters: JourneyChapter[] = block.chapters.map((c) => ({ ...c, place: c.place ?? null, moments: [], current: c.from <= thisYear && (c.to === null || c.to >= thisYear) }));
  const ahead: JourneyMoment[] = [];
  // A fact no chapter covers (a gap, or before the first) goes to the nearest one —
  // never dropped, so every milestone search can land on is on the page.
  const distance = (c: JourneyChapter, y: number) => (y < c.from ? c.from - y : c.to !== null && y > c.to ? y - c.to : 0);
  for (const m of moments) {
    const y = m.date.getUTCFullYear();
    if (m.ahead && block.ahead) {
      ahead.push(m);
      continue;
    }
    const covering = [...chapters].reverse().find((c) => distance(c, y) === 0);
    const home = covering ?? [...chapters].sort((a, b) => distance(a, y) - distance(b, y))[0];
    home?.moments.push(m);
  }

  const first = Math.min(...chapters.map((c) => c.from));
  const last = Math.max(thisYear, ...ahead.map((m) => m.date.getUTCFullYear()));
  // Whole months until the first moment ahead (e.g. the expected graduation) — the page's countdown.
  const nextAhead = ahead[0] ?? null;
  // Only when the date is known to the month or day — a year-only date has no honest countdown.
  const monthsToNext = nextAhead && nextAhead.precision !== "year" ? Math.max(0, Math.round((nextAhead.date.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000))) : null;
  return {
    headline: block.headline,
    lede: block.lede,
    chapters,
    ahead: block.ahead ? { ...block.ahead, moments: ahead, monthsToNext } : null,
    span: { first, last, now: thisYear },
  };
});
