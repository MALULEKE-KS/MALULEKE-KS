// The guide's chat opens with questions about the page the visitor is on.

import { describe, expect, it } from "vitest";
import { questionsFor } from "@/lib/guide/suggestions";

const pages = [
  { page: "/systems/", questions: ["About this system?"] },
  { page: "/systems", questions: ["Which system first?"] },
  { page: "/about", questions: ["What makes him different?"] },
];

describe("questionsFor", () => {
  it("a system page gets the system questions, the catalog its own", () => {
    expect(questionsFor("/systems/xkimi-xa-mali", pages)).toEqual(["About this system?"]);
    expect(questionsFor("/systems", pages)).toEqual(["Which system first?"]);
  });
  it("an exact page matches only itself", () => {
    expect(questionsFor("/about", pages)).toEqual(["What makes him different?"]);
    expect(questionsFor("/about-us", pages)).toEqual([]);
  });
  it("no match, no page questions", () => {
    expect(questionsFor("/", pages)).toEqual([]);
    expect(questionsFor("/journey", [])).toEqual([]);
  });
});
