// tests/unit/guide-gaps.test.ts
// The question log (docs/AI-GUIDE-PHASE2-PLAN.md §4 B3): what is removed before a
// question is kept, and which answers count as "the site couldn't say".

import { describe, expect, it } from "vitest";
import { looksUnanswered, scrubQuestion } from "@/lib/guide/gaps";

describe("scrubQuestion — contact details never reach the log", () => {
  it.each([
    ["Can you tell Sam at sam.k+work@example.co.za I called?", "Can you tell Sam at [email] I called?"],
    ["My number is +27 82 123 4567, call me", "My number is [number], call me"],
    ["call 082-123-4567 please", "call [number] please"],
    ["see https://example.com/me?id=4 and www.example.org/x", "see [link] and [link]"],
    ["ping me @kurhula_fan or @x1", "ping me [handle] or [handle]"],
    ["my id is 9001015009087 ok", "my id is [number] ok"],
    ["card 4111 1111 1111 1111 expires soon", "card [number] expires soon"],
  ])("%s", (raw, expected) => {
    expect(scrubQuestion(raw, 300)).toBe(expected);
  });

  it("keeps ordinary numbers, dates and the words themselves", () => {
    expect(scrubQuestion("Did he win anything in 2023 with 3 teammates?", 300)).toBe("Did he win anything in 2023 with 3 teammates?");
  });

  it("collapses whitespace and shortens a long question", () => {
    expect(scrubQuestion("  one\n\n two   three ", 300)).toBe("one two three");
    const long = scrubQuestion("word ".repeat(200), 120);
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("looksUnanswered — the guide saying the site can't answer, and sending the visitor to him", () => {
  it.each([
    "That isn't on the site, so I don't want to guess — the contact form at /contact will reach him.",
    "I don't have that about him. You could ask him directly through the contact form.",
    "There's no record of a Google internship in his data; ask him via /contact.",
    "His favourite food isn't listed anywhere I can see — try /contact.",
    "I don't know that. It's not in his published profile, but you can reach out to him at /contact.",
  ])("yes: %s", (answer) => {
    expect(looksUnanswered(answer)).toBe(true);
  });

  it.each([
    "He built Xkimi Xa Mali, a savings collective platform. See /systems/xkimi-xa-mali.",
    "A view is a stored query; a table stores rows. I don't have a preference, but I'd use a view here.",
    "You can reach him at /contact — the form is reviewed within 48 hours.",
    "I can't write your whole essay, but here is an outline.",
    "I don't know the answer to that riddle, sorry!",
  ])("no: %s", (answer) => {
    expect(looksUnanswered(answer)).toBe(false);
  });
});
