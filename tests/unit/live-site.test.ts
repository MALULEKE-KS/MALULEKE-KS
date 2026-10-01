// tests/unit/live-site.test.ts
// A repo's homepage becomes a system's live site only when it is one: a link
// back to GitHub would make "View it live" open source code.

import { describe, expect, it } from "vitest";
import { liveSite } from "@/lib/jobs/github-sync";
import { headingSlug, markdownSections } from "@/components/shared/Prose";

describe("liveSite", () => {
  it.each(["https://xkimixamali.co.za", "https://my-app.vercel.app", "https://someone.github.io/project"])("keeps %s", (url) => {
    expect(liveSite(url)).toBe(url);
  });

  it.each([null, "", "  ", "https://github.com/KSDRILL/ai-chatbot-evolution-comparison", "https://gist.github.com/x", "javascript:alert(1)", "not a url"])(
    "drops %j",
    (url) => {
      expect(liveSite(url)).toBeNull();
    },
  );
});

describe("case study sections", () => {
  it("lists the ## headings with their anchors", () => {
    expect(markdownSections("Intro\n\n## The problem\n\ntext\n\n### Detail\n\n## How it *works*\n")).toEqual([
      { id: "the-problem", title: "The problem" },
      { id: "how-it-works", title: "How it works" },
    ]);
    expect(headingSlug("Decisions & trade-offs")).toBe("decisions-trade-offs");
  });
});
