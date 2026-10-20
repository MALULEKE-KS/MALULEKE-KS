// The new home hero's copy and computed facts (lib/home/hero.ts): only real
// figures, each labelled to agree with its number, the owner's wording over
// the shipped one, and an honest live line.

import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_COPY, heroCopy, heroEntranceVars, heroLedger, heroLiveLine, heroV2Active } from "@/lib/home/hero";

describe("heroLedger", () => {
  it("lists every figure with its label, in order, and the evidence that backs it", () => {
    expect(heroLedger({ systemsPublished: 11, rulesEnforced: 20, auditedThisWeek: 66, organisations: 2 })).toEqual([
      { key: "systems", value: 11, label: "systems published", evidenceKey: null },
      { key: "rules", value: 20, label: "rules the database enforces", evidenceKey: "pulse:rulesEnforcedByDatabase" },
      { key: "audited", value: 66, label: "changes audited this week", evidenceKey: "pulse:auditEventsLast7Days" },
      { key: "organisations", value: 2, label: "organisations founded", evidenceKey: null },
    ]);
  });

  it("never shows a zero as proof", () => {
    const items = heroLedger({ systemsPublished: 3, rulesEnforced: 0, auditedThisWeek: 0, organisations: 1 });
    expect(items.map((i) => i.value)).toEqual([3, 1]);
  });

  it("makes each label agree with a count of one", () => {
    const items = heroLedger({ systemsPublished: 1, rulesEnforced: 1, auditedThisWeek: 1, organisations: 1 });
    expect(items.map((i) => i.label)).toEqual(["system published", "rule the database enforces", "change audited this week", "organisation founded"]);
  });

  it("is empty when nothing has been counted", () => {
    expect(heroLedger({ systemsPublished: 0, rulesEnforced: 0, auditedThisWeek: 0, organisations: 0 })).toEqual([]);
  });

  it("uses the owner's labels when given", () => {
    const labels = {
      systems: { one: "project", many: "projects" },
      rules: { one: "rule", many: "rules" },
      audited: { one: "edit", many: "edits" },
      organisations: { one: "company", many: "companies" },
    };
    expect(heroLedger({ systemsPublished: 1, rulesEnforced: 2, auditedThisWeek: 0, organisations: 2 }, labels).map((i) => i.label)).toEqual(["project", "rules", "companies"]);
  });
});

describe("heroCopy", () => {
  it("falls back to the shipped wording when no block is written", () => {
    expect(heroCopy(null)).toEqual(DEFAULT_HERO_COPY);
    expect(heroCopy(undefined)).toEqual(DEFAULT_HERO_COPY);
  });

  it("lets the owner's wording win field by field", () => {
    const copy = heroCopy({ primaryLabel: "Explore the systems", secondaryLabel: "  " });
    expect(copy.primaryLabel).toBe("Explore the systems");
    expect(copy.secondaryLabel).toBe(DEFAULT_HERO_COPY.secondaryLabel); // blank = not written
    expect(copy.liveLabel).toBe(DEFAULT_HERO_COPY.liveLabel);
  });
});

describe("heroLiveLine", () => {
  it("names the running build", () => {
    expect(heroLiveLine({ commit: "0091d34" })).toBe("Live · build 0091d34");
  });

  it("fills the owner's template", () => {
    expect(heroLiveLine({ commit: "0091d34" }, { liveLabel: "Running build {commit}", localLabel: "x" })).toBe("Running build 0091d34");
  });

  it("is honest when there is no deployment", () => {
    expect(heroLiveLine(null)).toBe("Local development build");
  });
});

describe("heroV2Active", () => {
  it("shows when the flag is on, in any environment", () => {
    expect(heroV2Active({ flagOn: true, preview: undefined, environment: "production" })).toBe(true);
  });

  it("previews with ?hero=v2 outside production", () => {
    expect(heroV2Active({ flagOn: false, preview: "v2", environment: undefined })).toBe(true); // local
    expect(heroV2Active({ flagOn: false, preview: "v2", environment: "preview" })).toBe(true); // a Vercel preview
    expect(heroV2Active({ flagOn: false, preview: ["v2"], environment: "preview" })).toBe(true);
  });

  it("never previews on production — a visitor cannot reach the hero early", () => {
    expect(heroV2Active({ flagOn: false, preview: "v2", environment: "production" })).toBe(false);
  });

  it("stays on the previous hero by default and for any other value", () => {
    expect(heroV2Active({ flagOn: false, preview: undefined, environment: "preview" })).toBe(false);
    expect(heroV2Active({ flagOn: false, preview: "v1", environment: "preview" })).toBe(false);
    expect(heroV2Active({ flagOn: false, preview: "", environment: undefined })).toBe(false);
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
