// tests/unit/screenshot-src.test.ts
// Screenshots at the size they are drawn (D-062): the platform's own versioned links get a
// srcset of the widths the route serves; any other address is used as it is.

import { describe, expect, it } from "vitest";
import { SCREENSHOT_WIDTHS, screenshotSrc } from "@/lib/media/screenshot-src";

describe("screenshotSrc", () => {
  it("offers each served width for a versioned screenshot", () => {
    const got = screenshotSrc("/api/v1/systems/xkimi-xa-mali/screenshot?v=bcb42a1a2bfd", "100vw");
    expect(got.src).toBe("/api/v1/systems/xkimi-xa-mali/screenshot?v=bcb42a1a2bfd&w=800");
    expect(got.srcSet?.split(", ")).toHaveLength(SCREENSHOT_WIDTHS.length);
    expect(got.srcSet).toContain("&w=480 480w");
    expect(got.sizes).toBe("100vw");
  });

  it("leaves any other address alone", () => {
    expect(screenshotSrc("https://example.com/shot.png", "100vw")).toEqual({ src: "https://example.com/shot.png" });
    expect(screenshotSrc("/api/v1/systems/x/screenshot", "100vw")).toEqual({ src: "/api/v1/systems/x/screenshot" });
  });
});
