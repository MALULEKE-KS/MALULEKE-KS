// lib/rules/cv.ts
// BR-7.x as enforceable code. Serializers for Experience/Education/Skill
// (shared by the public /cv page and the admin CV CRUD routes — there's no
// masking difference between the two views, unlike System, since CV content
// carries no client-confidentiality dimension) and the BR-7.2 supersede
// helper used by POST /cv/generate.

import { Prisma, type PublicEducation, type PublicExperience } from "@prisma/client";
import { db } from "@/lib/db";

const educationWithSkills = Prisma.validator<Prisma.EducationDefaultArgs>()({
  include: { skills: { include: { skill: true } } },
});
export type EducationWithSkills = Prisma.EducationGetPayload<typeof educationWithSkills>;
export { educationWithSkills };

const experienceWithSkills = Prisma.validator<Prisma.ExperienceDefaultArgs>()({
  include: { skills: { include: { skill: true } } },
});
export type ExperienceWithSkills = Prisma.ExperienceGetPayload<typeof experienceWithSkills>;
export { experienceWithSkills };

const skillWithCategory = Prisma.validator<Prisma.SkillDefaultArgs>()({
  include: { category: true },
});
export type SkillWithCategory = Prisma.SkillGetPayload<typeof skillWithCategory>;
export { skillWithCategory };

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toExperienceEntry(experience: ExperienceWithSkills) {
  return {
    id: experience.id,
    title: experience.title,
    organization: experience.organization,
    location: experience.location,
    startDate: toDateOnly(experience.startDate),
    endDate: experience.endDate ? toDateOnly(experience.endDate) : null,
    description: experience.description,
    highlights: experience.highlights,
    contentStatus: experience.contentStatus.toLowerCase() as "draft" | "published" | "archived",
    skills: experience.skills.map((s) => s.skill.name),
  };
}

/** Public roles (openapi ExperienceEntry) from a PublicExperience view row (#74). */
export function toPublicExperienceEntry(row: PublicExperience) {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    location: row.location,
    startDate: toDateOnly(row.startDate),
    endDate: row.endDate ? toDateOnly(row.endDate) : null,
    description: row.description,
    highlights: row.highlights,
    contentStatus: "published" as const,
    skills: row.skills,
  };
}

export function toEducationEntry(education: EducationWithSkills) {
  return {
    id: education.id,
    institution: education.institution,
    qualification: education.qualification,
    fieldOfStudy: education.fieldOfStudy,
    startDate: toDateOnly(education.startDate),
    // null = still studying
    endDate: education.endDate ? toDateOnly(education.endDate) : null,
    honors: education.honors,
    description: education.description,
    certificateUrl: education.certificateUrl,
    contentStatus: education.contentStatus.toLowerCase() as "draft" | "published" | "archived",
    skills: education.skills.map((s) => s.skill.name),
    expectedGraduation: education.expectedGraduation ? toDateOnly(education.expectedGraduation) : null,
    coursework: education.coursework,
  };
}

/**
 * Public education (openapi EducationEntry) from a PublicEducation view row.
 * The view holds only what the admin chose to show (#70, F1.7).
 */
export function toPublicEducationEntry(row: PublicEducation) {
  return {
    id: row.id,
    institution: row.institution,
    qualification: row.qualification,
    fieldOfStudy: row.fieldOfStudy,
    startDate: toDateOnly(row.startDate),
    endDate: row.endDate ? toDateOnly(row.endDate) : null,
    honors: row.honors,
    description: row.description,
    certificateUrl: row.certificateUrl,
    contentStatus: "published" as const,
    skills: row.skills,
    expectedGraduation: row.expectedGraduation ? toDateOnly(row.expectedGraduation) : null,
    coursework: row.coursework,
  };
}

export function toSkillEntry(skill: SkillWithCategory) {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category.label,
    yearsExperience: skill.yearsExperience,
  };
}

// BR-7.2 — a new DocumentGen for the same type/targetRole pair supersedes
// the prior one(s), which stay in the table (never deleted) with
// supersededByFileUrl pointing at the new file. Scoped to non-superseded
// rows only, so re-running this after several generations doesn't rewrite
// history further back than the immediately-prior version.
// Per format (#74): a new PDF supersedes the previous PDF, a new DOCX the previous DOCX.
export async function supersedePriorDocuments(type: string, targetRole: string | null, format: string, newFileUrl: string) {
  await db.documentGen.updateMany({
    where: { type, targetRole, format, supersededByFileUrl: null, fileUrl: { not: newFileUrl } },
    data: { supersededByFileUrl: newFileUrl },
  });
}
