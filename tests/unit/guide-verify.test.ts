// tests/unit/guide-verify.test.ts
// The answer verifier (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2): what it finds in an
// answer, what it deliberately leaves alone, and that it never invents a flag
// for ordinary talk.

import { describe, expect, it } from "vitest";
import { verifyAnswer } from "@/lib/guide/verify";
import type { GuideCorpus } from "@/lib/guide/corpus";
import { techMentions } from "@/lib/guide/tech-lexicon";

const TEXT = `
## The owner (source: /about)
Name: Kurhula Maluleke
Building software: since 2025 — between 1 year and 2 years, depending on the month
## Systems — every published system (source: /systems)
Counts (computed): 5 systems published — 3 Live, 2 In progress; 2 with a private repository.
### Xkimi Xa Mali (source: /systems/xkimi-xa-mali)
Stack: TypeScript, Next.js, PostgreSQL, Prisma
Live: https://xkimi.example.org
### MALULEKE-KS (source: /systems/maluleke-ks)
Stack: TypeScript, Next.js, Postgres, Tailwind
## GitHub — every public repo (source: GitHub)
12 public repositories across his homes. Commits seen in the last 7 days: 14; last 30 days: 40.
Last push: 2026-10-06 (3 days ago)
## Education (source: /journey)
BSc Computer Science & Mathematics, North-West University — from 2024-03, expected 2027-11
## Contact (source: /contact)
Every message is reviewed within 48 hours.
Code: https://github.com/MALULEKE-KS/MALULEKE-KS
`;
const CORPUS: GuideCorpus = {
  text: TEXT,
  tokens: 200,
  paths: ["/", "/about", "/systems", "/journey", "/contact", "/cv", "/systems/xkimi-xa-mali", "/systems/maluleke-ks"],
  ownerName: "Kurhula Maluleke",
  ownerFirstName: "Kurhula",
  facts: { email: null, reviewSlaHours: 48, cv: [], systems: { total: 5, privateCount: 2, byStatus: [] }, pulse: { rulesEnforcedByDatabase: 1, auditEventsLast7Days: 1, auditEventsTotal: 1 } },
};
const NOW = new Date("2026-10-09T10:00:00Z");
const verify = (answer: string, question = "tell me about him", maxFlagged = 6) => verifyAnswer({ answer, question, corpus: CORPUS, maxFlagged, now: NOW });
const kinds = (answer: string, question?: string) => verify(answer, question).flagged.map((f) => `${f.kind}:${f.text}`);

describe("paths and links", () => {
  it("accepts the site's own pages and systems, with or without a section", () => {
    expect(kinds("See /systems/xkimi-xa-mali, /about#skills and /contact.")).toEqual([]);
    expect(verify("See /systems/xkimi-xa-mali and /contact.").checked).toBe(2);
  });

  it("flags a page or system that doesn't exist", () => {
    expect(kinds("It's at /systems/votechain.")).toEqual(["path:/systems/votechain"]);
    expect(kinds("Try /pricing")).toEqual([]); // not one of the site's page roots: not a claim about this site's pages
  });

  it("leaves file paths, API routes and fractions alone", () => {
    expect(kinds("Edit /etc/hosts, call /api/v1/guide, it's 1/2 done, and/or TCP/IP.")).toEqual([]);
  });

  it("accepts links that are in the knowledge, and prefixes of them, and flags the rest", () => {
    expect(kinds("Code: https://github.com/MALULEKE-KS/MALULEKE-KS and https://xkimi.example.org.")).toEqual([]);
    expect(kinds("Docs: https://github.com/MALULEKE-KS/MALULEKE-KS/blob/main/README.md")).toEqual([]);
    expect(kinds("Try https://evil.example/login")).toEqual(["link:https://evil.example/login"]);
  });

  it("ignores a link the visitor pasted themselves", () => {
    expect(kinds("That page, https://pasted.example/x, looks fine.", "what about https://pasted.example/x?")).toEqual([]);
  });
});

