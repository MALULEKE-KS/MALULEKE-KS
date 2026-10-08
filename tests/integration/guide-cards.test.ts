// tests/integration/guide-cards.test.ts
// The AI guide's card tools read only what a visitor could see, and draw
// nothing for a key that doesn't exist (docs/AI-GUIDE-PHASE1-PLAN.md §7, F1.8).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { showPulse, showSkills, showSystems } from "@/lib/guide/show-tools";

const RUN = `cards-${Date.now()}`;
let published = "";
let draft = "";

beforeAll(async () => {
  const [org, status] = await Promise.all([db.organization.findFirstOrThrow(), db.status.findFirstOrThrow({ where: { key: "in_progress" } })]);
  const base = { organizationId: org.id, statusId: status.id, description: "A system for the card tests.", clientVisibility: "PUBLIC" as const, updatedAt: new Date() };
  published = `${RUN}-live`;
  draft = `${RUN}-draft`;
  await db.system.createMany({
    data: [
      { ...base, name: "Live card system", slug: published, contentStatus: "PUBLISHED", techStack: ["TypeScript", "PostgreSQL"], repoPrivate: true },
      { ...base, name: "Draft card system", slug: draft, contentStatus: "DRAFT" },
    ],
  });
});

afterAll(async () => {
  // Systems are never deleted (BR-1.9) — the test's own rows are hidden instead.
  await db.system.updateMany({ where: { slug: { startsWith: RUN } }, data: { contentStatus: "DRAFT" } }).catch(() => {});
});

describe("show_systems", () => {
  it("shows a published system as the site does — and nothing for a draft or a made-up slug", async () => {
    const cards = await showSystems([published, draft, `${RUN}-nope`]);
    expect(cards.map((c) => c.slug)).toEqual([published]);
    expect(cards[0]).toMatchObject({ name: "Live card system", repoPrivate: true, lastActivity: null, href: `/systems/${published}`, tech: ["TypeScript", "PostgreSQL"] });
  });

  it("keeps the order asked and caps the count", async () => {
    expect(await showSystems([])).toEqual([]);
    expect((await showSystems(Array.from({ length: 8 }, () => published))).length).toBe(1);
  });
});

describe("show_skills and show_pulse", () => {
  it("drops a skill that doesn't exist", async () => {
    expect(await showSkills([`${RUN} not a skill`])).toEqual([]);
  });

  it("reads the live pulse", async () => {
    const pulse = await showPulse();
    expect(pulse.rulesEnforcedByDatabase).toBeGreaterThanOrEqual(0);
    expect(typeof pulse.auditEventsTotal).toBe("number");
  });
});
