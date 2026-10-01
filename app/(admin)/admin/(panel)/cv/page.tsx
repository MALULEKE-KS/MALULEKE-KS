// app/(admin)/admin/(panel)/cv/page.tsx
// The two CV options visitors get — uploaded file and generated CV (#92) —
// then the completeness check of the generated CV (the same check as
// GET /admin/cv/check), then tabbed Experience / Education / Skills CRUD. SkillCategory select pulls
// live from its lookup table. Deleting an in-use Skill is blocked with an
// inline reason (onDelete Restrict in schema.prisma).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/cv").

import { AlertTriangle, CheckCircle2, FileText, Info } from "lucide-react";
import { AdminPageHeader, adminButton, Panel, Pill } from "@/components/admin/ui";
import { buildCvModel } from "@/lib/cv/model";
import { checkCv } from "@/lib/cv/check";
import { siteUrl } from "@/lib/site-url";
import { db } from "@/lib/db";
import { educationWithSkills, experienceWithSkills, skillWithCategory, toEducationEntry, toExperienceEntry, toSkillEntry } from "@/lib/rules/cv";
import { CvManager } from "./_components/CvManager";
import { CvOptionsPanel } from "./_components/CvOptionsPanel";
import { listCvUploadVersions, toCvUploadVersion } from "@/lib/cv/uploads";

// Auth-gated and reads live CV data — must never be statically prerendered
// (same reasoning as /admin/systems and /admin/inquiries).
export const dynamic = "force-dynamic";

export default async function AdminCvPage() {
  const [experienceRows, educationRows, skillRows, categories, allSkills, uploads, cvOptions, check] = await Promise.all([
    db.experience.findMany({ ...experienceWithSkills, orderBy: { startDate: "desc" } }),
    db.education.findMany({ ...educationWithSkills, orderBy: { startDate: "desc" } }),
    db.skill.findMany({ ...skillWithCategory, orderBy: { name: "asc" } }),
    db.skillCategory.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
    listCvUploadVersions(db),
    db.cvOptions.findUniqueOrThrow({ where: { id: 1 } }),
    buildCvModel({ siteUrl: siteUrl() }).then(checkCv),
  ]);
  const options = {
    showGenerated: cvOptions.showGenerated,
    showUploaded: cvOptions.showUploaded,
    firstOption: cvOptions.firstOption as "generated" | "uploaded",
    generatedLabel: cvOptions.generatedLabel,
    generatedNote: cvOptions.generatedNote,
    uploadedLabel: cvOptions.uploadedLabel,
    uploadedNote: cvOptions.uploadedNote,
  };
  const SEVERITY = { error: { Icon: AlertTriangle, cls: "text-critical" }, warning: { Icon: AlertTriangle, cls: "text-accent" }, tip: { Icon: Info, cls: "text-slate" } } as const;

  return (
    <>
      <AdminPageHeader icon={FileText} title="CV" description="What visitors can download — your uploaded CV, the one generated from the platform, or both (BR-7.1) — and the roles, education and skills the generated one is built from." />
      <CvOptionsPanel key={JSON.stringify(options)} versions={uploads.map(toCvUploadVersion)} options={options} />
      <Panel
        className="mb-6"
        title="Generated CV check"
        description="How ready the generated CV is for an applicant-tracking system — errors first."
        actions={
          <span className="flex items-center gap-2">
            <Pill tone={check.ready ? "good" : "attention"}>{check.score}%</Pill>
            <a href="/cv" target="_blank" rel="noreferrer" className={adminButton.secondary}>Open /cv</a>
          </span>
        }
      >
        {check.issues.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-signal-finished">
            <CheckCircle2 aria-hidden="true" className="size-4" /> Nothing to fix.
          </p>
        ) : (
          <ul className="space-y-2">
            {check.issues.map((issue, i) => {
              const { Icon, cls } = SEVERITY[issue.severity];
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${cls}`} />
                  <span className="text-ink">
                    <span className="mr-1.5 font-mono text-xs text-slate">{issue.section}</span>
                    {issue.message}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {check.suggestedSummary && (
          <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-slate">
            Suggested summary (set it on the Profile page): <span className="text-ink">{check.suggestedSummary}</span>
          </p>
        )}
      </Panel>
      <CvManager
        now={new Date().getTime()}
        experience={experienceRows.map(toExperienceEntry)}
        education={educationRows.map(toEducationEntry)}
        skills={skillRows.map(toSkillEntry)}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
        allSkillsForPicker={allSkills.map((s) => ({ id: s.id, name: s.name }))}
      />
    </>
  );
}
