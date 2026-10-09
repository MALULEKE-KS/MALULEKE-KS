// tests/unit/guide-time.test.ts
// The durations the guide quotes are computed in code from real dates
// (docs/AI-GUIDE-PHASE2-PLAN.md §4 B1) — checked here against a fixed clock.

import { describe, expect, it } from "vitest";
import { dateWithAgo, periodWords, relativeTo, sinceYearWords, spanWords, wholeMonthsBetween } from "@/lib/guide/time";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NOW = d("2026-10-09");

describe("wholeMonthsBetween", () => {
  it("counts a month only once its day has arrived", () => {
    expect(wholeMonthsBetween(d("2026-06-15"), d("2026-10-14"))).toBe(3);
    expect(wholeMonthsBetween(d("2026-06-15"), d("2026-10-15"))).toBe(4);
    expect(wholeMonthsBetween(d("2025-10-31"), d("2026-10-30"))).toBe(11);
  });
  it("never goes below zero", () => {
    expect(wholeMonthsBetween(d("2026-10-09"), d("2026-10-01"))).toBe(0);
  });
});

describe("spanWords", () => {
  it.each([
    ["2026-10-09", "2026-10-09", "today"],
    ["2026-10-08", "2026-10-09", "1 day"],
    ["2026-10-02", "2026-10-09", "7 days"],
    ["2026-09-18", "2026-10-09", "3 weeks"],
    ["2026-05-09", "2026-10-09", "5 months"],
    ["2025-10-09", "2026-10-09", "1 year"],
    ["2025-01-10", "2026-10-09", "1 year, 8 months"],
    ["2020-09-09", "2026-10-09", "6 years, 1 month"],
  ])("%s → %s is %s", (a, b, expected) => {
    expect(spanWords(d(a), d(b))).toBe(expected);
  });
  it("is the same either way round", () => {
    expect(spanWords(d("2026-10-09"), d("2025-01-10"))).toBe(spanWords(d("2025-01-10"), d("2026-10-09")));
  });
});

describe("relativeTo", () => {
  it("speaks plainly about the past", () => {
    expect(relativeTo(d("2026-10-09"), NOW)).toBe("today");
    expect(relativeTo(d("2026-10-08"), NOW)).toBe("yesterday");
    expect(relativeTo(d("2026-10-06"), NOW)).toBe("3 days ago");
    expect(relativeTo(d("2025-01-10"), NOW)).toBe("1 year, 8 months ago");
  });
  it("and about the future", () => {
    expect(relativeTo(d("2026-10-10"), NOW)).toBe("tomorrow");
    expect(relativeTo(d("2027-11-30"), NOW)).toBe("in 1 year, 1 month");
  });
});

describe("dateWithAgo", () => {
  it("puts the raw date beside its distance, to the day or the month", () => {
    expect(dateWithAgo(d("2026-10-06"), NOW)).toBe("2026-10-06 (3 days ago)");
    expect(dateWithAgo(d("2027-11-30"), NOW, "month")).toBe("2027-11 (in 1 year, 1 month)");
  });
});

describe("periodWords", () => {
  it("measures a running role to today and a finished one to its end", () => {
    expect(periodWords(d("2025-01-10"), null, NOW)).toBe("2025-01 to present (1 year, 8 months so far)");
    expect(periodWords(d("2023-02-01"), d("2023-11-01"), NOW)).toBe("2023-02 to 2023-11 (9 months)");
  });
});

describe("sinceYearWords", () => {
  it("is honest that a year-only start is a range", () => {
    expect(sinceYearWords(2025, NOW)).toBe("since 2025 — between 1 year and 2 years, depending on the month");
    expect(sinceYearWords(2026, NOW)).toBe("since 2026 — under a year");
    expect(sinceYearWords(2027, NOW)).toBe("starts in 2027");
  });
});
