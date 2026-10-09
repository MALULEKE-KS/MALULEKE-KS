// lib/guide/corpus.ts
// What the AI guide knows (PUBLIC-REDESIGN-PLAN §3a, "Grounding"): the site's
// own public data — every public view — serialised into one document the
// model reads whole. Each section names the page it came from, so every
// answer can cite a source a visitor can open.
//
// Read through the public role only (F1.8): the guide can never know a draft,
// a masked client's name or anything else a visitor couldn't see. Whole-corpus
// grounding holds while the document fits concierge.contextBudgetTokens; past
// it, case studies and READMEs are shortened first (retrieval over
// ContentChunk is the V2 step — ROADMAP-V2 §3).
//
// GitHub is the guide's closest source (owner, 2026-09-30): every public repo
// in his homes from the day it began, its languages, topics, README and
// activity, and what changed in the last 90 days — refreshed by the daily
// sync, read fresh on every question.

import { cache } from "react";
import { dbPublic } from "@/lib/db";
import { getPublicHomes, getPublicTitles } from "@/lib/queries/profile";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { getContentBlock } from "@/lib/content/blocks";
import { getInquiryTypes, getReviewSlaHours } from "@/lib/queries/site";
import { getPlatformPulse } from "@/lib/queries/profile";
import { getEvidence } from "@/lib/evidence";
import { SHEETS } from "@/lib/content/sheets";
import { formatMilestoneDate } from "@/lib/rules/timeline";
import { dateWithAgo, periodWords, relativeTo, sinceYearWords, spanWords } from "@/lib/guide/time";

/** Rough token estimate — about four characters a token for English prose. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const month = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 7) : null);
const list = (xs: (string | null | undefined)[]) => xs.filter(Boolean).join(", ");

export interface GuideCorpus {
  text: string;
  tokens: number;
  /** Paths the guide may open or cite — the site's pages and each published system. */
  paths: string[];
  ownerName: string;
  ownerFirstName: string;
}

async function load() {
  const [profile, links, titles, homes, systems, impacts, experience, education, achievements, timeline, metrics, skills, method, reviewSlaHours, cvOptions, repos, commits, journey, evidence, pulse, inquiryTypes, release] =
    await Promise.all([
      dbPublic.publicProfile.findFirst(),
      dbPublic.publicProfileLink.findMany({ orderBy: { sortOrder: "asc" } }),
      getPublicTitles(),
      getPublicHomes(),
      dbPublic.publicSystem.findMany({ orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }] }),
      dbPublic.publicImpact.findMany({ orderBy: { sortOrder: "asc" } }),
      dbPublic.publicExperience.findMany({ orderBy: { startDate: "desc" } }),
      dbPublic.publicEducation.findMany({ orderBy: { startDate: "desc" } }),
      dbPublic.publicAchievement.findMany({ orderBy: [{ sortOrder: "asc" }, { achievedOn: "desc" }] }),
      dbPublic.publicTimeline.findMany({ orderBy: { date: "desc" }, take: 40 }),
      dbPublic.publicMetric.findMany({ orderBy: { sortOrder: "asc" } }),
      getSkillEvidence(),
      getContentBlock("how-i-build"),
      getReviewSlaHours(),
      dbPublic.publicCvOption.findMany(),
      dbPublic.publicGithubRepo.findMany({ orderBy: [{ pushedAt: { sort: "desc", nulls: "last" } }, { fullName: "asc" }] }),
      dbPublic.publicRepoCommit.findMany({ orderBy: { committedAt: "desc" }, take: 400 }),
      getContentBlock("journey"),
      getEvidence(),
      getPlatformPulse(),
      getInquiryTypes(),
      getContentBlock("release"),
    ]);
  return { profile, links, titles, homes, systems, impacts, experience, education, achievements, timeline, metrics, skills, method, reviewSlaHours, cvOptions, repos, commits, journey, evidence, pulse, inquiryTypes, release };
}

/** Top languages by share of code, e.g. "TypeScript 82%, CSS 11%". */
function languageShare(languages: unknown): string | null {
  if (!languages || typeof languages !== "object") return null;
  const entries = Object.entries(languages as Record<string, number>).filter(([, n]) => typeof n === "number" && n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return null;
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, n]) => `${lang} ${Math.max(1, Math.round((n / total) * 100))}%`)
    .join(", ");
}

