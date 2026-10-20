// The home hero's data (docs/improvements/HOME-HERO-PLAN.md): the rebuilt hero is
// the hero (its switch is retired, D-038), the owner's block is seeded and valid, and the hero photographs are
// the public site's data — current photos of their slots, within the weight
// budgets, with no metadata, readable through the public role.

import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { db, dbPublic } from "@/lib/db";
import { getContentBlock } from "@/lib/content/blocks";
import { heroCopy } from "@/lib/home/hero";
import { getPublicPhotos } from "@/lib/queries/profile";

const KIB = 1024;
// The plan's budgets (HOME-HERO-PLAN §7, D-034): weight is law, not a hope — the cover image is the page's largest paint.
const BUDGET = { "hero-desktop": 100 * KIB, "hero-mobile": 80 * KIB } as const;

describe("home hero — content", () => {
  it("has retired its switch: the rebuilt hero replaced the previous one, so the old flag says so and nothing reads it", async () => {
    const flag = await db.flag.findUnique({ where: { key: "home.hero_v2" } });
    // The row stays (migrations only add); it is on and described as retired, so no toggle in the admin pretends to do anything.
    expect(flag?.enabled).toBe(true);
    expect(flag?.notes).toMatch(/^Retired/);
  });

  it("seeds the owner's statement, wording and credit as a valid content block", async () => {
    const block = await getContentBlock("home-hero");
    expect(block, "the home-hero block parses against its schema").not.toBeNull();
    expect(block?.statement).toMatch(/\w/);
    // A number in a sentence goes stale; the figures live in the computed record.
    expect(block?.statement, "the statement carries no figure").not.toMatch(/\d/);
    expect(block?.ledgerLabels?.systems?.many).toBe("systems published");
    expect(block?.ledgerLabels?.shipped?.many).toBe("systems shipped to production");
    expect(block?.nowLabel).toBe("Building now");
    // The line above the name is true to where the page runs: live, preview and local each have the owner's own wording.
    expect(block?.liveLabel).toMatch(/\{commit\}/);
    expect(block?.previewLabel).toMatch(/\{commit\}/);
    expect(block?.localLabel).toBeTruthy();
    // The record is the proof of the statement: three claims over their figures; the catalogue size supports.
    expect(block?.ledgerLabels?.shipped?.claim).toBe("Runs in production");
    expect(block?.ledgerLabels?.rules?.claim).toBe("Enforces its own rules");
    expect(block?.ledgerLabels?.audited?.claim).toBe("Shows its proof");
    expect(block?.ledgerLabels?.systems?.claim).toBeUndefined();
    expect(heroCopy(block).ledgerLabels.rules?.claim).toBe("Enforces its own rules");
    // No credit is shown on the image unless the owner writes one (his decision, 2026-10-20).
    expect(block?.imageCredit).toBeUndefined();
    // The seeded wording is what the page would show on its own.
    expect(heroCopy(block).primaryLabel).toBe(block?.primaryLabel);
  });
});

describe("home hero — photographs", () => {
  it("has a current photo for each slot, readable by the public role", async () => {
    const rows = await dbPublic.publicProfilePhoto.findMany({ where: { purpose: { in: ["hero-desktop", "hero-mobile"] } } });
    expect(rows.map((r) => r.purpose).sort()).toEqual(["hero-desktop", "hero-mobile"]);
    for (const r of rows) expect(r.mimeType).toBe("image/webp");
  });

  it("keeps each within its weight budget, with no metadata, in the right orientation", async () => {
    const rows = await dbPublic.publicProfilePhoto.findMany({ where: { purpose: { in: ["hero-desktop", "hero-mobile"] } } });
    for (const r of rows) {
      const budget = BUDGET[r.purpose as keyof typeof BUDGET];
      expect(r.byteSize, `${r.purpose} is ${(r.byteSize / KIB).toFixed(1)} KiB`).toBeLessThanOrEqual(budget);
      expect(r.fileData.length).toBe(r.byteSize);
      const meta = await sharp(r.fileData).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect([meta.width, meta.height]).toEqual([r.width, r.height]);
      // desktop is landscape, phones portrait — the cover image fills the hero either way
      if (r.purpose === "hero-desktop") expect(r.width).toBeGreaterThan(r.height);
      else expect(r.height).toBeGreaterThan(r.width);
    }
  });

  it("serves a cache-safe link to each, keyed by the photo's hash", async () => {
    const photos = await getPublicPhotos();
    for (const purpose of ["hero-desktop", "hero-mobile"]) {
      expect(photos[purpose]?.url).toMatch(new RegExp(`^/api/v1/profile/photo/${purpose}\\?v=[0-9a-f]{12}$`));
      expect(photos[purpose]?.width).toBeGreaterThan(0);
    }
  });
});
