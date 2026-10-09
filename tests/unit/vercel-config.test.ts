// tests/unit/vercel-config.test.ts — vercel.ts must carry its cron entry as
// literals (Vercel evaluates the file without the app's modules; an import
// arrived undefined and failed the deploy, #94). This keeps those literals
// equal to the scheduler's own constants.

import { describe, expect, it } from "vitest";
import { config } from "@/vercel";
import { CANARY_CRON_PATH, CANARY_CRON_SCHEDULE, DAILY_CRON_PATH, DAILY_CRON_SCHEDULE } from "@/lib/jobs/schedule";

describe("vercel.ts", () => {
  it("schedules exactly the crons the scheduler defines: the daily batch and the AI guide's canary", () => {
    expect(config.crons).toEqual([
      { path: DAILY_CRON_PATH, schedule: DAILY_CRON_SCHEDULE },
      { path: CANARY_CRON_PATH, schedule: CANARY_CRON_SCHEDULE },
    ]);
  });

  it("imports nothing from the application", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile("vercel.ts", "utf8");
    const imports = [...source.matchAll(/^import .* from "([^"]+)";?$/gm)].map((m) => m[1]);
    expect(imports.every((m) => m!.startsWith("@vercel/"))).toBe(true);
  });
});
