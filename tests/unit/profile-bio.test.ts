import { describe, expect, it } from "vitest";
import { splitBio } from "@/lib/profile/bio";

describe("splitBio — the About hero keeps the first sentence, the story keeps the rest (D-046)", () => {
  it("splits the first paragraph after its first sentence, word for word", () => {
    const bio = "I build systems — full-stack, AI. Architecture comes first; no shortcuts.\n\nThis platform is one of them.";
    expect(splitBio(bio)).toEqual({
      lead: "I build systems — full-stack, AI.",
      story: ["Architecture comes first; no shortcuts.", "This platform is one of them."],
    });
  });

  it("keeps a one-sentence first paragraph whole", () => {
    expect(splitBio("Only one sentence.\n\nSecond paragraph.")).toEqual({ lead: "Only one sentence.", story: ["Second paragraph."] });
  });

  it("does not split inside a lower-case continuation such as an abbreviation", () => {
    expect(splitBio("Building since 2019 e.g. on web. Then more.").lead).toBe("Building since 2019 e.g. on web.");
  });

  it("is empty with no biography", () => {
    expect(splitBio(null)).toEqual({ lead: "", story: [] });
    expect(splitBio("  \n\n ")).toEqual({ lead: "", story: [] });
  });
});
