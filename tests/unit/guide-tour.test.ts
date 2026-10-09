// tests/unit/guide-tour.test.ts
// Guided tours (docs/AI-GUIDE-PHASE2-PLAN.md §7): the owner's content, resolved against
// the site's own pages — a tour can't leave the site, and the model can't add to it.

import { describe, expect, it } from "vitest";
import { anchorOf, resolveTour, stepTo, ToursBlock, tourKeys, type TourBlockData } from "@/lib/guide/tour";

const PAGES = ["/", "/about", "/systems", "/journey", "/contact"];
const BLOCK: TourBlockData = {
  spotlightSeconds: 4,
  tours: [
    {
      key: "recruiter",
      label: "A quick tour for a recruiter",
      summary: "The evidence in four stops.",
      stops: [
        { path: "/systems", say: "Every system, with its status and stack." },
        { path: "/about", section: "Skills", say: "Each skill and the systems that prove it." },
        { path: "/somewhere-else", say: "A page the site doesn't have." },
        { path: "/contact/", section: "How to reach him!", say: "Write to him here." },
      ],
    },
    { key: "empty", label: "Nothing real", summary: "All stops off-site.", stops: [{ path: "/nope", say: "x" }] },
  ],
};

describe("resolveTour", () => {
  it("keeps the owner's words and order, and builds each stop's address", () => {
    const tour = resolveTour(BLOCK, "recruiter", PAGES)!;
    expect(tour.label).toBe("A quick tour for a recruiter");
    expect(tour.spotlightSeconds).toBe(4);
    expect(tour.stops.map((s) => s.href)).toEqual(["/systems", "/about#skills", "/contact#how-to-reach-him"]);
    expect(tour.stops.map((s) => s.say)).toEqual(["Every system, with its status and stack.", "Each skill and the systems that prove it.", "Write to him here."]);
    expect(tour.stops[1]).toMatchObject({ path: "/about", anchor: "skills" });
    expect(tour.stops[0]).toMatchObject({ anchor: null });
  });

  it("drops a stop on a page the site doesn't have — a tour never leaves the site", () => {
    expect(resolveTour(BLOCK, "recruiter", PAGES)!.stops.some((s) => s.path === "/somewhere-else")).toBe(false);
    expect(resolveTour(BLOCK, "recruiter", ["/systems"])!.stops).toHaveLength(1);
  });

  it("is null for a tour with nothing left, an unknown key, or no block at all", () => {
    expect(resolveTour(BLOCK, "empty", PAGES)).toBeNull();
    expect(resolveTour(BLOCK, "made-up", PAGES)).toBeNull();
    expect(resolveTour(null, "recruiter", PAGES)).toBeNull();
  });
});

describe("anchorOf and tourKeys", () => {
  it("turns a section name into the anchor the pages use", () => {
    expect(anchorOf("How I build")).toBe("how-i-build");
    expect(anchorOf("  Skills & evidence! ")).toBe("skills-evidence");
    expect(anchorOf("!!!")).toBe("");
  });
  it("offers the model only the keys the owner wrote", () => {
    expect(tourKeys(BLOCK)).toEqual(["recruiter", "empty"]);
    expect(tourKeys(null)).toEqual([]);
  });
});

describe("stepTo", () => {
  it("moves forward and back and stops at the ends", () => {
    expect(stepTo(0, "next", 3)).toBe(1);
    expect(stepTo(2, "next", 3)).toBe(2);
    expect(stepTo(0, "back", 3)).toBe(0);
    expect(stepTo(2, "back", 3)).toBe(1);
    expect(stepTo(2, "restart", 3)).toBe(0);
  });
});

describe("the guide-tours block's schema", () => {
  it("accepts well-formed tours and refuses an off-site path, a bad key, or too many stops", () => {
    expect(ToursBlock.safeParse(BLOCK).success).toBe(true);
    expect(ToursBlock.safeParse({ ...BLOCK, tours: [{ ...BLOCK.tours[0]!, stops: [{ path: "https://evil.example", say: "x" }] }] }).success).toBe(false);
    expect(ToursBlock.safeParse({ ...BLOCK, tours: [{ ...BLOCK.tours[0]!, key: "Bad Key" }] }).success).toBe(false);
    expect(ToursBlock.safeParse({ ...BLOCK, tours: [{ ...BLOCK.tours[0]!, stops: Array.from({ length: 11 }, () => ({ path: "/systems", say: "x" })) }] }).success).toBe(false);
    expect(ToursBlock.safeParse({ ...BLOCK, spotlightSeconds: 0 }).success).toBe(false);
  });
});
