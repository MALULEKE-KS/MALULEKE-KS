// lib/cv/model.ts
// The CV engine's single source (#74): one structured CV built from live data
// (BR-7.1), then rendered to PDF and DOCX by lib/cv/render-*.ts — the same
// content in two formats. Reads only the public views and the owner's profile,
// so the CV can never carry anything the site itself hides (BR-1.x masking,
// unpublished roles, education, projects or achievements).
//
// Never invents: a missing fact stays missing, and lib/cv/check.ts reports it.

// Public reads only — the platform_public role (F1.8).
import { dbPublic as db } from "@/lib/db";
import { relevance, roleTerms } from "@/lib/cv/tailor";

export interface CvLink {
  label: string;
  url: string;
}

export interface CvExperience {
  title: string;
  organization: string;
  location: string | null;
  start: Date;
  end: Date | null;
  highlights: string[];
  /** Used only when a role has no highlights yet. */
  description: string;
  skills: string[];
}

export interface CvProject {
  name: string;
  organization: string;
  description: string;
  techStack: string[];
  impacts: string[];
  /** The case study on the portfolio — always present, even for NDA or private work. */
  caseStudyUrl: string;
  liveUrl: string | null;
}

export interface CvEducation {
  qualification: string;
  institution: string;
  start: Date;
  end: Date | null;
  expectedGraduation: Date | null;
  honors: string | null;
  coursework: string[];
  description: string | null;
}

export interface CvCertification {
  title: string;
  issuer: string | null;
  date: Date;
  url: string | null;
}

export interface CvModel {
  name: string;
  headline: string | null;
  /** The current (or latest) qualification, shown with the headline. */
  qualificationLine: string | null;
  location: string | null;
  email: string;
  phone: string | null;
  links: CvLink[];
  summary: string | null;
  experience: CvExperience[];
  projects: CvProject[];
  education: CvEducation[];
  skills: { category: string; names: string[] }[];
  certifications: CvCertification[];
  targetRole: string | null;
}

export interface CvOptions {
  targetRole?: string | null;
  /** The site's own origin (from the request) — the CV's portfolio link. */
  siteUrl: string;
}

/** "BSc in Computer Science and Mathematics", without repeating the field. */
export function qualificationTitle(qualification: string, fieldOfStudy: string | null): string {
  if (!fieldOfStudy || qualification.toLowerCase().includes(fieldOfStudy.toLowerCase())) return qualification;
  return `${qualification} in ${fieldOfStudy}`;
}

const MAX_PROJECTS = 5;

export async function buildCvModel({ targetRole = null, siteUrl }: CvOptions): Promise<CvModel> {
  const [profile, links, experienceRows, systemRows, educationRows, skillRows, categories, achievements] =
    await Promise.all([
      db.publicProfile.findFirst(),
      db.publicProfileLink.findMany({ where: { onCv: true }, orderBy: { sortOrder: "asc" } }),
      db.publicExperience.findMany({ orderBy: { startDate: "desc" } }),
      db.publicSystem.findMany({ where: { onCv: true }, orderBy: [{ cvOrder: "asc" }, { isFlagship: "desc" }, { sortOrder: "asc" }] }),
      db.publicEducation.findMany({ orderBy: { startDate: "desc" } }),
      db.$queryRaw<{ name: string; categoryKey: string; strength: number }[]>`
        SELECT name, "categoryKey", ("systemCount" + "roleCount" + "studyCount")::int AS strength
          FROM "SkillEvidence" ORDER BY strength DESC, name ASC`,
      db.skillCategory.findMany({ where: { active: true } }),
      db.publicAchievement.findMany({ orderBy: [{ sortOrder: "asc" }, { achievedOn: "desc" }] }),
    ]);

  const terms = roleTerms(targetRole);
  const byRelevance = <T>(items: T[], text: (item: T) => string) =>
    terms.length === 0
      ? items
      : items
          .map((item, index) => ({ item, index, score: relevance(text(item), terms) }))
          .sort((a, b) => b.score - a.score || a.index - b.index)
          .map((x) => x.item);

  const impacts = await db.publicImpact.findMany({
    where: { systemId: { in: systemRows.map((s) => s.id) } },
    orderBy: { sortOrder: "asc" },
  });

  // Current roles first, then most recent — the order recruiters and ATS expect.
  const experience: CvExperience[] = [...experienceRows]
    .sort((a, b) => Number(b.endDate === null) - Number(a.endDate === null) || b.startDate.getTime() - a.startDate.getTime())
    .map((x) => ({
      title: x.title,
      organization: x.organization,
      location: x.location,
      start: x.startDate,
      end: x.endDate,
      // Tailoring reorders bullets within a role; it never drops or rewrites them.
      highlights: byRelevance(x.highlights, (h) => h),
      description: x.description,
      skills: x.skills,
    }));

  const projects: CvProject[] = byRelevance(systemRows, (s) =>
    [s.name, s.description, s.domain ?? "", ...s.techStack].join(" "),
  )
    .slice(0, MAX_PROJECTS)
    .map((s) => ({
      name: s.name,
      organization: s.organization,
      description: s.description,
      techStack: s.techStack,
      impacts: impacts.filter((i) => i.systemId === s.id).map((i) => `${i.label}: ${i.value}`),
      caseStudyUrl: new URL(`/systems/${s.slug}`, siteUrl).toString(),
      liveUrl: s.liveUrl,
    }));

  // In progress first, then most recent.
  const education: CvEducation[] = [...educationRows]
    .sort((a, b) => Number(b.endDate === null) - Number(a.endDate === null) || b.startDate.getTime() - a.startDate.getTime())
    .map((e) => ({
      qualification: qualificationTitle(e.qualification, e.fieldOfStudy),
      institution: e.institution,
      start: e.startDate,
      end: e.endDate,
      expectedGraduation: e.expectedGraduation,
      honors: e.honors,
      coursework: byRelevance(e.coursework, (c) => c),
      description: e.description,
    }));

  const current = education[0];
  const qualificationLine = current
    ? `${current.qualification}${current.end === null ? " (in progress)" : ""}`
    : null;

  const categoryLabel = new Map(categories.map((c) => [c.key, c.label]));
  const skillGroups = new Map<string, string[]>();
  for (const skill of byRelevance(skillRows, (s) => s.name)) {
    const label = categoryLabel.get(skill.categoryKey) ?? skill.categoryKey;
    skillGroups.set(label, [...(skillGroups.get(label) ?? []), skill.name]);
  }

  return {
    name: profile?.displayName ?? "",
    headline: profile?.headline ?? null,
    qualificationLine,
    location: profile?.location ?? null,
    email: profile?.email ?? "",
    phone: profile?.phone ?? null,
    links: [
      // The portfolio is the site itself — its address comes from the request.
      { label: "Portfolio", url: new URL("/", siteUrl).toString() },
      ...links.map((l) => ({ label: l.label, url: l.url })),
    ],
    summary: profile?.summary ?? null,
    experience,
    projects,
    education,
    skills: [...skillGroups.entries()].map(([category, names]) => ({ category, names })),
    certifications: achievements.map((a) => ({ title: a.title, issuer: a.issuer, date: a.achievedOn, url: a.url })),
    targetRole: targetRole?.trim() || null,
  };
}
