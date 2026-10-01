// tests/unit/show-by-default.test.ts
// BR-1.6 (replaced 2026-10-01): which newly synced repos are shown by default.

import { describe, expect, it } from "vitest";
import { showByDefault } from "@/lib/jobs/github-sync";

describe("showByDefault", () => {
  it("shows the owner's public and private repos with the default setting", () => {
    expect(showByDefault("public-and-private", false, false, "owner")).toBe(true);
    expect(showByDefault("public-and-private", true, false, "owner")).toBe(true);
  });
  it("public-only keeps private repos hidden", () => {
    expect(showByDefault("public-only", false, false, "owner")).toBe(true);
    expect(showByDefault("public-only", true, false, "owner")).toBe(false);
  });
  it("hidden shows nothing by default", () => {
    expect(showByDefault("hidden", false, false, "owner")).toBe(false);
  });
  it("never shows client-organisation or collaborated work without approval (BR-1.2, BR-1.11)", () => {
    expect(showByDefault("public-and-private", false, true, "owner")).toBe(false);
    expect(showByDefault("public-and-private", false, false, "collaborator")).toBe(false);
  });
});
