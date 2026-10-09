// components/guide/console/AnswerCards.tsx
// Live answer cards (docs/AI-GUIDE-PHASE1-PLAN.md §7): drawn only from the
// card tools' results, which the server read from the public views — never
// from the model's words. Desktop lays them in a grid; a phone swipes through
// them in one row. Each card opens the real page.

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Activity, ArrowLeftRight, ArrowUpRight, Check, CircleDashed, CircleDot, GitCommitHorizontal, ListChecks, Lock, Milestone, ShieldCheck } from "lucide-react";
import { techMark } from "@/components/shared/TechChip";
import type { CompareCardData, JourneyCardData, PulseCardData, SkillCardData, SystemCardData } from "@/lib/guide/show-tools";
import type { FitCardData, FitStatus } from "@/lib/guide/fit";
import { cn } from "@/lib/utils";

const ago = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return days < 1 ? "today" : days < 30 ? rtf.format(-days, "day") : days < 365 ? rtf.format(-Math.round(days / 30), "month") : rtf.format(-Math.round(days / 365), "year");
};

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-2.5 max-sm:-mx-1 max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-1 max-sm:pb-1 max-sm:[scrollbar-width:none] sm:grid sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

function Appear({ i, children }: { i: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="max-sm:w-[82%] max-sm:shrink-0 max-sm:snap-start"
      initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

const card = "group/card hover:border-ember/40 relative flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 transition-colors";

export function SystemCards({ systems }: { systems: SystemCardData[] }) {
  if (systems.length === 0) return null;
  return (
    <Shell>
      {systems.map((s, i) => (
        <Appear key={s.slug} i={i}>
          <Link href={s.href} className={card}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(--color-${s.statusColorToken}-on-dark, var(--color-${s.statusColorToken}))` }} />
              <span className="text-mist text-[11px]">{s.status}</span>
              {s.repoPrivate && (
                <span className="text-line ml-auto inline-flex items-center gap-1 text-[10.5px]">
                  <Lock aria-hidden="true" className="size-3" /> Private
                </span>
              )}
            </span>
            <span className="text-paper flex items-start gap-1.5 text-[15px] leading-snug font-semibold">
              <span className="min-w-0 flex-1">{s.name}</span>
              <ArrowUpRight aria-hidden="true" className="text-line group-hover/card:text-ember mt-0.5 size-4 shrink-0 transition-colors" />
            </span>
            <span className="text-mist line-clamp-2 text-[12.5px] leading-relaxed">{s.description}</span>
            {s.tech.length > 0 && (
              <span className="mt-auto flex flex-wrap gap-1 pt-1">
                {s.tech.map((t) => (
                  <span key={t} className="text-mist inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10.5px]">
                    {techMark(t)}
                    {t}
                  </span>
                ))}
              </span>
            )}
            <span className="text-line flex items-center gap-1 text-[10.5px]">
              {s.lastActivity ? (
                <>
                  <GitCommitHorizontal aria-hidden="true" className="size-3" /> Pushed {ago(s.lastActivity)}
                </>
              ) : (
                s.organization
              )}
            </span>
          </Link>
        </Appear>
      ))}
    </Shell>
  );
}

export function JourneyCard({ journey }: { journey: JourneyCardData }) {
  return (
    <Appear i={0}>
      <div className={cn(card, "hover:border-white/10")}>
        <span className="text-mist inline-flex items-center gap-1.5 text-[11px]">
          <Milestone aria-hidden="true" className="text-ember size-3.5" /> Journey · {journey.from === journey.to ? journey.from : `${journey.from}–${journey.to}`}
        </span>
        <ol className="relative mt-1 space-y-2.5 border-l border-white/12 pl-4">
          {journey.moments.map((m) => (
            <li key={m.id} className="relative">
              <span aria-hidden="true" className={cn("absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-night", m.ahead ? "bg-line" : "bg-ember")} />
              <span className="type-data text-line block text-[10.5px]">
                {m.when} · {m.label}
                {m.ahead && " · ahead"}
              </span>
              {m.href ? (
                <Link href={m.href} className="text-paper hover:text-ember text-[13px] leading-snug transition-colors">
                  {m.title}
                </Link>
              ) : (
                <span className="text-paper text-[13px] leading-snug">{m.title}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Appear>
  );
}

export function SkillCards({ skills }: { skills: SkillCardData[] }) {
  if (skills.length === 0) return null;
  return (
    <Shell>
      {skills.map((k, i) => (
        <Appear key={k.name} i={i}>
          <div className={cn(card, "hover:border-white/10")}>
            <span className="text-paper inline-flex items-center gap-2 text-[14px] font-semibold">
              {techMark(k.name)}
              {k.name}
            </span>
            <span className="text-line text-[11px]">
              {k.systems.length === 0 ? "Not in a published system yet" : `Proven in ${k.systems.length} ${k.systems.length === 1 ? "system" : "systems"}`}
            </span>
            {k.systems.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {k.systems.slice(0, 5).map((s) => (
                  <Link key={s.slug} href={`/systems/${s.slug}`} className="text-mist hover:text-paper hover:border-ember/40 rounded-full border border-white/10 px-2 py-0.5 text-[11px] transition-colors">
                    {s.name}
                  </Link>
                ))}
              </span>
            )}
          </div>
        </Appear>
      ))}
    </Shell>
  );
}

export function PulseCard({ pulse }: { pulse: PulseCardData }) {
  const stats = [
    { icon: ShieldCheck, value: pulse.rulesEnforcedByDatabase, label: "rules enforced by the database" },
    { icon: Activity, value: pulse.auditEventsLast7Days, label: "audited changes this week" },
  ];
  return (
    <Appear i={0}>
      <div className={cn(card, "hover:border-white/10")}>
        <span className="text-mist inline-flex items-center gap-1.5 text-[11px]">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)] opacity-60 motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
          </span>
          This site, right now
        </span>
        <span className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, value, label }) => (
            <span key={label}>
              <span className="type-data text-paper flex items-center gap-1.5 text-xl font-semibold">
                <Icon aria-hidden="true" className="text-ember size-4" />
                {value.toLocaleString("en")}
              </span>
              <span className="text-line block text-[11px] leading-snug">{label}</span>
            </span>
          ))}
        </span>
        {pulse.lastGithubSyncAt && <span className="text-line text-[10.5px]">GitHub synced {ago(pulse.lastGithubSyncAt)} · {pulse.auditEventsTotal.toLocaleString("en")} audited changes in all</span>}
      </div>
    </Appear>
  );
}

/** Two systems side by side: what each is, and exactly what they share. Everything from the public view. */
export function CompareCard({ compare }: { compare: CompareCardData }) {
  const sides = [compare.left, compare.right];
  return (
    <Appear i={0}>
      <div className={cn(card, "hover:border-white/10")}>
        <span className="text-mist inline-flex items-center gap-1.5 text-[11px]">
          <ArrowLeftRight aria-hidden="true" className="text-ember size-3.5" /> Compared
        </span>
        <span className="grid grid-cols-2 gap-3">
          {sides.map((s) => (
            <Link key={s.slug} href={s.href} className="group/side min-w-0">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(--color-${s.statusColorToken}-on-dark, var(--color-${s.statusColorToken}))` }} />
                <span className="text-mist text-[11px]">{s.status}</span>
                {s.repoPrivate && <Lock aria-label="Private repository" className="text-line ml-auto size-3" />}
              </span>
              <span className="text-paper group-hover/side:text-ember mt-1 block text-[14px] leading-snug font-semibold transition-colors">{s.name}</span>
              <span className="text-line mt-0.5 block text-[11px]">{s.lastActivity ? `Pushed ${ago(s.lastActivity)}` : s.organization}</span>
            </Link>
          ))}
        </span>
        <dl className="space-y-1.5 border-t border-white/[0.07] pt-2.5 text-[12px]">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <dt className="text-line shrink-0">Both use</dt>
            <dd className="flex flex-wrap gap-1">
              {compare.shared.length === 0 ? <span className="text-mist">nothing in common in their stacks</span> : compare.shared.map((t) => <TechPill key={t} tech={t} />)}
            </dd>
          </div>
          {[
            { who: compare.left.name, tech: compare.onlyLeft },
            { who: compare.right.name, tech: compare.onlyRight },
          ].map(({ who, tech }) =>
            tech.length > 0 ? (
              <div key={who} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <dt className="text-line shrink-0">Only {who}</dt>
                <dd className="flex flex-wrap gap-1">
                  {tech.slice(0, 8).map((t) => (
                    <TechPill key={t} tech={t} />
                  ))}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
    </Appear>
  );
}

function TechPill({ tech }: { tech: string }) {
  return (
    <span className="text-mist inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10.5px]">
      {techMark(tech)}
      {tech}
    </span>
  );
}

const FIT: Record<FitStatus, { icon: typeof Check; label: string; tone: string }> = {
  evidenced: { icon: Check, label: "Evidenced", tone: "text-[var(--color-signal-finished-on-dark)]" },
  partial: { icon: CircleDot, label: "Partly", tone: "text-ember" },
  none: { icon: CircleDashed, label: "Not evidenced yet", tone: "text-line" },
};

/** A visitor's needs against the evidence on the site — never a score, always the reason and the proof. */
export function FitCard({ fit }: { fit: FitCardData }) {
  if (fit.rows.length === 0) return null;
  return (
    <Appear i={0}>
      <div className={cn(card, "hover:border-white/10")}>
        <span className="text-mist flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks aria-hidden="true" className="text-ember size-3.5" /> Fit check
          </span>
          <span>
            {fit.evidenced} evidenced{fit.partial > 0 && ` · ${fit.partial} partly`}
            {fit.none > 0 && ` · ${fit.none} not yet`}
          </span>
        </span>
        <ul className="space-y-2.5">
          {fit.rows.map((r) => {
            const { icon: Icon, label, tone } = FIT[r.status];
            return (
              <li key={r.requirement} className="flex gap-2.5">
                <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", tone)} />
                <span className="min-w-0 flex-1">
                  <span className="text-paper block text-[13px] leading-snug">
                    {r.requirement} <span className={cn("ml-1 text-[10.5px]", tone)}>{label}</span>
                  </span>
                  {r.evidence.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {r.evidence.map((e) => (
                        <Link key={`${e.href}-${e.label}`} href={e.href} className="text-mist hover:text-paper hover:border-ember/40 rounded-full border border-white/10 px-2 py-0.5 text-[11px] transition-colors">
                          {e.label}
                        </Link>
                      ))}
                    </span>
                  )}
                  {r.note && <span className="text-line mt-1 block text-[11px] leading-snug">{r.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <span className="text-line text-[10.5px] leading-snug">Matched in code against what this site publishes — no score, and nothing counted that a visitor can&apos;t open.</span>
      </div>
    </Appear>
  );
}
