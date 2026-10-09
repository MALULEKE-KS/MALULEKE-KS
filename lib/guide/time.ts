// lib/guide/time.ts
// Time the way the guide should say it (docs/AI-GUIDE-PHASE2-PLAN.md §4 B1):
// computed here, in code, from real dates — "pushed 3 days ago", "building for
// 1 year, 9 months", "graduation in 13 months" — and written into the knowledge
// beside each raw date, so the model quotes a duration and never has to
// subtract dates in its head (the thing language models do worst).
//
// Calendar months, not 30-day blocks: June 15 to October 14 is 3 months and
// 29 days, so "3 months", not "4". All maths is UTC, like the dates the site stores.

const DAY = 86_400_000;

/** Whole months from `from` to `to` (to ≥ from), counting a month only once its day has arrived. */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "1 year, 9 months", "5 months", "3 weeks", "4 days", "today" — the size of a span between two moments. */
export function spanWords(from: Date, to: Date): string {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const days = Math.floor((b.getTime() - a.getTime()) / DAY);
  if (days < 1) return "today";
  if (days < 14) return plural(days, "day");
  const months = wholeMonthsBetween(a, b);
  if (months < 1) return plural(Math.floor(days / 7), "week");
  if (months < 12) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? plural(years, "year") : `${plural(years, "year")}, ${plural(rest, "month")}`;
}

/** "3 days ago", "yesterday", "today", "1 year, 2 months ago"; or "in 13 months" when the date is ahead. */
export function relativeTo(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days === -1) return "tomorrow";
  return date <= now ? `${spanWords(date, now)} ago` : `in ${spanWords(now, date)}`;
}

/** A date with its distance from today: "2026-10-06 (3 days ago)". */
export function dateWithAgo(date: Date, now: Date, precision: "day" | "month" = "day"): string {
  const iso = date.toISOString();
  return `${precision === "month" ? iso.slice(0, 7) : iso.slice(0, 10)} (${relativeTo(date, now)})`;
}

/**
 * The span of a role or study: "2025-01 to present (1 year, 9 months)",
 * "2023-02 to 2023-11 (9 months)". `end` null means still going.
 */
export function periodWords(start: Date, end: Date | null, now: Date): string {
  const from = start.toISOString().slice(0, 7);
  if (!end) return `${from} to present (${spanWords(start, now)} so far)`;
  return `${from} to ${end.toISOString().slice(0, 7)} (${spanWords(start, end)})`;
}

/**
 * How long someone has been doing something that is only known by its starting
 * year ("building software since 2025"): honest about the year's width.
 */
export function sinceYearWords(year: number, now: Date): string {
  const low = now.getUTCFullYear() - year;
  if (low < 0) return `starts in ${year}`;
  if (low === 0) return `since ${year} — under a year`;
  return `since ${year} — between ${plural(low, "year")} and ${plural(low + 1, "year")}, depending on the month`;
}
