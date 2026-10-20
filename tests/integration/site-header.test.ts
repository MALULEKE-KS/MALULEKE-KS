// The public header's data (docs/improvements/HOME-HERO-PLAN.md §17): its own
// wording is the owner's "site-header" block (so no label lives in a component),
// and its Systems preview is real — the owner's featured systems from the public
// views, with their status, and the true count of published systems.

import { describe, expect, it } from "vitest";
import { dbPublic } from "@/lib/db";
import { getContentBlock } from "@/lib/content/blocks";
import { SETTINGS } from "@/lib/settings/registry";
import { getHeaderSystems } from "@/lib/queries/header";

describe("site header — wording is data", () => {
  it("seeds every label as a valid content block, so nothing in the header is typed in code", async () => {
    const block = await getContentBlock("site-header");
    expect(block, "the site-header block parses against its schema").not.toBeNull();
    expect(block?.contactLabel).toBeTruthy();
    expect(block?.cvLabel).toBeTruthy();
    expect(block?.homeLabel).toBeTruthy();
    expect(block?.skipLabel, "keyboard users keep their skip link").toBeTruthy();
    expect(block?.systemsPreviewLabel).toBeTruthy();
    expect(block?.systemsAllLabel).toMatch(/\{count\}/);
  });
});

describe("site header — the Systems preview is real", () => {
  it("shows no more than the setting allows, each with its own status", async () => {
    const limit = SETTINGS["header.systemsPreview.count"].default;
    const { systems } = await getHeaderSystems(limit);
    expect(systems.length).toBeLessThanOrEqual(limit);
    for (const s of systems) {
      expect(s.slug).toBeTruthy();
      expect(s.statusLabel).toBeTruthy();
      expect(s.statusColorToken).toBeTruthy();
    }
  });

  it("counts every published system for the 'all systems' link", async () => {
    const { total } = await getHeaderSystems(3);
    expect(total).toBe(await dbPublic.publicSystem.count());
  });

  it("shows only systems a visitor can open — the public view's own rows", async () => {
    const { systems } = await getHeaderSystems(6);
    const published = new Set((await dbPublic.publicSystem.findMany({ select: { slug: true } })).map((r) => r.slug));
    for (const s of systems) expect(published.has(s.slug), `${s.slug} is published`).toBe(true);
  });

  it("is empty with a setting of 0", async () => {
    expect(await getHeaderSystems(0)).toEqual({ systems: [], total: 0 });
  });
});
