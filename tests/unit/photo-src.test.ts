// tests/unit/photo-src.test.ts
// The owner's photos at the size they are drawn (the speed pass): the platform's own versioned photo links
// get a srcset of the route's widths, never wider than the original; any other address is used as it is.

import { describe, expect, it } from "vitest";
import { photoSrcSet } from "@/lib/media/photo-src";

describe("photo srcsets", () => {
  it("offers the route's widths below the original, and the original itself", () => {
    const set = photoSrcSet("/api/v1/profile/photo/hero-mobile?v=00dc4e794122", 1280);
    expect(set).toBe(
      "/api/v1/profile/photo/hero-mobile?v=00dc4e794122&w=480 480w, /api/v1/profile/photo/hero-mobile?v=00dc4e794122&w=768 768w, /api/v1/profile/photo/hero-mobile?v=00dc4e794122&w=1080 1080w, /api/v1/profile/photo/hero-mobile?v=00dc4e794122 1280w",
    );
  });
  it("leaves any other address alone", () => {
    expect(photoSrcSet("https://example.com/a.jpg", 1280)).toBeUndefined();
    expect(photoSrcSet("/api/v1/profile/photo/about", 1280)).toBeUndefined();
  });
});
