// A milestone's date is shown only as precisely as it's known — never an
// invented day (owner, 2026-10-02: "2025 without a month").

import { describe, expect, it } from "vitest";
import { formatMilestoneDate } from "@/lib/rules/timeline";

describe("formatMilestoneDate", () => {
  const d = new Date("2025-01-01T00:00:00Z");
  it("a year-only date is just the year", () => {
    expect(formatMilestoneDate(d, "year")).toBe("2025");
    expect(formatMilestoneDate(d, "year", "short")).toBe("2025");
  });
  it("a month-only date has no day", () => {
    const m = formatMilestoneDate(new Date("2026-09-01T00:00:00Z"), "month");
    expect(m).toBe("September 2026");
    expect(m).not.toMatch(/\b1\b/);
  });
  it("an exact date keeps its day", () => {
    expect(formatMilestoneDate(new Date("2026-10-02T00:00:00Z"), "day")).toBe("2 Oct 2026");
    expect(formatMilestoneDate(new Date("2026-10-02T00:00:00Z"), "day", "short")).toBe("2 Oct");
  });
});