describe("technologies", () => {
  it("accepts a technology the data names, in either spelling of Postgres", () => {
    expect(kinds("He builds with TypeScript, Next.js and PostgreSQL.")).toEqual([]);
    expect(kinds("The platform runs on Postgres with Prisma.")).toEqual([]);
  });

  it("flags one the data never names, when the sentence says he uses it", () => {
    expect(kinds("He uses Kubernetes and Terraform in production.")).toEqual(["technology:Kubernetes", "technology:Terraform"]);
    expect(kinds("His platform is built with Rust.")).toEqual(["technology:Rust"]);
  });

  it("does not count a general statement, or a denial", () => {
    expect(kinds("Kubernetes is a container orchestrator that schedules workloads.")).toEqual([]);
    expect(kinds("There is no Kubernetes in his published stack.")).toEqual([]);
    expect(kinds("He hasn't used Terraform on the site.")).toEqual([]);
    expect(kinds("I don't see AWS listed anywhere in his data.")).toEqual([]);
  });

  it("does not count a technology a role asks for, or a gap named against him", () => {
    expect(kinds("This profile fits a backend role well, but the Kubernetes experience asked for here is beyond what the evidence supports.")).toEqual([]);
    expect(kinds("The role requires Terraform, and his data shows none of it yet.")).toEqual([]);
    expect(kinds("The gap is Ansible: he is missing that.")).toEqual([]);
    // …while a plain claim that he has it is still checked.
    expect(kinds("He runs his platform on Kubernetes.")).toEqual(["technology:Kubernetes"]);
  });

  it("keeps Java and JavaScript apart and ignores ordinary words", () => {
    expect(techMentions("He knows JavaScript well")).toEqual(["JavaScript"]);
    expect(techMentions("Go and rust the old gate; a ruby ring")).toEqual([]);
    expect(techMentions("C++ and C# and Next.js")).toEqual(expect.arrayContaining(["C++", "C#", "Next.js"]));
  });

  it("skips code blocks entirely", () => {
    expect(kinds("He wrote this:\n```ts\nimport Kubernetes from 'k8s';\n```\nSimple, right?")).toEqual([]);
  });
});

describe("years", () => {
  it("accepts years in the data and this year; flags others", () => {
    expect(kinds("He started in 2025 and graduates in 2027.")).toEqual([]);
    expect(kinds("He has been building since 2026.")).toEqual([]);
    expect(kinds("He graduated in 2021.")).toEqual(["year:2021"]);
  });

  it("doesn't hold the guide to a year the visitor said, only to its own", () => {
    expect(kinds("He studies at North-West University, so he did not finish in 2021.", "He graduated in 2021, right?")).toEqual([]);
  });
});

describe("numbers", () => {
  it("accepts a count the data contains, even through a synonym or an inserted word", () => {
    expect(kinds("He has 5 systems published.")).toEqual([]);
    expect(kinds("That's 5 projects in total.")).toEqual([]);
    expect(kinds("He has 12 repos on GitHub.")).toEqual([]);
    expect(kinds("He pushed 3 days ago, and 14 commits landed this week.")).toEqual([]);
    expect(kinds("Messages are answered within 48 hours.")).toEqual([]);
  });

  it("flags a count the data doesn't contain", () => {
    expect(kinds("He has 9 systems published.")).toEqual(["number:9 systems"]);
    expect(kinds("He made 300 commits last week.")).toEqual(["number:300 commits"]);
    expect(kinds("He has about 7 years of experience.")).toEqual(["number:7 years"]);
  });

  it("flags a money figure the data doesn't contain", () => {
    expect(kinds("He charges R450 per hour.")).toEqual(["figure:R450"]);
  });
});

describe("what it does not check", () => {
  it("sentences that aren't about him or the site", () => {
    expect(kinds("In 1969 the moon landing used 4 kilobytes of RAM and 12 engineers.")).toEqual([]);
    expect(kinds("A typical team has 5 engineers and ships in 3 months using Kubernetes.")).toEqual([]);
  });

  it("an empty answer", () => {
    expect(verify("")).toEqual({ checked: 0, flagged: [] });
  });
});

describe("shape of the result", () => {
  it("counts what it checked and what it flagged, once each, at most six flags", () => {
    const v = verify("He uses Kubernetes. He uses Kubernetes again. He uses Docker, Terraform, Ansible, Jenkins, Redis, Kafka, Kotlin.");
    expect(v.flagged.length).toBe(6);
    expect(v.flagged.filter((f) => f.text === "Kubernetes")).toHaveLength(1);
    expect(v.checked).toBeGreaterThan(6);
  });

  it("lists no more than the owner's limit", () => {
    const v = verify("He uses Kubernetes, Docker, Terraform and Ansible.", "x", 2);
    expect(v.flagged).toHaveLength(2);
    expect(v.checked).toBe(4);
  });

  it("an answer that is entirely true shows what was checked and flags nothing", () => {
    const v = verify("Kurhula has 5 systems published, built with TypeScript and Next.js — see /systems/maluleke-ks. He started in 2025.");
    expect(v.flagged).toEqual([]);
    expect(v.checked).toBeGreaterThanOrEqual(5);
  });
});
