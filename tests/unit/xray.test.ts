// tests/unit/xray.test.ts
// The X-ray (D-067) may only say what is true: its manifest is the capability map and the
// enforcement register as committed, every section it labels is marked on the page, every
// capability on a covered page names its section, and every rule it names is in the register.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@/lib/capabilities/map";
import { buildXray, parseRegister, plain, ruleIds } from "@/lib/xray/build";
import { edgeRegion, fill, receiptCopy, renderedAt, xrayCopy } from "@/lib/xray/copy";
import { XRAY_PAGES } from "@/lib/xray/sections";

const register = readFileSync("docs/ENFORCEMENT-REGISTER.md", "utf8");

describe("the X-ray's manifest", () => {
  it("is current — regenerate with npm run docs:capabilities", () => {
    const committed = JSON.parse(readFileSync("lib/xray/home.generated.json", "utf8"));
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildXray("/", register))));
  });

  it("gives every section of a covered page at least one capability", () => {
    for (const page of Object.keys(XRAY_PAGES)) {
      for (const s of buildXray(page, register).sections) expect(s.capabilities.length, `${page} ${s.key}`).toBeGreaterThan(0);
    }
  });

  it("knows where every capability shown on a covered page sits", () => {
    for (const [page, sections] of Object.entries(XRAY_PAGES)) {
      const keys = new Set(sections.map((s) => s.key));
      for (const c of CAPABILITIES) {
        for (const f of c.frontend) {
          if (f.page !== page) continue;
          expect(f.xray, `${c.id}: "${f.section}" needs an xray section`).toBeDefined();
          expect(keys.has(f.xray!), `${c.id}: unknown section "${f.xray}"`).toBe(true);
        }
      }
    }
  });

  it("finds every rule it names in the enforcement register", () => {
    const m = buildXray("/", register);
    const named = new Set(m.sections.flatMap((s) => s.capabilities.flatMap((c) => c.rules)));
    for (const id of named) expect(m.rules[id], `${id} has no row in docs/ENFORCEMENT-REGISTER.md`).toBeDefined();
  });

  it("is marked on the home page, section by section, and points at real source files", () => {
    const home = readFileSync("app/(public)/_components/HomeContent.tsx", "utf8");
    for (const s of XRAY_PAGES["/"]!) {
      expect(home, `data-xray="${s.key}"`).toContain(`data-xray="${s.key}"`);
      expect(() => readFileSync(s.source)).not.toThrow();
    }
  });
});

describe("reading the register", () => {
  it("expands combined rule cells", () => {
    expect(ruleIds("BR-4.1, 4.2, 4.4")).toEqual(["BR-4.1", "BR-4.2", "BR-4.4"]);
    expect(ruleIds("LT-1/2")).toEqual(["LT-1", "LT-2"]);
    expect(ruleIds("BR-2.1 / LT-6")).toEqual(["BR-2.1", "LT-6"]);
    expect(ruleIds("BR-4.3 (measured), BR-5.2")).toEqual(["BR-4.3", "BR-5.2"]);
    expect(ruleIds("F5c GitHub knowledge")).toEqual([]);
  });

  it("reads a rule's claim, layer and status", () => {
    const rules = parseRegister(register);
    expect(rules["BR-1.1"]![0]).toMatchObject({ layer: "App + DB CHECK", status: "enforced" });
    expect(rules["BR-1.1"]![0]!.claim).not.toMatch(/[`*]/);
  });

  it("writes markdown as one plain line, cut at a word", () => {
    expect(plain("**Revised:** the `PublicSystem` view [link](https://x)")).toBe("Revised: the PublicSystem view link");
    expect(plain("one two three four five", 12)).toBe("one two…");
  });
});

describe("the receipt's words", () => {
  it("hides what the owner leaves empty, and the X-ray without a switch label", () => {
    expect(receiptCopy(null).renderedLabel).toBeNull();
    expect(xrayCopy(null)).toBeNull();
    expect(xrayCopy({ switchLabel: "  " })).toBeNull();
    expect(xrayCopy({ switchLabel: "See how this page works" })?.switchLabel).toBe("See how this page works");
    expect(fill("build {commit}", "commit", "4ef558a")).toBe("build 4ef558a");
    expect(fill(null, "commit", "4ef558a")).toBeNull();
  });

  it("names the edge from Vercel's request id, and nothing it can't read", () => {
    expect(edgeRegion("cpt1::iad1::abc12-1729771234567-0123456789ab")).toBe("Cape Town (cpt1)");
    expect(edgeRegion("zzz9::abc")).toBe("zzz9");
    expect(edgeRegion(null)).toBeNull();
    expect(edgeRegion("not-an-id")).toBeNull();
  });

  it("writes the render time in the site's zone", () => {
    const t = new Date("2026-10-24T12:05:00Z");
    expect(renderedAt(t, "Africa/Johannesburg")).toMatch(/^14:05/);
    expect(renderedAt(t, "Not/AZone")).toMatch(/^12:05/);
  });
});
