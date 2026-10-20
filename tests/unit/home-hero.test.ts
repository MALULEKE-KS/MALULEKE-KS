// The new home hero's copy and computed facts (lib/home/hero.ts). The rule under
// test: there is no wording in code. Every label and claim is the owner's (a
// fixture here stands in for the seeded block), a part with no wording is simply
// not shown, a zero is never proof, the live line is true to where the page is
// running, and the preview switch is one production refuses.

import { describe, expect, it } from "vitest";
import { heroCopy, heroCredential, heroEntranceVars, heroLedger, heroLiveLine, heroStack, type LabelPair, type LedgerKey } from "@/lib/home/hero";

// What the seeded "home-hero" block carries (the migrations are the source of this wording).
const LABELS: Partial<Record<LedgerKey, LabelPair>> = {
  shipped: { one: "system shipped to production", many: "systems shipped to production", claim: "Runs in production" },
  rules: { one: "rule the database enforces", many: "rules the database enforces", claim: "Enforces its own rules" },
  audited: { one: "change audited this week", many: "changes audited this week", claim: "Shows its proof" },
  systems: { one: "system published", many: "systems published" },
};

describe("heroLedger", () => {
  it("lists every figure with its label, in order, and the evidence that backs it", () => {
    expect(heroLedger({ systemsShipped: 2, systemsPublished: 11, rulesEnforced: 20, auditedThisWeek: 66 }, LABELS)).toEqual([
      { key: "shipped", value: 2, label: "systems shipped to production", claim: "Runs in production", evidenceKey: null },
      { key: "rules", value: 20, label: "rules the database enforces", claim: "Enforces its own rules", evidenceKey: "pulse:rulesEnforcedByDatabase" },
      { key: "audited", value: 66, label: "changes audited this week", claim: "Shows its proof", evidenceKey: "pulse:auditEventsLast7Days" },
      { key: "systems", value: 11, label: "systems published", claim: null, evidenceKey: null },
    ]);
  });

  it("reads as the proof of the statement: three claims over their figures, the catalogue size as support", () => {
    const items = heroLedger({ systemsShipped: 2, systemsPublished: 11, rulesEnforced: 20, auditedThisWeek: 66 }, LABELS);
    expect(items.map((i) => i.claim)).toEqual(["Runs in production", "Enforces its own rules", "Shows its proof", null]);
  });

  it("never shows a zero as proof — so a claim appears only when its figure backs it", () => {
    const items = heroLedger({ systemsShipped: 0, systemsPublished: 3, rulesEnforced: 0, auditedThisWeek: 5 }, LABELS);
    expect(items.map((i) => i.value)).toEqual([5, 3]);
    expect(items.map((i) => i.claim)).toEqual(["Shows its proof", null]);
  });

  it("makes each label agree with a count of one", () => {
    const items = heroLedger({ systemsShipped: 1, systemsPublished: 1, rulesEnforced: 1, auditedThisWeek: 1 }, LABELS);
    expect(items.map((i) => i.label)).toEqual(["system shipped to production", "rule the database enforces", "change audited this week", "system published"]);
  });

  it("is empty when nothing has been counted", () => {
    expect(heroLedger({ systemsShipped: 0, systemsPublished: 0, rulesEnforced: 0, auditedThisWeek: 0 }, LABELS)).toEqual([]);
  });

  it("shows no figure the owner has not labelled — a label is never made up", () => {
    const items = heroLedger({ systemsShipped: 2, systemsPublished: 11, rulesEnforced: 20, auditedThisWeek: 66 }, { rules: LABELS.rules! });
    expect(items.map((i) => i.key)).toEqual(["rules"]);
    expect(heroLedger({ systemsShipped: 2, systemsPublished: 11, rulesEnforced: 20, auditedThisWeek: 66 }, {})).toEqual([]);
  });

  it("uses the owner's rewritten wording, and drops a claim left blank", () => {
    const labels = {
      rules: { one: "rule", many: "rules", claim: "Keeps its word" },
      audited: { one: "edit", many: "edits", claim: "   " },
    };
    const items = heroLedger({ systemsShipped: 0, systemsPublished: 0, rulesEnforced: 3, auditedThisWeek: 2 }, labels);
    expect(items.map((i) => [i.label, i.claim])).toEqual([
      ["rules", "Keeps its word"],
      ["edits", null],
    ]);
  });
});

