// tests/unit/guide-fit.test.ts
// Fit Check (docs/AI-GUIDE-PHASE2-PLAN.md §7): each need against the site's
// evidence — computed in code, honest about gaps, years and seniority.

import { describe, expect, it } from "vitest";
import { fitCheck, matchRequirement, type FitData, type FitOptions } from "@/lib/guide/fit";

const DATA: FitData = {
  skills: [
    { name: "TypeScript", systemSlugs: ["xkimi-xa-mali", "maluleke-ks"], systemCount: 2, roleCount: 1, studyCount: 0 },
    { name: "PostgreSQL", systemSlugs: ["xkimi-xa-mali", "maluleke-ks"], systemCount: 2, roleCount: 0, studyCount: 0 },
    { name: "Python", systemSlugs: ["yolo-detector"], systemCount: 1, roleCount: 0, studyCount: 1 },
    { name: "Machine Learning", systemSlugs: [], systemCount: 0, roleCount: 0, studyCount: 1 },
    { name: "Docker", systemSlugs: [], systemCount: 0, roleCount: 0, studyCount: 0 },
    { name: "Agile", systemSlugs: [], systemCount: 0, roleCount: 1, studyCount: 0 },
  ],
  systems: [
    { slug: "xkimi-xa-mali", name: "Xkimi Xa Mali", tech: ["TypeScript", "Next.js", "PostgreSQL", "Prisma"] },
    { slug: "maluleke-ks", name: "MALULEKE-KS", tech: ["TypeScript", "Next.js", "Postgres", "Tailwind"] },
    { slug: "yolo-detector", name: "YOLOv8 object detector", tech: ["Python", "YOLOv8", "OpenCV"] },
  ],
  roles: [{ title: "Founder & Principal Engineer", organization: "KSDRILL-SA", skills: ["TypeScript", "Agile"] }],
  study: [{ qualification: "BSc Computer Science & Mathematics", coursework: ["Machine Learning", "Algorithms", "Linear Algebra"] }],
  buildingSinceYear: 2025,
  now: new Date("2026-10-09T10:00:00Z"),
};

// The wording is the owner's content and the limits are settings; these mirror what the migration ships.
const OPTIONS: FitOptions = {
  maxRequirements: 8,
  maxEvidence: 3,
  yearsNote: "Asks for {years}+ years — he has been building since {since}.",
  seniorityNote: "Asks for seniority or leadership — he is a final-year student; the site shows building, not seniority.",
  noneNote: "Nothing in the published data shows this yet.",
};
const row = (requirement: string, options: FitOptions = OPTIONS) => matchRequirement(requirement, DATA, options);

describe("matchRequirement — evidenced", () => {
  it("a skill the systems prove, with those systems linked", () => {
    const r = row("Strong TypeScript experience");
    expect(r.status).toBe("evidenced");
    expect(r.evidence.map((e) => e.href)).toEqual(expect.arrayContaining(["/systems/xkimi-xa-mali", "/systems/maluleke-ks"]));
    expect(r.note).toBeNull();
  });

  it("treats spellings of the same thing as one (Postgres, PostgreSQL, Node/NodeJS)", () => {
    expect(row("Postgres").status).toBe("evidenced");
    expect(row("PostgreSQL").status).toBe("evidenced");
  });

  it("a broad field is evidenced by what proves it", () => {
    const r = row("Experience with relational databases");
    expect(r.status).toBe("evidenced");
    expect(r.evidence.some((e) => e.kind === "system")).toBe(true);
  });

  it("a skill used in a role is evidenced by the role", () => {
    const r = row("Working in an Agile team");
    expect(r.status).toBe("evidenced");
    expect(r.evidence.some((e) => e.kind === "role")).toBe(true);
  });

  it("lists systems first and no more than three pieces of evidence", () => {
    const r = row("TypeScript and Next.js and PostgreSQL");
    expect(r.evidence.length).toBeLessThanOrEqual(3);
    expect(r.evidence[0]!.kind).toBe("system");
  });
});

