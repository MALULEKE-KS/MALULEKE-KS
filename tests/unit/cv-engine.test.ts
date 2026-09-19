// tests/unit/cv-engine.test.ts
// The CV engine's pure parts (#74): role tailoring, the completeness checker,
// the summary it suggests, and the formatting both renderers share.

import { describe, expect, it } from "vitest";
import { relevance, roleTerms } from "@/lib/cv/tailor";
import { checkCv, suggestSummary } from "@/lib/cv/check";
import { contactLines, dateRange, displayUrl, headlineLine } from "@/lib/cv/format";
import { qualificationTitle, type CvModel } from "@/lib/cv/model";

function model(overrides: Partial<CvModel> = {}): CvModel {
  return {
    name: "Test Person",
    headline: "Software & AI Engineer",
    qualificationLine: "BSc in Computer Science and Mathematics (in progress)",
    location: "South Africa",
    email: "person@example.com",
    phone: "+27 60 000 0000",
    links: [
      { label: "Portfolio", url: "https://example.com/" },
      { label: "GitHub", url: "https://github.com/person" },
      { label: "LinkedIn", url: "https://linkedin.com/in/person" },
    ],
    summary: "Engineer building AI systems.",
    experience: [
      {
        title: "Software & AI Engineer",
        organization: "Acme",
        location: null,
        start: new Date("2025-01-01"),
        end: null,
        highlights: ["Shipped 3 production systems used by 200 people."],
        description: "",
        skills: ["TypeScript"],
      },
    ],
    projects: [
      {
        name: "Ledger",
        organization: "Acme",
        description: "A ledger.",
        techStack: ["Next.js"],
        impacts: [],
        caseStudyUrl: "https://example.com/systems/ledger",
        liveUrl: null,
      },
    ],
    education: [
      {
        qualification: "BSc in Computer Science and Mathematics",
        institution: "Example University",
        start: new Date("2023-02-01"),
        end: null,
        expectedGraduation: new Date("2026-11-30"),
        honors: null,
        coursework: [],
        description: null,
      },
    ],
    skills: [{ category: "Languages", names: ["TypeScript", "Python", "SQL", "Go", "Rust", "C"] }],
    certifications: [],
    targetRole: null,
    ...overrides,
  };
}

describe("role tailoring", () => {
  it("expands a role into related terms and drops generic words", () => {
    const terms = roleTerms("Senior AI Engineer");
    expect(terms).toContain("ai");
    expect(terms).toContain("machine learning");
    expect(terms).not.toContain("engineer");
    expect(terms).not.toContain("senior");
    expect(roleTerms(null)).toEqual([]);
  });

  it("scores whole words and phrases only", () => {
    const terms = roleTerms("AI Engineer");
    expect(relevance("Built an LLM agent with RAG", terms)).toBeGreaterThanOrEqual(3);
    expect(relevance("Maintained a chair factory", terms)).toBe(0); // "ai" inside "chair"/"maintained" doesn't count
  });
});

describe("completeness checker", () => {
  it("a complete CV is ready with no issues", () => {
    const result = checkCv(model());
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ score: 100, ready: true, suggestedSummary: null });
  });

  it("missing name or email makes the CV not ready", () => {
    const result = checkCv(model({ name: "", email: "" }));
    expect(result.ready).toBe(false);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(2);
  });

  it("flags what a recruiter would miss, and never fills it in", () => {
    const result = checkCv(
      model({
        phone: null,
        summary: null,
        links: [{ label: "Portfolio", url: "https://example.com/" }],
        experience: [{ ...model().experience[0]!, highlights: [] }],
        education: [{ ...model().education[0]!, expectedGraduation: null }],
      }),
    );
    const messages = result.issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/phone/i);
    expect(messages).toMatch(/summary/i);
    expect(messages).toMatch(/LinkedIn/);
    expect(messages).toMatch(/GitHub/);
    expect(messages).toMatch(/no achievement bullets/);
    expect(messages).toMatch(/expected graduation/);
    expect(result.ready).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("suggests quantifying impact and tightening long bullets", () => {
    const role = { ...model().experience[0]!, highlights: ["Improved things a great deal ".repeat(10)] };
    const messages = checkCv(model({ experience: [role] })).issues.map((i) => i.message).join("\n");
    expect(messages).toMatch(/quantify/);
    expect(messages).toMatch(/over 200 characters/);
  });

  it("names the target role's words the CV never mentions", () => {
    const result = checkCv(model({ targetRole: "Kubernetes Engineer" }));
    expect(result.issues.some((i) => i.section === "targetRole" && i.message.includes("kubernetes"))).toBe(true);
  });

  it("drafts a summary only from facts on the CV", () => {
    const summary = suggestSummary(model({ summary: null }));
    expect(summary).toBe(
      "Software & AI Engineer, currently studying BSc in Computer Science and Mathematics at Example University. " +
        "Built 1 published system, including Ledger. Core skills: TypeScript, Python, SQL, Go, Rust, C.",
    );
    expect(suggestSummary(model({ headline: null }))).toBeNull();
  });
});

describe("shared formatting", () => {
  it("formats dates, links, the headline and the contact lines the same for both formats", () => {
    expect(dateRange(new Date("2023-02-01"), null, new Date("2026-11-30"))).toBe("Feb 2023 – Expected Nov 2026");
    expect(dateRange(new Date("2025-01-01"), null)).toBe("Jan 2025 – Present");
    expect(displayUrl("https://github.com/person/")).toBe("github.com/person");
    expect(headlineLine(model())).toBe("Software & AI Engineer | BSc in Computer Science and Mathematics (in progress)");
    const [details, links] = contactLines(model());
    expect(details?.map((d) => d.text)).toEqual(["South Africa", "+27 60 000 0000", "person@example.com"]);
    expect(links?.map((l) => l.text)).toEqual(["example.com", "github.com/person", "linkedin.com/in/person"]);
    expect(qualificationTitle("BSc", "Computer Science")).toBe("BSc in Computer Science");
    expect(qualificationTitle("BSc Computer Science", "Computer Science")).toBe("BSc Computer Science");
  });
});
