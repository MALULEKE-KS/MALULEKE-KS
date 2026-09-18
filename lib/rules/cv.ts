// lib/rules/cv.ts
// BR-7.x as enforceable code. Serializers for Experience/Education/Skill
// (shared by the public /cv page and the admin CV CRUD routes — there's no
// masking difference between the two views, unlike System, since CV content
// carries no client-confidentiality dimension) and the BR-7.2 supersede
// helper used by POST /cv/generate.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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
    startDate: toDateOnly(experience.startDate),
    endDate: experience.endDate ? toDateOnly(experience.endDate) : null,
    description: experience.description,
    skills: experience.skills.map((s) => s.skill.name),
  };
}

export function toEducationEntry(education: {
  id: string;
  institution: string;
  qualification: string;
  startDate: Date;
  endDate: Date | null;
  honors: string | null;
}) {
  return {
    id: education.id,
    institution: education.institution,
    qualification: education.qualification,
    startDate: toDateOnly(education.startDate),
    endDate: education.endDate ? toDateOnly(education.endDate) : null,
    honors: education.honors,
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
export async function supersedePriorDocuments(type: string, targetRole: string | null, newFileUrl: string) {
  await db.documentGen.updateMany({
    where: { type, targetRole, supersededByFileUrl: null, fileUrl: { not: newFileUrl } },
    data: { supersededByFileUrl: newFileUrl },
  });
}
