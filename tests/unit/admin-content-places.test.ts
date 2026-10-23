// tests/unit/admin-content-places.test.ts
// Every page-content block has a place in Admin → Page content (D-057) — once —
// so no block the site reads is left without an editor (the section copy was).

import { describe, expect, it } from "vitest";
import { CONTENT_BLOCKS } from "@/lib/content/blocks";
import { CONTENT_PLACES } from "@/lib/admin/content-places";

describe("CONTENT_PLACES", () => {
  it("places every content block exactly once", () => {
    const placed = CONTENT_PLACES.flatMap((p) => p.keys);
    expect([...placed].sort()).toEqual(Object.keys(CONTENT_BLOCKS).sort());
    expect(new Set(placed).size).toBe(placed.length);
  });
});
