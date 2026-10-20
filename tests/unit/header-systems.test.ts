// The header's Systems preview (lib/queries/header.ts): how many show is the
// owner's setting, each carries its own status and a meta line from whatever
// of organisation and domain exists, and the total is passed through untouched.

import { describe, expect, it } from "vitest";
import { shapeHeaderSystems } from "@/lib/queries/header";

const rows = [
  { slug: "xkimi", name: "Xkimi Xa Mali", status: "Finished", statusColorToken: "signal-finished", organization: "KSDRILL-SA", domain: "Fintech" },
  { slug: "sunduza", name: "Sunduza Architectural", status: "Finished", statusColorToken: "signal-finished", organization: "Sunduza Architectural & Projects (Pty) Ltd", domain: "Architecture & Construction" },
  { slug: "governova", name: "Governova", status: "In Progress", statusColorToken: "signal-progress", organization: "KSDRILL-SA", domain: null },
  { slug: "tshimo", name: "Tshimo Agri Network", status: "On GitHub", statusColorToken: "signal-planned", organization: "MALULEKE-KS", domain: "Agriculture" },
];

describe("shapeHeaderSystems", () => {
  it("shows at most the number the setting allows, in the given order", () => {
    const out = shapeHeaderSystems(rows, 11, 3);
    expect(out.systems.map((s) => s.slug)).toEqual(["xkimi", "sunduza", "governova"]);
  });

  it("passes the total through, whatever is shown", () => {
    expect(shapeHeaderSystems(rows, 11, 2).total).toBe(11);
    expect(shapeHeaderSystems(rows, 11, 0).total).toBe(11);
  });

  it("shows nothing when the setting is 0 (no preview)", () => {
    expect(shapeHeaderSystems(rows, 11, 0).systems).toEqual([]);
    expect(shapeHeaderSystems(rows, 11, -1).systems).toEqual([]);
  });

  it("carries each system's own status and colour token, from its lookup row", () => {
    const [first, , third] = shapeHeaderSystems(rows, 11, 3).systems;
    expect([first!.statusLabel, first!.statusColorToken]).toEqual(["Finished", "signal-finished"]);
    expect([third!.statusLabel, third!.statusColorToken]).toEqual(["In Progress", "signal-progress"]);
  });

  it("builds the meta line from whatever of organisation and domain exists", () => {
    const out = shapeHeaderSystems(rows, 11, 4).systems;
    expect(out[0]!.meta).toBe("KSDRILL-SA · Fintech");
    expect(out[2]!.meta).toBe("KSDRILL-SA"); // no domain: no stray separator
  });

  it("is empty and honest with no systems", () => {
    expect(shapeHeaderSystems([], 0, 3)).toEqual({ systems: [], total: 0 });
  });
});