describe("matchRequirement — partial and none, said plainly", () => {
  it("something that is only listed, or only studied, is partial", () => {
    expect(row("Docker").status).toBe("partial");
    expect(row("Docker").evidence[0]).toMatchObject({ kind: "skill" });
    expect(row("Linear algebra").status).toBe("partial");
    expect(row("Linear algebra").evidence[0]).toMatchObject({ kind: "study" });
  });

  it("nothing in the data means none — with no evidence invented", () => {
    const r = row("Kubernetes cluster administration");
    expect(r).toMatchObject({ status: "none", evidence: [], note: "Nothing in the published data shows this yet." });
  });

  it("a made-up technology is none, not a guess", () => {
    expect(row("Expert in Zorblax-9000").status).toBe("none");
  });
});

describe("matchRequirement — the honesty rules", () => {
  it("never evidences more years than he has been building", () => {
    const r = row("5+ years of TypeScript experience");
    expect(r.status).toBe("partial");
    expect(r.note).toBe("Asks for 5+ years — he has been building since 2025.");
    expect(r.evidence.length).toBeGreaterThan(0); // the skill is real; the years are not
  });

  it("allows a years requirement he can meet", () => {
    expect(row("1 year of TypeScript").status).toBe("evidenced");
    expect(row("2 years of TypeScript").status).toBe("evidenced");
  });

  it("a years requirement with nothing behind it is none", () => {
    expect(row("8 years of Kubernetes").status).toBe("none");
  });

  it("seniority is not met by building: partial at best, with the reason", () => {
    const alone = row("Senior engineer who can lead a team");
    expect(alone.status).toBe("none");
    expect(alone.note).toMatch(/final-year student/);
    const withTech = row("Senior TypeScript engineer");
    expect(withTech.status).toBe("partial");
    expect(withTech.note).toMatch(/seniority/);
  });

  it("evidence is only ever a record a visitor can open", () => {
    for (const requirement of ["TypeScript", "PostgreSQL", "Docker", "Agile", "Machine learning", "Algorithms", "Python"]) {
      for (const e of row(requirement).evidence) expect(e.href).toMatch(/^\/(systems\/[a-z0-9-]+|journey|about#skills)$/);
    }
  });
});

describe("fitCheck", () => {
  it("counts each status and keeps the visitor's wording, cleaned and shortened", () => {
    const card = fitCheck(["TypeScript", "Kubernetes", "Docker", "  Agile \n team  "], DATA, OPTIONS);
    expect(card).toMatchObject({ evidenced: 2, partial: 1, none: 1 });
    expect(card.rows.map((r) => r.requirement)).toEqual(["TypeScript", "Kubernetes", "Docker", "Agile team"]);
    expect(fitCheck(["x".repeat(500)], DATA, OPTIONS).rows[0]!.requirement.length).toBe(120);
  });

  it("takes at most the owner's limit of needs and drops empty ones", () => {
    const needs = ["", " ", ...Array.from({ length: 12 }, (_, i) => `Skill number ${i}`)];
    expect(fitCheck(needs, DATA, OPTIONS).rows).toHaveLength(8);
    expect(fitCheck(needs, DATA, { ...OPTIONS, maxRequirements: 3 }).rows).toHaveLength(3);
  });

  it("shows no more evidence than the owner's limit", () => {
    expect(row("TypeScript and Next.js and PostgreSQL", { ...OPTIONS, maxEvidence: 1 }).evidence).toHaveLength(1);
  });

  it("says only what the owner's wording says — and nothing where it is empty", () => {
    const quiet: FitOptions = { ...OPTIONS, yearsNote: null, seniorityNote: null, noneNote: null };
    expect(row("5+ years of TypeScript experience", quiet)).toMatchObject({ status: "partial", note: null });
    expect(row("Senior engineer who can lead a team", quiet)).toMatchObject({ status: "none", note: null });
    expect(row("Kubernetes", quiet)).toMatchObject({ status: "none", note: null });
    expect(row("5+ years of TypeScript experience", { ...OPTIONS, yearsNote: "{years} yrs asked; since {since}." }).note).toBe("5 yrs asked; since 2025.");
  });

  it("gives the same card for the same needs", () => {
    expect(fitCheck(["TypeScript", "Kubernetes"], DATA, OPTIONS)).toEqual(fitCheck(["TypeScript", "Kubernetes"], DATA, OPTIONS));
  });

  it("strips control characters from the wording", () => {
    expect(fitCheck(["Type\u0000Script\u0007 and more"], DATA, OPTIONS).rows[0]!.requirement).toBe("Type Script and more");
  });
});
