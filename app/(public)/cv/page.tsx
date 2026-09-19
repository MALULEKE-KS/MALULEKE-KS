// app/(public)/cv/page.tsx
// /cv — on-screen view (full design system) + Download PDF (POST /cv/generate,
// BR-7.1) using the separate ink-only print stylesheet in app/globals.css.
// See docs/PAGE-SPECIFICATIONS.md ("/cv").

import { db } from "@/lib/db";
import {
  experienceWithSkills,
  skillWithCategory,
  toExperienceEntry,
  toPublicEducationEntry,
  toSkillEntry,
} from "@/lib/rules/cv";
import { DownloadCvButton } from "./_components/DownloadCvButton";
import { Container } from "@/components/shared/Container";

// Reads live, admin-editable content — must not be statically baked in at
// build time (no DATABASE_URL in CI's build job; same fix as the homepage).
export const dynamic = "force-dynamic";

export const metadata = { title: "CV" };

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const end = endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present";
  return `${start} – ${end}`;
}

export default async function CvPage() {
  const [experienceRows, educationRows, skillRows, profile] = await Promise.all([
    db.experience.findMany({ ...experienceWithSkills, orderBy: { startDate: "desc" } }),
    db.publicEducation.findMany({ orderBy: { startDate: "desc" } }),
    db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } }),
    // The owner's name is profile data (#70), not a constant.
    db.publicProfile.findFirst(),
  ]);

  const experience = experienceRows.map(toExperienceEntry);
  const education = educationRows.map(toPublicEducationEntry);
  const skills = skillRows.map(toSkillEntry);
  const roleLine = experience[0]?.title ?? "Software Engineer";

  const skillsByCategory = new Map<string, typeof skills>();
  for (const skill of skills) {
    const existing = skillsByCategory.get(skill.category) ?? [];
    existing.push(skill);
    skillsByCategory.set(skill.category, existing);
  }

  return (
    <Container>
      <article className="cv-page max-w-3xl py-16">
        <div className="mb-1 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-ink font-sans text-3xl font-semibold">{profile?.displayName}</h1>
            <p className="text-slate mt-1 font-sans">{roleLine}</p>
          </div>
          <div className="no-print shrink-0">
            <DownloadCvButton />
          </div>
        </div>

        <p className="no-print text-slate mt-4 mb-10 font-mono text-xs">
          Formatted for print — use Download PDF for the cleanest copy.
        </p>

        {experience.length > 0 && (
          <section className="border-slate/20 mb-10 border-t pt-8">
            <h2 className="text-ink mb-4 font-sans text-xl font-semibold">Experience</h2>
            <div className="space-y-6">
              {experience.map((entry) => (
                <div key={entry.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-ink font-sans font-medium">{entry.title}</h3>
                    <span className="text-slate shrink-0 font-mono text-xs">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                  </div>
                  <p className="text-slate font-sans text-sm">{entry.organization}</p>
                  <p className="text-ink mt-2 font-serif text-sm leading-relaxed">{entry.description}</p>
                  {entry.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.skills.map((skill) => (
                        <span key={skill} className="border-slate/30 text-slate border px-2 py-0.5 font-mono text-xs">
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
          <section className="border-slate/20 mb-10 border-t pt-8">
            <h2 className="text-ink mb-4 font-sans text-xl font-semibold">Education</h2>
            <div className="space-y-6">
              {education.map((entry) => (
                <div key={entry.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-ink font-sans font-medium">{entry.qualification}</h3>
                    <span className="text-slate shrink-0 font-mono text-xs">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                  </div>
                  <p className="text-slate font-sans text-sm">{entry.institution}</p>
                  {entry.honors && <p className="text-ink mt-2 font-serif text-sm">{entry.honors}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {skillsByCategory.size > 0 && (
          <section className="border-slate/20 border-t pt-8">
            <h2 className="text-ink mb-4 font-sans text-xl font-semibold">Skills</h2>
            <div className="space-y-4">
              {[...skillsByCategory.entries()].map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-slate mb-1.5 font-mono text-xs">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill) => (
                      <span key={skill.id} className="border-slate/30 text-ink border px-2 py-0.5 font-mono text-xs">
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
    </Container>
  );
}
