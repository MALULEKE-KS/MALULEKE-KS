// @vitest-environment node
// tests/unit/client-bundle-zod.test.ts
// First-load weight (spec WP-102): zod is ~95 KB gzip and only the server and the contact form
// need it. A browser component that imports a module carrying zod pulls it onto every page — as the
// tour card did through lib/guide/tour.ts. Bundle every public client component and fail if one
// outside the contact form reaches zod.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const ALLOWED = [/[\\/]contact[\\/]_components[\\/]/]; // the contact form validates in the browser

function tsxFiles(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) tsxFiles(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("the browser's first load", () => {
  it("does not carry zod, except on the contact form", async () => {
    const files = [...tsxFiles("components"), ...tsxFiles(join("app", "(public)"))].filter((f) => /^\s*["']use client["']/m.test(readFileSync(f, "utf8").slice(0, 600)));
    expect(files.length).toBeGreaterThan(30);
    const offenders: string[] = [];
    for (const file of files) {
      if (ALLOWED.some((re) => re.test(file))) continue;
      const result = await build({
        entryPoints: [file],
        bundle: true,
        write: false,
        metafile: true,
        platform: "browser",
        format: "esm",
        jsx: "automatic",
        logLevel: "silent",
        alias: { "@": "." },
        // The libraries a component uses but whose weight isn't this test's business.
        external: ["react", "react/*", "react-dom", "react-dom/*", "next/*", "motion/*", "lucide-react", "@radix-ui/*", "radix-ui", "@ai-sdk/react", "ai", "class-variance-authority", "clsx", "tailwind-merge", "sonner", "@vercel/*", "ogl", "three"],
      });
      if (Object.keys(result.metafile.inputs).some((i) => /node_modules[\\/]zod[\\/]/.test(i))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  }, 120_000);
});