function render(data: Awaited<ReturnType<typeof load>>, caseStudyChars: number | null, readmeChars: number | null, now: Date): string {
  const { profile, links, titles, homes, systems, impacts, experience, education, achievements, timeline, metrics, skills, method, reviewSlaHours, cvOptions, repos, commits, journey, evidence, pulse, inquiryTypes, release } = data;
  const out: string[] = [];
  const section = (title: string, source: string) => out.push("", `## ${title} (source: ${source})`);

  section("The owner", "/about");
  if (profile) {
    out.push(`Name: ${profile.displayName}`);
    if (profile.headline) out.push(`Headline: ${profile.headline}`);
    out.push(`Role: ${profile.role}`);
    if (profile.location) out.push(`Location: ${profile.location}`);
    if (profile.buildingSinceYear) out.push(`Building software: ${sinceYearWords(profile.buildingSinceYear, now)}`);
    if (profile.availability) out.push(`Availability: ${profile.availability}`);
    if (profile.summary) out.push(`Summary: ${profile.summary}`);
    if (profile.bio) out.push(`Bio: ${profile.bio}`);
  }
  for (const t of titles) out.push(`Current ${t.kindLabel.toLowerCase()}: ${t.label}${t.detail ? ` (${t.detail})` : ""}`);
  if (links.length) out.push(`Profiles: ${links.filter((l) => !l.url.includes("wa.me")).map((l) => `${l.label} ${l.url}`).join("; ")}`);

  if (method) {
    section("Mission and method", "/about#method");
    out.push(`Mission: ${method.mission}`);
    for (const p of method.principles) out.push(`- ${p.name}: ${p.summary} ${p.body}`);
  }

  if (evidence.claims.length) {
    // What the site claims and how a visitor can check it (EVIDENCE-SPEC) — including what each claim does NOT prove.
    section("Claims this site makes, and their evidence", "/about#method");
    for (const c of evidence.claims) {
      out.push(`- ${c.claim} [${c.status}; about ${c.where.replace(/^\w+:/, "")}] Proves: ${c.proves} Does not prove: ${c.doesNotProve}`);
      for (const l of c.links) out.push(`  - ${l.label} (${l.kind}): ${l.url}`);
    }
  }

  section("This platform, live", "/");
  out.push(
    `This site is itself one of his published systems (its stack and case study are in its entry under Systems), and its rules are enforced in the database, not just the UI. Right now: ${pulse.rulesEnforcedByDatabase} business rules enforced by the database; ${pulse.auditEventsLast7Days} audited changes in the last 7 days (${pulse.auditEventsTotal} in all).` +
      (pulse.lastGithubSyncAt ? ` Last GitHub sync: ${dateWithAgo(new Date(pulse.lastGithubSyncAt), now)}.` : "") +
      (pulse.deployment ? ` Running build: ${pulse.deployment.commit}.` : ""),
  );
  if (release) out.push(`Version: ${release.current}${release.next ? ` — ${release.next}${release.nextNote ? ` ${release.nextNote}` : ""}` : ""}.`);

  section("Where the code lives — GitHub homes", "/systems");
  for (const h of homes) {
    out.push(`- ${h.name} (${h.kind ?? "organisation"}${h.role ? `, the owner's role: ${h.role}` : ""}): ${h.publishedSystems} published systems; GitHub ${h.github.map((g) => g.url).join(", ") || "none listed"}`);
  }

  if (repos.length) {
    const recent = (days: number) => commits.filter((c) => now.getTime() - c.committedAt.getTime() <= days * 86_400_000).length;
    section("GitHub — every public repo, from the first to the latest", "GitHub");
    out.push(
      `${repos.length} public repositories across his homes. Commits seen in the last 7 days: ${recent(7)}; last 30 days: ${recent(30)}. ` +
        "Repos marked 'not written up on the site yet' are real public work he hasn't curated into a case study — talk about them as what they are on GitHub, never as published systems.",
    );
    for (const r of repos) {
      const own = commits.filter((c) => c.fullName === r.fullName).slice(0, 6);
      out.push(
        "",
        `### ${r.fullName} — ${r.name} (source: ${r.published && r.slug ? `/systems/${r.slug}` : `https://github.com/${r.fullName}`})`,
        `Home: ${r.home}. ${r.published ? "Written up on the site." : "Not written up on the site yet."} GitHub: https://github.com/${r.fullName}`,
        `Started: ${r.createdAt ? dateWithAgo(r.createdAt, now) : "unknown"}. Last push: ${r.pushedAt ? dateWithAgo(r.pushedAt, now) : "unknown"}. Commits in the last 4 weeks: ${r.commitsLast4Weeks}; last year: ${r.commitsLastYear}.${r.stars ? ` Stars: ${r.stars}.` : ""}`,
        `About: ${r.description}`,
      );
      const langs = languageShare(r.languages);
      if (langs) out.push(`Languages: ${langs}`);
      if (r.topics.length) out.push(`Topics: ${r.topics.join(", ")}`);
      if (r.readmeExcerpt && readmeChars !== 0) {
        const text = r.readmeExcerpt.replace(/\s+/g, " ").trim();
        out.push(`README: ${readmeChars !== null && text.length > readmeChars ? `${text.slice(0, readmeChars)}…` : text}`);
      }
      if (own.length) {
        out.push("Recent changes:");
        for (const c of own) out.push(`  - ${dateWithAgo(c.committedAt, now)}: ${c.message}`);
      }
    }
  }

  section("Systems — every published system", "/systems");
  {
    // Counted here, in code, so the guide quotes a total rather than counting by eye.
    const byStatus = new Map<string, number>();
    for (const s of systems) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
    const privateCount = systems.filter((s) => s.repoPrivate).length;
    out.push(
      `Counts (computed): ${systems.length} published system${systems.length === 1 ? "" : "s"}` +
        (byStatus.size ? ` — ${[...byStatus].map(([status, n]) => `${n} ${status}`).join(", ")}` : "") +
        `; ${privateCount} with a private repository.`,
    );
  }
  for (const s of systems) {
    const own = impacts.filter((i) => i.systemId === s.id).map((i) => `${i.label}: ${i.value}`);
    out.push(
      "",
      `### ${s.name} (source: /systems/${s.slug})`,
      `Organisation: ${s.organization}. Status: ${s.status} (${s.stage}).${s.domain ? ` Domain: ${s.domain}.` : ""}${s.isFlagship ? " Flagship." : ""}`,
      `What it is: ${s.description}`,
    );
    if (s.techStack.length) out.push(`Stack: ${s.techStack.join(", ")}`);
    if (own.length) out.push(`Impact: ${own.join("; ")}`);
    if (s.liveUrl) out.push(`Live: ${s.liveUrl}`);
    out.push(s.repoUrl ? `Code: ${s.repoUrl}` : s.repoPrivate ? "Code: private repository" : "Code: not public");
    if (s.caseStudyBody.trim()) {
      const body = s.caseStudyBody.trim();
      out.push(`Case study: ${caseStudyChars !== null && body.length > caseStudyChars ? `${body.slice(0, caseStudyChars)}… (continues on the page)` : body}`);
    }
  }

  if (experience.length) {
    section("Experience", "/journey");
    for (const e of experience) {
      out.push(`- ${e.title}, ${e.organization}${e.location ? `, ${e.location}` : ""} — ${periodWords(e.startDate, e.endDate, now)}. ${e.description}`);
      for (const h of e.highlights) out.push(`  - ${h}`);
      if (e.skills.length) out.push(`  Skills: ${e.skills.join(", ")}`);
    }
  }

  if (education.length) {
    section("Education", "/journey");
    for (const e of education) {
      out.push(
        `- ${e.qualification}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}, ${e.institution} — from ${month(e.startDate)}${e.endDate ? ` to ${month(e.endDate)}` : e.expectedGraduation ? `, expected ${month(e.expectedGraduation)} (${relativeTo(e.expectedGraduation, now)}); studying for ${spanWords(e.startDate, now)} so far` : ", in progress"}.${e.honors ? ` ${e.honors}.` : ""}${e.description ? ` ${e.description}` : ""}`,
      );
      if (e.coursework.length) out.push(`  Coursework: ${e.coursework.join(", ")}`);
    }
  }

  if (achievements.length) {
    section("Certifications and awards", "/journey");
    for (const a of achievements) out.push(`- ${a.title}${a.issuer ? ` — ${a.issuer}` : ""}, ${day(a.achievedOn)}${a.description ? `. ${a.description}` : ""}`);
  }

  if (skills.length) {
    section("Skills, with the evidence for each", "/about#skills");
    for (const s of skills) {
      const evidence = list([
        s.systemCount ? `${s.systemCount} system${s.systemCount === 1 ? "" : "s"} (${s.systemSlugs.join(", ")})` : null,
        s.roleCount ? `${s.roleCount} role${s.roleCount === 1 ? "" : "s"}` : null,
        s.studyCount ? "studied" : null,
      ]);
      out.push(`- ${s.name}: ${evidence || "listed"}${s.inCurrentRole ? "; used in the current role" : ""}`);
    }
  }

  if (journey) {
    // His story as the Journey page tells it, in his own (first-person) words.
    section("Journey — his story, in chapters (his words)", "/journey");
    for (const c of journey.chapters) out.push(`- ${c.from}${c.to === c.from ? "" : `–${c.to ?? "now"}`} · ${c.title}${c.place ? ` (${c.place})` : ""}: ${c.body}`);
    if (journey.ahead) out.push(`- Ahead · ${journey.ahead.title}: ${journey.ahead.body}`);
  }

  if (timeline.length) {
    section("Journey — latest milestones", "/journey");
    for (const t of timeline) out.push(`- ${formatMilestoneDate(t.date, t.datePrecision)} · ${t.milestoneTypeLabel}: ${t.title}${t.description ? ` — ${t.description}` : ""}`);
  }

  if (metrics.length) {
    section("Numbers the owner has approved", "/");
    for (const m of metrics) out.push(`- ${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ""}${m.description ? ` (${m.description})` : ""}`);
  }

  section("CV", "/cv");
  out.push(cvOptions.length ? `Available: ${cvOptions.map((o) => `${o.label} (${o.formats.join("/")})`).join("; ")}` : "No CV is published right now.");

  section("Contact", "/contact");
  out.push(`Visitors reach the owner through the contact form at /contact. Every message is reviewed within ${reviewSlaHours} hours, and the sender gets a reference straight away. No account needed.`);
  if (inquiryTypes.length) {
    out.push("What visitors can write about (the form asks only what each needs; /contact?about=<key> opens one directly):");
    for (const t of inquiryTypes) out.push(`- ${t.label} (key: ${t.value})${t.description ? ` — ${t.description}` : ""}`);
  }
  if (profile?.email) out.push(`His public contact email: ${profile.email}`);

  section("Pages on this site", "/");
  for (const s of SHEETS) out.push(`- ${s.label}: ${s.href}`);

  return out.join("\n").trim();
}

// Reused across questions on the same server instance for concierge.corpusCacheSeconds
// (Fluid Compute keeps instances warm): ~20 reads per question become one per window.
const memo = new Map<number, { at: number; value: Promise<GuideCorpus> }>();

/** The corpus, shortened to the token budget if it has to be; reused for `maxAgeSeconds`. */
export const getGuideCorpus = cache(async (budgetTokens: number, maxAgeSeconds = 0): Promise<GuideCorpus> => {
  const hit = memo.get(budgetTokens);
  if (hit && Date.now() - hit.at < maxAgeSeconds * 1000) return hit.value;
  const value = buildCorpus(budgetTokens);
  memo.set(budgetTokens, { at: Date.now(), value });
  // A failed build is never reused.
  value.catch(() => memo.delete(budgetTokens));
  return value;
});

async function buildCorpus(budgetTokens: number): Promise<GuideCorpus> {
  const data = await load();
  // Past the budget, shorten in steps: READMEs first, then case studies too.
  const now = new Date();
  let text = render(data, null, null, now);
  for (const [caseChars, readmeChars] of [[null, 1200], [2000, 600], [800, 300], [300, 0]] as const) {
    if (estimateTokens(text) <= budgetTokens) break;
    text = render(data, caseChars, readmeChars, now);
  }
  const name = data.profile?.displayName ?? "the owner";
  return {
    text,
    tokens: estimateTokens(text),
    paths: [...SHEETS.map((s) => s.href), ...data.systems.map((s) => `/systems/${s.slug}`)],
    ownerName: name,
    ownerFirstName: name.split(/\s+/)[0] ?? name,
  };
}
