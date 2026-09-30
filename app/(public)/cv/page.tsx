// app/(public)/cv/page.tsx
// /cv (DESIGN-SYSTEM.md v3, #99) — the CV options the admin shows (#92,
// BR-7.1/7.5) and, while the generated option is shown, the generated CV on
// screen. The on-screen CV renders the SAME model the PDF and Word files are
// built from (lib/cv/model.ts), so what you read is what you download.
// Printing uses the ink-only print stylesheet (globals.css): the graphite hero
// and the options disappear, and a plain print header takes their place.
// See docs/PAGE-SPECIFICATIONS.md ("/cv").

import {
  FileText,
  GraduationCap,
  Award,
  Briefcase,
  Boxes,
  Sparkles,
  MapPin,
  Mail,
  Link2,
} from "lucide-react";
import { Container } from "@/components/shared/Container";
import { PageHero } from "@/components/shared/PageHero";
import { buildCvModel, type CvModel } from "@/lib/cv/model";
import { getPublicCvOptions } from "@/lib/cv/options";
import { siteUrl } from "@/lib/site-url";
import { DownloadCvButton } from "./_components/DownloadCvButton";

// Reads live, admin-editable content — never baked in at build time.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "CV",
  description: "The CV — read it here, or download it as PDF or Word.",
  alternates: { canonical: "/cv" },
};

const month = (d: Date) =>
  d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const range = (start: Date, end: Date | null, ongoing = "Present") =>
  `${month(start)} – ${end ? month(end) : ongoing}`;

