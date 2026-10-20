// The rebuilt home hero's data (docs/improvements/HOME-HERO-PLAN.md): the flag
// ships off, the owner's block is seeded and valid, and the hero photographs are
// the public site's data — current photos of their slots, within the weight
// budgets, with no metadata, readable through the public role.

import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { db, dbPublic } from "@/lib/db";
import { getContentBlock } from "@/lib/content/blocks";
import { heroCopy } from "@/lib/home/hero";
import { getPublicPhotos } from "@/lib/queries/profile";

const KIB = 1024;
// The plan's budgets (HOME-HERO-PLAN §7): weight is law, not a hope.
const BUDGET = { "hero-desktop": 90 * KIB, "hero-mobile": 60 * KIB } as const;

describe("home hero — flag and content", () => {
  it("ships the flag off, so the previous hero stays until the owner switches it on", async () => {
    const flag = await db.flag.findUnique({ where: { key: "home.hero_v2" } });
    expect(flag).not.toBeNull();
    expect(flag?.enabled).toBe(false);
  });

  it("seeds the owner's statement, wording and credit as a valid content block", async () => {
    const block = await getContentBlock("home-hero");
    expect(block, "the home-hero block parses against its schema").not.toBeNull();
    expect(block?.statement).toMatch(/\w/);
    expect(block?.ledgerLabels?.systems.many).toBe("systems published");
    expect(block?.imageCredit).toMatch(/Unsplash/);
    expect(block?.imageCreditUrl?.startsWith("https://")).toBe(true);
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

  it("keeps each within its weight budget, with no metadata, at the right shape", async () => {
    const rows = await dbPublic.publicProfilePhoto.findMany({ where: { purpose: { in: ["hero-desktop", "hero-mobile"] } } });
    for (const r of rows) {
      const budget = BUDGET[r.purpose as keyof typeof BUDGET];
      expect(r.byteSize, `${r.purpose} is ${(r.byteSize / KIB).toFixed(1)} KiB`).toBeLessThanOrEqual(budget);
      expect(r.fileData.length).toBe(r.byteSize);
      const meta = await sharp(r.fileData).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect([meta.width, meta.height]).toEqual([r.width, r.height]);
      const ratio = r.width / r.height;
      // desktop is a wide band (21:9), phones a portrait (4:5)
      if (r.purpose === "hero-desktop") expect(ratio).toBeCloseTo(21 / 9, 1);
      else expect(ratio).toBeCloseTo(4 / 5, 1);
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
