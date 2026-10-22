// tests/unit/guide-knows.test.ts
// What the AI guide reads right now, on the home band's card (D-043): the owner's template filled with live
// figures — and a part whose figure is missing is left out, never shown empty or as a zero.

import { describe, expect, it } from "vitest";
import { fillKnows } from "@/lib/home/guide-knows";

const T = "Reads {systems} published systems · GitHub synced {synced}";

describe("fillKnows", () => {
  it("fills the live figures", () => {
    expect(fillKnows(T, { systems: 12, synced: "today" })).toBe("Reads 12 published systems · GitHub synced today");
  });

  it("leaves out a part whose figure is missing", () => {
    expect(fillKnows(T, { systems: 12, synced: null })).toBe("Reads 12 published systems");
    expect(fillKnows(T, { systems: 0, synced: "2 days ago" })).toBe("GitHub synced 2 days ago");
  });

  it("says nothing when nothing is true to say, or the owner wrote no line", () => {
    expect(fillKnows(T, { systems: 0, synced: null })).toBeNull();
    expect(fillKnows("", { systems: 12, synced: "today" })).toBeNull();
    expect(fillKnows(undefined, { systems: 12, synced: "today" })).toBeNull();
  });

  it("keeps a part with no fill-in as written", () => {
    expect(fillKnows("Live on this site · {systems} systems", { systems: 3, synced: null })).toBe("Live on this site · 3 systems");
  });
});
