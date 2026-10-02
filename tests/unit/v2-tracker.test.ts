// The V2 relay (docs/V2-IMPROVEMENT-SPEC.md §0.1) only works if the tracker
// stays complete: every work package in the spec appears in the tracker
// exactly once, with a known status, and "Next up" names a real one.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spec = readFileSync("docs/V2-IMPROVEMENT-SPEC.md", "utf8");
const tracker = readFileSync("docs/improvements/TRACKER.md", "utf8");
const STATUSES = ["Not started", "In progress", "Partial", "Blocked — owner", "Done", "Superseded"];

// Work packages are the spec's "**WP-123 Title" headings.
const specWps = [...new Set([...spec.matchAll(/^\*\*(WP-\d{3})\b/gm)].map((m) => m[1]!))];
// Tracker rows: "| WP-123 | title | phase | status | …".
const rows = [...tracker.matchAll(/^\| (WP-\d{3}) \|[^|]*\|[^|]*\| ([^|]+?) \|/gm)].map((m) => ({ wp: m[1]!, status: m[2]!.trim() }));

describe("V2 tracker", () => {
  it("the spec defines work packages", () => {
    expect(specWps.length).toBeGreaterThan(20);
  });

  it("lists every work package in the spec exactly once", () => {
    for (const wp of specWps) expect(rows.filter((r) => r.wp === wp), wp).toHaveLength(1);
    for (const r of rows) expect(specWps, `${r.wp} is in the tracker but not the spec`).toContain(r.wp);
  });

  it("uses only known statuses", () => {
    for (const r of rows) expect(STATUSES, `${r.wp}: "${r.status}"`).toContain(r.status);
  });

  it("names a real work package as Next up", () => {
    const next = /\*\*Next up: (WP-\d{3})\*\*/.exec(tracker)?.[1];
    expect(next).toBeDefined();
    expect(specWps).toContain(next);
  });
});
