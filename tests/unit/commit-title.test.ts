// tests/unit/commit-title.test.ts
// Commits read as people wrote them, without the repo's bookkeeping (D-061).

import { describe, expect, it } from "vitest";
import { commitTitle } from "@/lib/rules/commit-title";

describe("commitTitle", () => {
  it("drops decision codes and pull request numbers", () => {
    expect(commitTitle("Admin pass: one tool, easy to read (D-057) (#256)")).toBe("Admin pass: one tool, easy to read");
    expect(commitTitle("Integration sweep: the phone's dock (D-054–D-056) (#254)")).toBe("Integration sweep: the phone's dock");
    expect(commitTitle("Header and hero images (D-058, D-059)\n\nbody")).toBe("Header and hero images");
  });

  it("keeps everything else, brackets included", () => {
    expect(commitTitle("Fix the map (phone layout) for 360 px")).toBe("Fix the map (phone layout) for 360 px");
    expect(commitTitle("Bump next to 16.0.1")).toBe("Bump next to 16.0.1");
  });
});
