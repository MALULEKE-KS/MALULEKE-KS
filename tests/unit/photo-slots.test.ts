// The photo slots (lib/profile/photos.ts): the home hero's two slots name real,
// valid settings for how an upload is sized and encoded, and the encoder honours
// the quality it is given. A new slot is one entry — these tests keep that honest.

import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { isPhotoPurpose, PHOTO_PURPOSES, photoProcessing, PhotoRejected, processPhoto } from "@/lib/profile/photos";
import { SETTINGS } from "@/lib/settings/registry";

describe("photo slots", () => {
  it("has the hero's two slots next to the About portrait", () => {
    expect(Object.keys(PHOTO_PURPOSES)).toEqual(expect.arrayContaining(["about", "hero-desktop", "hero-mobile"]));
    expect(isPhotoPurpose("hero-desktop")).toBe(true);
    expect(isPhotoPurpose("hero-tablet")).toBe(false);
  });

  it("points every slot's processing at settings that exist, are numbers and are valid at their default", () => {
    for (const purpose of Object.keys(PHOTO_PURPOSES) as (keyof typeof PHOTO_PURPOSES)[]) {
      const slot = photoProcessing(purpose);
      if (!slot) continue;
      for (const key of [slot.maxEdgeSetting, slot.qualitySetting]) {
        const def = SETTINGS[key];
        expect(def, `${purpose} → ${key}`).toBeDefined();
        expect(typeof def.default).toBe("number");
        expect(def.schema.safeParse(def.default).success).toBe(true);
      }
    }
  });

  it("uses the global photo settings for a slot that names none", () => {
    expect(photoProcessing("about")).toBeNull();
    expect(photoProcessing("hero-desktop")).toEqual({
      maxEdgeSetting: "home.hero.desktop.maxEdgePixels",
      qualitySetting: "home.hero.desktop.quality",
    });
  });

  it("gives phones a smaller image than desktops by default", () => {
    expect(SETTINGS["home.hero.mobile.maxEdgePixels"].default).toBeLessThan(SETTINGS["home.hero.desktop.maxEdgePixels"].default);
  });
});

describe("processPhoto", () => {
  // A noisy image, so quality visibly changes the size.
  const noise = async () => {
    const raw = Buffer.alloc(600 * 300 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
    return new Uint8Array(await sharp(raw, { raw: { width: 600, height: 300, channels: 3 } }).png().toBuffer());
  };

  it("honours the quality it is given", async () => {
    const bytes = await noise();
    const light = await processPhoto(bytes, 600, 40);
    const heavy = await processPhoto(bytes, 600, 90);
    expect(light.data.length).toBeLessThan(heavy.data.length);
    expect(light.mimeType).toBe("image/webp");
  });

  it("resizes to fit the edge and never enlarges", async () => {
    const bytes = await noise();
    const small = await processPhoto(bytes, 300);
    expect(Math.max(small.width, small.height)).toBe(300);
    const same = await processPhoto(bytes, 4000);
    expect(same.width).toBe(600);
  });

  it("drops all metadata", async () => {
    const withExif = new Uint8Array(await sharp(Buffer.from(await noise())).jpeg().withExif({ IFD0: { Copyright: "someone" } }).toBuffer());
    const out = await processPhoto(withExif, 600);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("refuses what is not an image", async () => {
    await expect(processPhoto(new TextEncoder().encode("not an image"), 600)).rejects.toBeInstanceOf(PhotoRejected);
  });
});