describe("heroCopy", () => {
  it("has no wording of its own: with no block, every part is null and nothing is invented", () => {
    const copy = heroCopy(null);
    expect(Object.values({ ...copy, ledgerLabels: undefined }).filter((v) => v !== undefined && v !== null)).toEqual([]);
    expect(copy.ledgerLabels).toEqual({});
    expect(heroCopy(undefined)).toEqual(copy);
  });

  it("reads the owner's wording as written, and treats blank as not written", () => {
    const copy = heroCopy({ primaryLabel: "Explore the systems", secondaryLabel: "  ", nowLabel: "In the workshop", ledgerLabels: { rules: LABELS.rules! } });
    expect(copy.primaryLabel).toBe("Explore the systems");
    expect(copy.secondaryLabel).toBeNull();
    expect(copy.nowLabel).toBe("In the workshop");
    expect(copy.liveLabel).toBeNull();
    expect(copy.ledgerLabels.rules).toEqual(LABELS.rules);
  });
});

describe("heroLiveLine", () => {
  const words = { liveLabel: "Live · build {commit}", previewLabel: "Preview build {commit}", localLabel: "Local development build" };

  it("says live only for the production deployment", () => {
    expect(heroLiveLine({ commit: "0091d34", environment: "production" }, words)).toBe("Live · build 0091d34");
  });

  it("says preview, not live, on a preview deployment — a preview is not the live site", () => {
    expect(heroLiveLine({ commit: "b602718", environment: "preview" }, words)).toBe("Preview build b602718");
    expect(heroLiveLine({ commit: "b602718", environment: null }, words)).toBe("Preview build b602718");
  });

  it("says it is a local build when there is no deployment", () => {
    expect(heroLiveLine(null, words)).toBe("Local development build");
  });

  it("shows nothing where the owner has written no wording for that case", () => {
    expect(heroLiveLine({ commit: "0091d34", environment: "production" }, { liveLabel: null, previewLabel: null, localLabel: null })).toBeNull();
    expect(heroLiveLine(null, { liveLabel: null, previewLabel: null, localLabel: null })).toBeNull();
  });
});

describe("heroStack", () => {
  const skills = [
    { name: "GitHub", categoryKey: "infra", systemCount: 11 },
    { name: "Python", categoryKey: "languages", systemCount: 5 },
    { name: "TypeScript", categoryKey: "languages", systemCount: 3 },
    { name: "Next.js", categoryKey: "frontend", systemCount: 3 },
    { name: "PostgreSQL", categoryKey: "database", systemCount: 3 },
    { name: "Prisma", categoryKey: "backend", systemCount: 3 },
    { name: "Vitest", categoryKey: "testing", systemCount: 3 },
    { name: "Java", categoryKey: "languages", systemCount: 0 },
  ];

  it("draws from the chosen categories, most used first, ties by name", () => {
    expect(heroStack(skills, "languages,frontend,backend,database,ai-ml", 6)).toEqual(["Python", "Next.js", "PostgreSQL", "Prisma", "TypeScript"]);
  });

  it("leaves out categories that were not chosen and skills no system uses", () => {
    const names = heroStack(skills, "languages,frontend,backend,database,ai-ml", 12);
    expect(names).not.toContain("GitHub"); // infra
    expect(names).not.toContain("Vitest"); // testing
    expect(names).not.toContain("Java"); // used by nothing
  });

  it("limits to the count, and a count of 0 or no categories shows nothing", () => {
    expect(heroStack(skills, "languages", 1)).toEqual(["Python"]);
    expect(heroStack(skills, "languages", 0)).toEqual([]);
    expect(heroStack(skills, " , ", 6)).toEqual([]);
  });

  it("is forgiving about case and spacing in the setting", () => {
    expect(heroStack(skills, " Languages , DATABASE ", 6)).toEqual(["Python", "PostgreSQL", "TypeScript"]);
  });
});

describe("heroCredential", () => {
  const titles = [
    { label: "Software & AI Engineer", detail: null },
    { label: "Final-year BSc Computer Science & Mathematics student", detail: "North-West University" },
  ];

  it("is the first title that isn't the role, with its detail", () => {
    expect(heroCredential(titles, "Software & AI Engineer")).toBe("Final-year BSc Computer Science & Mathematics student · North-West University");
  });

  it("ignores case and spacing when comparing to the role", () => {
    expect(heroCredential(titles, "  software & ai engineer ")).toBe("Final-year BSc Computer Science & Mathematics student · North-West University");
  });

  it("is null when the owner has no other title", () => {
    expect(heroCredential([titles[0]!], "Software & AI Engineer")).toBeNull();
    expect(heroCredential([], "Software & AI Engineer")).toBeNull();
  });

  it("leaves out a missing detail", () => {
    expect(heroCredential([{ label: "Founder", detail: null }], "Engineer")).toBe("Founder");
  });
});

describe("heroEntranceVars", () => {
  it("turns the settings into CSS custom properties", () => {
    expect(heroEntranceVars(450, 70)).toEqual({ "--hero-d": "450ms", "--hero-s": "70ms" });
  });

  it("never goes negative; zero means no entrance", () => {
    expect(heroEntranceVars(-5, 0)).toEqual({ "--hero-d": "0ms", "--hero-s": "0ms" });
  });
});
