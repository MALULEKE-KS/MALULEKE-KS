// Let's Talk — the form's face (lib/inquiries/fields.ts) and its rules
// (lib/inquiries/forms.ts) must agree: every field shown is one the server
// accepts, every required field is shown, and a hidden field is never sent.

import { describe, expect, it } from "vitest";
import { CATEGORY_FORMS, type CategoryKey } from "@/lib/inquiries/forms";
import { CATEGORY_FIELDS, EMPTY_COMPENSATION, EMPTY_CONTACT, EMPTY_MEETING, FORM_SHAPE, buildDetails, collectIssues, progressOf, validateDraft, type Draft } from "@/lib/inquiries/fields";

const FORMS = Object.keys(CATEGORY_FORMS) as CategoryKey[];
const draft = (form: CategoryKey, values: Record<string, string> = {}, patch: Partial<Draft> = {}): Draft => ({
  form,
  values,
  compensation: EMPTY_COMPENSATION,
  meeting: EMPTY_MEETING,
  browserZone: "Africa/Johannesburg",
  ...patch,
});

describe("the field spec matches the server's schemas", () => {
  for (const form of FORMS) {
    const shape = CATEGORY_FORMS[form].shape as Record<string, unknown>;
    it(`${form}: every field shown is a field the server accepts`, () => {
      for (const f of CATEGORY_FIELDS[form]) expect(Object.keys(shape)).toContain(f.key);
    });
    it(`${form}: every server field has a place in the form`, () => {
      const shown = new Set(CATEGORY_FIELDS[form].map((f) => f.key));
      if (FORM_SHAPE[form].compensation) shown.add("compensation");
      if (FORM_SHAPE[form].meeting) shown.add("meeting");
      expect([...shown].sort()).toEqual(Object.keys(shape).sort());
    });
  }
});

describe("buildDetails", () => {
  it("sends only the fields that are shown", () => {
    // "On behalf of" shows only when hiring for someone else.
    const own = buildDetails(draft("recruitment", { jobTitle: "Engineer", representation: "own", representationNote: "stale" }));
    expect(own).not.toHaveProperty("representationNote");
    const client = buildDetails(draft("recruitment", { jobTitle: "Engineer", representation: "client", representationNote: "Acme" }));
    expect(client).toMatchObject({ representationNote: "Acme" });
  });
  it("trims, and drops what's blank", () => {
    expect(buildDetails(draft("service", { projectName: "  ", desiredOutcome: " A thing " }))).toMatchObject({ desiredOutcome: "A thing" });
    expect(buildDetails(draft("service", { projectName: "  " }))).not.toHaveProperty("projectName");
  });
  it("a range in money carries its currency; a commission doesn't", () => {
    const money = buildDetails(draft("service", {}, { compensation: { ...EMPTY_COMPENSATION, mode: "range", structure: "project", min: "1000" } }));
    expect(money.compensation).toEqual({ mode: "range", structure: "project", currency: "ZAR", min: 1000 });
    const commission = buildDetails(draft("service", {}, { compensation: { ...EMPTY_COMPENSATION, mode: "range", structure: "commission" } }));
    expect(commission.compensation).not.toHaveProperty("currency");
  });
  it("a scheduled meeting falls back to the visitor's zone", () => {
    const d = buildDetails(draft("recruitment", {}, { meeting: { ...EMPTY_MEETING, status: "scheduled", startsAtLocal: "2026-10-10T10:00" } }));
    expect(d.meeting).toMatchObject({ status: "scheduled", timeZone: "Africa/Johannesburg" });
  });
  it("the general form sends no category details", () => {
    expect(buildDetails(draft("general"))).toEqual({});
  });
});

describe("validateDraft", () => {
  const base = { contact: { ...EMPTY_CONTACT, name: "Ada", email: "ada@example.com" }, message: "x".repeat(25), needsSubtype: false, subtype: "", subtypeOther: "", fileBytes: 0, maxMegabytes: 10 };
  it("a complete general message passes", () => {
    expect(validateDraft({ ...base, draft: draft("general") })).toEqual({});
  });
  it("names the missing parts by the path the server uses", () => {
    const e = validateDraft({ ...base, draft: draft("service"), message: "short" });
    expect(e.message).toMatch(/20/);
    expect(e).toHaveProperty("details.desiredOutcome");
    expect(e).toHaveProperty("details.compensation.mode");
  });
  it("asks for a kind when the category has kinds, and a description for Other", () => {
    expect(validateDraft({ ...base, draft: draft("general"), needsSubtype: true })).toHaveProperty("subtype");
    expect(validateDraft({ ...base, draft: draft("general"), needsSubtype: true, subtype: "other" })).toHaveProperty("subtypeOther");
  });
  it("refuses attachments over the limit", () => {
    expect(validateDraft({ ...base, draft: draft("general"), fileBytes: 11 * 1024 * 1024 })).toHaveProperty("documents");
  });
});

describe("progressOf", () => {
  it("lists only the parts this category has", () => {
    expect(progressOf({ draft: draft("general"), contact: EMPTY_CONTACT, message: "" }).map((p) => p.key)).toEqual(["what", "you"]);
    expect(progressOf({ draft: draft("recruitment"), contact: EMPTY_CONTACT, message: "" }).map((p) => p.key)).toEqual(["what", "pay", "meeting", "you"]);
  });
  it("a part is done when its required answers are in", () => {
    const p = progressOf({
      draft: draft("growth", { objective: "Grow", timeline: "asap" }, { compensation: { ...EMPTY_COMPENSATION, mode: "discuss" } }),
      contact: { ...EMPTY_CONTACT, name: "Ada", email: "ada@example.com" },
      message: "x".repeat(25),
    });
    expect(p.every((s) => s.done)).toBe(true);
  });
});

describe("collectIssues", () => {
  it("keeps the first message per path", () => {
    expect(collectIssues([{ path: ["a", "b"], message: "one" }, { path: ["a", "b"], message: "two" }], "details.")).toEqual({ "details.a.b": "one" });
  });
});