function Section({
  id,
  title,
  Icon,
  children,
}: {
  id?: string;
  title: string;
  Icon: typeof Briefcase;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="border-ink/10 scroll-mt-24 border-t pt-10 first:border-t-0 first:pt-0"
    >
      <h2
        id={id ? `${id}-title` : undefined}
        className="text-ink mb-6 inline-flex items-center gap-2.5 font-sans text-2xl font-semibold tracking-tight"
      >
        <Icon aria-hidden="true" className="no-print text-accent size-5" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CvBody({ cv }: { cv: CvModel }) {
  return (
    <div className="space-y-10">
      {cv.summary && (
        <Section title="Summary" Icon={FileText}>
          <p className="text-ink max-w-prose font-serif text-lg leading-relaxed">{cv.summary}</p>
        </Section>
      )}

      {cv.experience.length > 0 && (
        <Section id="experience" title="Experience" Icon={Briefcase}>
          <div className="space-y-8">
            {cv.experience.map((role) => (
              <article key={`${role.title}-${role.organization}-${role.start.toISOString()}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h3 className="text-ink font-sans text-lg font-semibold">{role.title}</h3>
                  <p className="text-slate shrink-0 font-mono text-xs">
                    {range(role.start, role.end)}
                  </p>
                </div>
                <p className="text-slate text-sm">
                  {[role.organization, role.location].filter(Boolean).join(" · ")}
                </p>
                {role.highlights.length > 0 ? (
                  <ul className="text-ink marker:text-accent mt-3 max-w-prose list-disc space-y-1.5 pl-5 font-serif leading-relaxed">
                    {role.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink mt-3 max-w-prose font-serif leading-relaxed">
                    {role.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {cv.projects.length > 0 && (
        <Section id="projects" title="Projects" Icon={Boxes}>
          <div className="space-y-6">
            {cv.projects.map((p) => (
              <article key={p.caseStudyUrl}>
                <h3 className="text-ink font-sans text-lg font-semibold">
                  <a href={p.caseStudyUrl} className="underline-offset-4 hover:underline">
                    {p.name}
                  </a>
                </h3>
                <p className="text-slate text-sm">
                  {[p.organization, ...p.techStack.slice(0, 5)].join(" · ")}
                </p>
                <p className="text-ink mt-2 max-w-prose font-serif leading-relaxed">
                  {p.description}
                </p>
                {p.impacts.length > 0 && (
                  <ul className="text-ink marker:text-accent mt-2 max-w-prose list-disc space-y-1 pl-5 font-serif">
                    {p.impacts.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {cv.education.length > 0 && (
        <Section id="education" title="Education" Icon={GraduationCap}>
          <div className="space-y-6">
            {cv.education.map((e) => (
              <article key={`${e.qualification}-${e.institution}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h3 className="text-ink font-sans text-lg font-semibold">{e.qualification}</h3>
                  <p className="text-slate shrink-0 font-mono text-xs">
                    {e.end
                      ? range(e.start, e.end)
                      : e.expectedGraduation
                        ? `${month(e.start)} – expected ${month(e.expectedGraduation)}`
                        : range(e.start, null)}
                  </p>
                </div>
                <p className="text-slate text-sm">{e.institution}</p>
                {e.honors && <p className="text-ink mt-2 font-serif">{e.honors}</p>}
                {e.coursework.length > 0 && (
                  <p className="text-slate mt-2 text-sm">Coursework: {e.coursework.join(", ")}</p>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {cv.certifications.length > 0 && (
        <Section id="certifications" title="Certifications" Icon={Award}>
          <ul className="space-y-3">
            {cv.certifications.map((c) => (
              <li
                key={`${c.title}-${c.date.toISOString()}`}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span className="text-ink font-medium">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {c.title}
                    </a>
                  ) : (
                    c.title
                  )}
                  {c.issuer && <span className="text-slate font-normal"> — {c.issuer}</span>}
                </span>
                <span className="text-slate shrink-0 font-mono text-xs">{month(c.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {cv.skills.length > 0 && (
        <Section id="skills" title="Skills" Icon={Sparkles}>
          <dl className="space-y-4">
            {cv.skills.map((group) => (
              <div key={group.category} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <dt className="text-slate font-mono text-xs sm:pt-1.5">{group.category}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {group.names.map((s) => (
                    <span
                      key={s}
                      className="border-ink/10 bg-paper text-ink rounded-full border px-3 py-1 text-sm"
                    >
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}

export default async function CvPage() {
  const options = await getPublicCvOptions();
  const showGenerated = options.some((o) => o.kind === "generated");
  // The generated CV is only built (and shown) while that option is offered (BR-7.5).
  const cv = showGenerated ? await buildCvModel({ targetRole: null, siteUrl: siteUrl() }) : null;
  const heroName = cv?.name;

  return (
    <>
      <div className="no-print">
        <PageHero
          icon={FileText}
          eyebrow="CV"
          title={heroName ?? "CV"}
          description={
            cv
              ? [cv.headline, cv.qualificationLine].filter(Boolean).join(" · ") || undefined
              : "Download the CV below."
          }
        >
          {cv && (
            <ul className="text-mist flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {cv.location && (
                <li className="inline-flex items-center gap-2">
                  <MapPin aria-hidden="true" className="text-line size-4" />
                  {cv.location}
                </li>
              )}
              <li className="inline-flex items-center gap-2">
                <Mail aria-hidden="true" className="text-line size-4" />
                <a href={`mailto:${cv.email}`} className="hover:text-paper">
                  {cv.email}
                </a>
              </li>
              {cv.links.map((l) => (
                <li key={l.url} className="inline-flex items-center gap-2">
                  <Link2 aria-hidden="true" className="text-line size-4" />
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-paper"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </PageHero>
      </div>

      <section className="bg-paper py-12 md:py-16">
        <Container className="grid gap-12 lg:grid-cols-12">
          <aside className="no-print lg:order-2 lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <DownloadCvButton options={options} />
              {cv && (
                <p className="text-slate mt-4 font-mono text-xs">
                  Formatted for print — use Download PDF for the cleanest copy.
                </p>
              )}
            </div>
          </aside>

          {cv && (
            <article className="cv-page lg:order-1 lg:col-span-8">
              {/* Print-only header: the graphite hero doesn't print (DESIGN-SYSTEM §9). */}
              {/* A div, not <header>: the print stylesheet hides every header element. */}
              <div className="mb-8 hidden print:block">
                <h1 className="text-2xl font-semibold">{cv.name}</h1>
                <p>
                  {[cv.headline, cv.location, cv.email, ...cv.links.map((l) => l.url)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <CvBody cv={cv} />
            </article>
          )}
        </Container>
      </section>
    </>
  );
}
