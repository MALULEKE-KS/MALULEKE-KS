// tests/unit/readme-to-text.test.ts
// The README excerpt the AI guide reads (F5c): prose kept, noise removed.

import { describe, expect, it } from "vitest";
import { readmeToText } from "@/lib/jobs/github-sync";

describe("readmeToText", () => {
  it("keeps the prose and drops badges, images, HTML, code, tables and link targets", () => {
    const md = [
      "# Graph Engine [![build](https://img.shields.io/badge/x.svg)](https://ci)",
      "",
      "<p align=center><img src=logo.png></p>",
      "A **fast** graph search engine for [route planning](https://example.com/docs).",
      "",
      "```bash",
      "npm install secret-internal-tool",
      "```",
      "| a | b |",
      "|---|---|",
    ].join("\n");
    const text = readmeToText(md);
    expect(text).toContain("Graph Engine");
    expect(text).toContain("A fast graph search engine for route planning.");
    for (const noise of ["![", "<img", "shields.io", "npm install", "|---|", "example.com/docs", "**"]) expect(text).not.toContain(noise);
  });

  it("cuts long READMEs at a word boundary", () => {
    const text = readmeToText("word ".repeat(2000), 100);
    expect(text.length).toBeLessThanOrEqual(101);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/wor…$/);
  });

  it("returns an empty string for an empty README", () => {
    expect(readmeToText("   \n\n")).toBe("");
  });
});
