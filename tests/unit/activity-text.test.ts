// Cards show recency only where it's honest (spec WP-108).

import { describe, expect, it } from "vitest";
import { activityText } from "@/lib/rules/activity";

describe("activityText", () => {
  it("recent commits are always worth saying", () => {
    expect(activityText({ stage: "shipped", commitsLast4Weeks: 3, lastPush: "2 days ago" })).toBe("3 commits in 4 weeks · last push 2 days ago");
    expect(activityText({ stage: "queued", commitsLast4Weeks: 1, lastPush: null })).toBe("1 commit in 4 weeks");
  });
  it("work still being built shows its last push, however long ago", () => {
    expect(activityText({ stage: "building", commitsLast4Weeks: 0, lastPush: "5 months ago" })).toBe("Last push 5 months ago");
    expect(activityText({ stage: "BUILDING", commitsLast4Weeks: 0, lastPush: null })).toBeNull();
  });
  it("finished or coursework work never advertises a stale push", () => {
    expect(activityText({ stage: "shipped", commitsLast4Weeks: 0, lastPush: "6 months ago" })).toBeNull();
    expect(activityText({ stage: "queued", commitsLast4Weeks: 0, lastPush: "7 months ago" })).toBeNull();
  });
});
