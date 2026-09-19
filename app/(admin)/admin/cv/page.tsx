// app/(admin)/admin/cv/page.tsx
// Tabbed Experience / Education / Skills CRUD. SkillCategory select pulls
// live from its lookup table. Deleting an in-use Skill is blocked with an
// inline reason (onDelete Restrict in schema.prisma).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/cv").

import { db } from "@/lib/db";
import { educationWithSkills, experienceWithSkills, skillWithCategory, toEducationEntry, toExperienceEntry, toSkillEntry } from "@/lib/rules/cv";
import { CvManager } from "./_components/CvManager";

// Auth-gated and reads live CV data — must never be statically prerendered
// (same reasoning as /admin/systems and /admin/inquiries).
export const dynamic = "force-dynamic";

export default async function AdminCvPage() {
  const [experienceRows, educationRows, skillRows, categories, allSkills] = await Promise.all([
    db.experience.findMany({ ...experienceWithSkills, orderBy: { startDate: "desc" } }),
    db.education.findMany({ ...educationWithSkills, orderBy: { startDate: "desc" } }),
    db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } }),
    db.skillCategory.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <section className="px-6 py-12 max-w-4xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">CV</h1>
      <CvManager
        experience={experienceRows.map(toExperienceEntry)}
        education={educationRows.map(toEducationEntry)}
        skills={skillRows.map(toSkillEntry)}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        allSkillsForPicker={allSkills.map((s) => ({ id: s.id, name: s.name }))}
      />
    </section>
  );
}
