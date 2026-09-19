// lib/cv/check.ts
// The CV completeness checker (#74). Before a CV is generated — and in the
// admin, while editing — it reports what a recruiter or an ATS would find
// missing or weak, section by section. It reads the CV model only and never
// fills anything in: the suggested summary is built purely from facts already
// on the CV, and is offered, never saved on its own.

import type { CvModel } from "@/lib/cv/model";
import { relevance, roleTerms } from "@/lib/cv/tailor";

export type CvIssueSeverity = "error" | "warning" | "tip";

export interface CvIssue {
  severity: CvIssueSeverity;
  section: "contact" | "summary" | "experience" | "projects" | "education" | "skills" | "targetRole";
  message: string;
}

export interface CvCheck {
  /** 0–100: errors weigh most, tips least. */
  score: number;
  ready: boolean;
  issues: CvIssue[];
  suggestedSummary: string | null;
}

const MAX_BULLET = 200;
const MAX_SUMMARY = 700;
const MIN_SKILLS = 6;

function hasLink(model: CvModel, needle: string): boolean {
  return model.links.some((l) => l.url.toLowerCase().includes(needle) || l.label.toLowerCase().includes(needle));
}

/** A summary drafted only from facts on the CV — for the owner to edit and approve. */
export function suggestSummary(model: CvModel): string | null {
  if (!model.headline) return null;
  const sentences: string[] = [];
  const studying = model.education.find((e) => e.end === null);
  sentences.push(
    studying
      ? `${model.headline}, currently studying ${studying.qualification} at ${studying.institution}.`
      : `${model.headline}.`,
  );
  if (model.projects.length > 0) {
    const names = model.projects.slice(0, 2).map((p) => p.name);
    sentences.push(
      `Built ${model.projects.length} published ${model.projects.length === 1 ? "system" : "systems"}, including ${names.join(" and ")}.`,
    );
  }
  const topSkills = model.skills.flatMap((g) => g.names).slice(0, 6);
  if (topSkills.length > 0) sentences.push(`Core skills: ${topSkills.join(", ")}.`);
  return sentences.join(" ");
}

export function checkCv(model: CvModel): CvCheck {
  const issues: CvIssue[] = [];
  const add = (severity: CvIssueSeverity, section: CvIssue["section"], message: string) =>
    issues.push({ severity, section, message });

  // Contact — an ATS needs a name and an email to create the candidate at all.
  if (!model.name.trim()) add("error", "contact", "Your name is missing from the profile.");
  if (!model.email.trim()) add("error", "contact", "Your email is missing from the profile.");
  if (!model.headline) add("warning", "contact", "Add a headline (e.g. your current title) so the CV opens with who you are.");
  if (!model.phone) add("warning", "contact", "No phone number — most CVs include one. Add it to your profile if you want it on the CV.");
  if (!model.location) add("warning", "contact", "Add your location (city, country) — recruiters filter by it.");
  if (!hasLink(model, "linkedin")) add("warning", "contact", "No LinkedIn link on the CV.");
  if (!hasLink(model, "github")) add("warning", "contact", "No GitHub link on the CV — for an engineer, it's evidence.");

  // Summary
  if (!model.summary) add("warning", "summary", "No professional summary — 2–4 lines on who you are and what you build. A draft is suggested below.");
  else if (model.summary.length > MAX_SUMMARY) add("tip", "summary", "The summary is long; keep it to 2–4 lines.");

  // Experience
  if (model.experience.length === 0) add("warning", "experience", "No roles to show. Add your current role, even alongside your studies.");
  for (const role of model.experience) {
    const name = `"${role.title}" at ${role.organization}`;
    if (role.highlights.length === 0) {
      add("warning", "experience", `${name} has no achievement bullets — add 2–5 on what you did and its impact.`);
      continue;
    }
    if (role.highlights.some((h) => h.length > MAX_BULLET)) {
      add("tip", "experience", `${name} has a bullet over ${MAX_BULLET} characters — split or tighten it.`);
    }
    if (!role.highlights.some((h) => /\d/.test(h))) {
      add("tip", "experience", `${name}: quantify at least one bullet (users, time saved, systems shipped…).`);
    }
  }

  // Projects
  if (model.projects.length === 0) add("warning", "projects", "No projects on the CV — publish a system, or include one with 'on CV'.");

  // Education
  if (model.education.length === 0) add("warning", "education", "No education entries. Add your degree (in progress is fine).");
  for (const e of model.education) {
    if (e.end === null && !e.expectedGraduation) {
      add("warning", "education", `${e.qualification}: add an expected graduation date for a degree in progress.`);
    }
  }

  // Skills
  const skillCount = model.skills.reduce((n, g) => n + g.names.length, 0);
  if (skillCount < MIN_SKILLS) add("warning", "skills", `Only ${skillCount} skills listed — ATS matching relies on them. Add the tools you actually use.`);

  // Target role — which of its own words the CV never mentions.
  if (model.targetRole) {
    const cvText = [
      model.headline,
      model.summary,
      ...model.experience.flatMap((r) => [r.title, r.description, ...r.highlights, ...r.skills]),
      ...model.projects.flatMap((p) => [p.name, p.description, ...p.techStack]),
      ...model.education.flatMap((e) => [e.qualification, ...e.coursework]),
      ...model.skills.flatMap((g) => g.names),
    ]
      .filter(Boolean)
      .join(" ");
    const roleWords = roleTerms(model.targetRole).filter((t) => model.targetRole!.toLowerCase().includes(t));
    const missing = roleWords.filter((t) => relevance(cvText, [t]) === 0);
    if (missing.length > 0) {
      add("tip", "targetRole", `For "${model.targetRole}", nothing on the CV mentions: ${missing.slice(0, 5).join(", ")}.`);
    }
  }

  const weight = { error: 25, warning: 6, tip: 2 } as const;
  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + weight[i.severity], 0));
  return {
    score,
    ready: !issues.some((i) => i.severity === "error"),
    issues,
    suggestedSummary: model.summary ? null : suggestSummary(model),
  };
}
