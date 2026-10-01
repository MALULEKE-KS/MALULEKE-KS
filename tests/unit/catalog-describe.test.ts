// tests/unit/catalog-describe.test.ts
// What a catalog card says a system is: a description that only repeats the
// repo's name says nothing — the README's opening stands in, or nothing does.

import { describe as group, expect, it } from "vitest";
import { describe } from "@/lib/queries/catalog";

group("catalog description", () => {
  it("keeps a real description", () => {
    expect(describe("A private savings collective platform.", "Xkimi Xa Mali", "xkimi-xa-mali", null)).toBe("A private savings collective platform.");
  });

  it.each([
    ["MALULEKE-KS", "MALULEKE-KS", "maluleke-ks"],
    ["my-angular-portfolio", "My Angular Portfolio", "my-angular-portfolio"],
    ["  ", "Graph Search Engine", "graph-search-engine"],
    [null, "Graph Search Engine", "graph-search-engine"],
  ])("treats %j as no description", (description, name, slug) => {
    expect(describe(description, name, slug, null)).toBeNull();
    expect(describe(description, name, slug, "An Angular portfolio with routed sections.\n\nMore detail.")).toBe("An Angular portfolio with routed sections.");
  });

  it("never uses a README fragment too short to say anything", () => {
    expect(describe("my-app", "My App", "my-app", "my-app")).toBeNull();
  });
});
