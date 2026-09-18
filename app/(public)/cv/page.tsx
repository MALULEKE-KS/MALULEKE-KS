// app/(public)/cv/page.tsx
// /cv — on-screen view (full design system) + Download PDF (POST /cv/generate,
// BR-7.1) using the separate ink-only print stylesheet in app/globals.css.
// See docs/PAGE-SPECIFICATIONS.md ("/cv").

import { db } from "@/lib/db";
import { experienceWithSkills, skillWithCategory, toEducationEntry, toExperienceEntry, toSkillEntry } from "@/lib/rules/cv";
import { DownloadCvButton } from "./_components/DownloadCvButton";

// Reads live, admin-editable content — must not be statically baked in at
// build time (no DATABASE_URL in CI's build job; same fix as the homepage).
export const dynamic = "force-dynamic";

export const metadata = { title: "CV" };

const OWNER_NAME = "Kurhula Success Maluleke";

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const end = endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present";
  return `${start} – ${end}`;
}

export default async function CvPage() {
  const [experienceRows, educationRows, skillRows] = await Promise.all([
    db.experience.findMany({ ...experienceWithSkills, orderBy: { startDate: "desc" } }),
    db.education.findMany({ orderBy: { startDate: "desc" } }),
    db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } }),
  ]);

  const experience = experienceRows.map(toExperienceEntry);
  const education = educationRows.map(toEducationEntry);
  const skills = skillRows.map(toSkillEntry);
  const roleLine = experience[0]?.title ?? "Software Engineer";

  const skillsByCategory = new Map<string, typeof skills>();
  for (const skill of skills) {
    const existing = skillsByCategory.get(skill.category) ?? [];
    existing.push(skill);
    skillsByCategory.set(skill.category, existing);
  }

  return (
    <article className="cv-page py-16 max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-1">
        <div>
          <h1 className="font-sans font-semibold text-3xl text-ink">{OWNER_NAME}</h1>
          <p className="font-sans text-slate mt-1">{roleLine}</p>
        </div>
        <div className="no-print shrink-0">
          <DownloadCvButton />
        </div>
      </div>

      <p className="no-print font-mono text-xs text-slate mt-4 mb-10">
        Formatted for print — use Download PDF for the cleanest copy.
      </p>

      {experience.length > 0 && (
        <section className="mb-10 pt-8 border-t border-slate/20">
          <h2 className="font-sans font-semibold text-xl text-ink mb-4">Experience</h2>
          <div className="space-y-6">
            {experience.map((entry) => (
              <div key={entry.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-sans font-medium text-ink">{entry.title}</h3>
                  <span className="font-mono text-xs text-slate shrink-0">
                    {formatDateRange(entry.startDate, entry.endDate)}
                  </span>
                </div>
                <p className="font-sans text-sm text-slate">{entry.organization}</p>
                <p className="font-serif text-sm text-ink mt-2 leading-relaxed">{entry.description}</p>
                {entry.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.skills.map((skill) => (
                      <span key={skill} className="font-mono text-xs border border-slate/30 text-slate px-2 py-0.5">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section className="mb-10 pt-8 border-t border-slate/20">
          <h2 className="font-sans font-semibold text-xl text-ink mb-4">Education</h2>
          <div className="space-y-6">
            {education.map((entry) => (
              <div key={entry.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-sans font-medium text-ink">{entry.qualification}</h3>
                  <span className="font-mono text-xs text-slate shrink-0">
                    {formatDateRange(entry.startDate, entry.endDate)}
                  </span>
                </div>
                <p className="font-sans text-sm text-slate">{entry.institution}</p>
                {entry.honors && <p className="font-serif text-sm text-ink mt-2">{entry.honors}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {skillsByCategory.size > 0 && (
        <section className="pt-8 border-t border-slate/20">
          <h2 className="font-sans font-semibold text-xl text-ink mb-4">Skills</h2>
          <div className="space-y-4">
            {[...skillsByCategory.entries()].map(([category, categorySkills]) => (
              <div key={category}>
                <p className="font-mono text-xs text-slate mb-1.5">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <span key={skill.id} className="font-mono text-xs border border-slate/30 text-ink px-2 py-0.5">
                      {skill.name}
                      {skill.yearsExperience ? ` (${skill.yearsExperience}y)` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
